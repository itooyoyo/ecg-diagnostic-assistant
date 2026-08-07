import {createDefaultIntegratedInput} from "../../../data/integration/defaults.js";
import {buildIntegratedInterpretation} from "../../../logic/integration/build-integrated-interpretation.js";
import {contiguousLeadGroups} from "../../../data/st-interpretation/criteria.js";
import {evaluatePocStageGates} from "../../../data/local-image-analysis/poc-stage-gates.js";
import {detectGrid,detectSupportedLayout,enhanceContrast,estimatePaperQuad,extractPolyline,rectifyQuad,segmentStandard3x4,segmentStandard3x4WithLongII,segmentStandard6x2,toGrayscale} from "../../ecg-digitizer/digitizer-core.js";
import {evaluateLocalImageQuality} from "../../ecg-digitizer/phase-b.js";

const standardLeads=new Set(["I","II","III","aVR","aVL","aVF","V1","V2","V3","V4","V5","V6"]);

export async function analyzeLocalEcgPoc(file,{signal,onStatus,layoutType="auto"}={}){
 const started=performance.now();status(onStatus,"validating_image");abort(signal);const bitmap=await createImageBitmap(file,{imageOrientation:"from-image"});
 try{
  const scale=Math.min(1,1800/Math.max(bitmap.width,bitmap.height)),width=Math.max(1,Math.round(bitmap.width*scale)),height=Math.max(1,Math.round(bitmap.height*scale));
  const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;const context=canvas.getContext("2d",{willReadFrequently:true});if(!context)throw new Error("画像処理Canvasを初期化できませんでした。");
  context.fillStyle="#fff";context.fillRect(0,0,width,height);context.drawImage(bitmap,0,0,width,height);abort(signal);
  const gray=enhanceContrast(toGrayscale(context.getImageData(0,0,width,height))),imageQuality=evaluateLocalImageQuality(gray),grid=detectGrid(gray),paper=estimatePaperQuad(gray),automaticLayout=detectSupportedLayout(gray),selectedLayout=layoutType==="auto"?automaticLayout.layoutType:layoutType;
  const mainBottomRatio=selectedLayout==="three_by_four_with_long_ii"?automaticLayout.mainBottomRatio:null,gates=evaluatePocStageGates({width,height,layoutType:selectedLayout,gridDetected:Boolean(grid.detected&&grid.xPeriod&&grid.yPeriod),imageQualityAdequate:imageQuality.level==="adequate"});
  if(!gates.layout)throw unsupported("レイアウトを確定できません。3×4または6×2を選択してください。");status(onStatus,"detecting_layout");abort(signal);
  const previewRegions=regionsFor(selectedLayout,width,height,mainBottomRatio);if(!gates.segmentation)throw unsupported("12誘導領域を安全に分割できる解像度がありません。");if(!gates.polyline)throw unsupported(`12誘導領域${previewRegions.length}件を生成しましたが、Polyline抽出条件を満たしません。`);if(paper.status!=="candidate"||!paper.corners)throw unsupported("用紙領域を確定できません。");
  const corrected=rectifyQuad(gray,paper.corners),regions=regionsFor(selectedLayout,corrected.width,corrected.height,mainBottomRatio);if(regions.length!==12)throw unsupported("主要12誘導領域を生成できませんでした。");
  status(onStatus,"extracting_waveforms");await yieldFrame();abort(signal);
  const leads=regions.map(region=>digitizeLead(corrected,region.lead,region.bounds)).filter(x=>standardLeads.has(x.lead));if(leads.filter(x=>x.quality!=="inadequate").length<10)throw unsupported("安定して抽出できない誘導が多いため解析を停止しました。");
  const longII=selectedLayout==="three_by_four_with_long_ii"?extractLongII(corrected,mainBottomRatio):null;
  status(onStatus,"measuring");await yieldFrame();abort(signal);const measurements=measure(leads,grid,imageQuality.level,{heartRate:gates.heartRate,qrs:gates.qrs,st:gates.st},longII);
  status(onStatus,"evaluating_rules");await yieldFrame();abort(signal);const adapted=localPocToRuleContext(measurements);
  return {imageQuality:imageQuality.level==="adequate"?"adequate":"limited",layout:selectedLayout,leads,longII,measurements,context:adapted.context,ruleResult:buildIntegratedInterpretation(adapted.context),extractedFields:adapted.extractedFields,indeterminateFields:adapted.indeterminateFields,limitations:[...new Set([...measurements.limitations,...adapted.limitations])],processingTimeMs:Math.round(performance.now()-started)};
 }finally{bitmap.close()}
}

function regionsFor(layout,width,height,mainBottomRatio){return layout==="six_by_two"?segmentStandard6x2(width,height):layout==="three_by_four_with_long_ii"?segmentStandard3x4WithLongII(width,height,mainBottomRatio):layout==="three_by_four"?segmentStandard3x4(width,height):[]}
function digitizeLead(gray,lead,bounds){const trace=extractPolyline(gray,bounds,{threshold:115,minPointDistance:1}),coverage=trace.points.length/Math.max(1,bounds.width);return {lead,points:trace.points,quality:trace.status!=="extracted"?"inadequate":coverage<.55?"limited":"adequate",limitations:trace.limitations}}
function extractLongII(gray,ratio){if(!Number.isFinite(ratio))return null;const top=Math.round(gray.height*(ratio+.015)),bounds={x:gray.width*.04,y:top,width:gray.width*.92,height:gray.height-top-gray.height*.025};return digitizeLead(gray,"II",bounds)}

export function recalculateLocalPocRules(correction,imageQuality="adequate"){
 const measurements={heartRateBpm:correction.heartRateBpm,heartRateSource:"indeterminate",rrIntervals:[],rhythmRegularity:correction.rhythmRegularity,rhythmSource:"indeterminate",peakCandidates:[],estimatedQrsDurationMs:null,qrsWidthCandidate:correction.qrsWidthCandidate,qrsAudit:emptyQrsAudit(null,"医師修正"),stDirections:correction.stDirections,quality:imageQuality,limitations:[]};
 const adapted=localPocToRuleContext(measurements,correction.source);return {...adapted,ruleResult:buildIntegratedInterpretation(adapted.context)};
}

export function localPocToRuleContext(measurements,source="local_image_poc"){
 const context=createDefaultIntegratedInput(),extractedFields=[],indeterminateFields=[],limitations=[source==="local_image_poc"?"画像から端末内で推定した暫定所見です。":"医師修正所見でルールだけを再計算しました。"];
 context.confirmedModules=[source];context.quality.imageAdequate=measurements.quality!=="inadequate";context.quality.allLeads=measurements.stDirections.length===12;context.quality.leadLabels=false;context.quality.speedVisible=false;context.quality.gainVisible=false;context.quality.jPointClear=false;context.quality.pWaveClear=false;context.quality.tEndClear=false;
 if(measurements.heartRateBpm!=null){extractedFields.push("heartRateBpm");context.ecg.bradycardia=measurements.heartRateBpm<50;context.ecg.veryRapidRate=measurements.heartRateBpm>=150}else indeterminateFields.push("heartRateBpm");
 if(measurements.rhythmRegularity!=="indeterminate"){extractedFields.push("rhythmRegularity");context.ecg.irregularTachycardia=measurements.rhythmRegularity==="irregularly_irregular"&&Boolean(measurements.heartRateBpm&&measurements.heartRateBpm>=100)}else indeterminateFields.push("rhythmRegularity");
 if(measurements.qrsWidthCandidate!=="indeterminate"){extractedFields.push("qrsWidthCandidate");context.ecg.wideQrs=measurements.qrsWidthCandidate==="wide";context.ecg.qrsProlonged=context.ecg.wideQrs}else indeterminateFields.push("qrsWidthCandidate");
 const known=measurements.stDirections.filter(x=>x.direction!=="indeterminate"&&x.quality==="adequate");
 if(known.length){extractedFields.push("stDirections");const is=(lead,direction)=>known.some(x=>x.lead===lead&&x.direction===direction);context.ecg.inferiorStElevation=["II","III","aVF"].filter(x=>is(x,"elevation")).length>=2;context.ecg.contiguousStElevation=contiguousElevation(known);context.ecg.stDepressionV1toV3=["V1","V2","V3"].some(x=>is(x,"depression"));context.ecg.diffuseStDepression=known.filter(x=>x.direction==="depression").length>=6;context.ecg.avrElevation=is("aVR","elevation");context.ecg.v1Elevation=is("V1","elevation");context.ecg.reciprocalChange=reciprocal(known)}else indeterminateFields.push("stDirections");
 limitations.push("誘導名は標準配置テンプレートから割り当てています。","STは方向候補のみで、J点・振幅mm・診断閾値を確定していません。","未抽出項目は正常値で補完しません。");return {context,extractedFields,indeterminateFields,limitations};
}

function measure(leads,grid,quality,gates,longII=null){
 const reference=longII?.quality==="adequate"?longII:leads.find(x=>x.lead==="II"&&x.quality!=="inadequate")??leads.find(x=>x.quality!=="inadequate"),source=!reference?"indeterminate":reference===longII?"long_ii":reference.lead==="II"?"lead_ii":"other";
 const peakCandidates=reference&&gates.heartRate?detectPeaks(reference.points,grid):[],accepted=peakCandidates.filter(x=>x.accepted),rrPx=accepted.slice(1).map((peak,index)=>peak.x-accepted[index].x),rawRr=rrPx.map(px=>Math.round(px/Math.max(1,grid.xPeriod)*40)),rrMedian=median(rawRr),outliers=rrMedian?rawRr.filter(value=>Math.abs(value-rrMedian)/rrMedian>.35).length:rawRr.length,refractoryViolations=peakCandidates.filter(x=>x.rejectionReason==="refractory_period").length;
 const rateReliable=Boolean(gates.heartRate&&reference?.quality==="adequate"&&rawRr.length>=2&&rrMedian>=200&&rrMedian<=2000&&outliers/Math.max(1,rawRr.length)<=.34&&refractoryViolations<=accepted.length),rrIntervals=rateReliable?rawRr:[],heartRateBpm=rateReliable?Math.round(60000/rrMedian):null,cv=coefficientOfVariation(rrIntervals),rhythmReliable=rateReliable&&rrIntervals.length>=3,rhythmRegularity=!rhythmReliable?"indeterminate":cv<.08?"regular":cv<.18?"regularly_irregular":"irregularly_irregular";
 const qrs=gates.qrs&&reference?estimateQrs(reference,accepted,grid):emptyQrsAudit(reference?.lead??null,"QRS resolution gate not met"),estimatedQrsDurationMs=qrs.quality==="adequate"?qrs.medianDurationMs:null,qrsWidthCandidate=estimatedQrsDurationMs==null||Math.abs(estimatedQrsDurationMs-120)<12?"indeterminate":estimatedQrsDurationMs>=120?"wide":"narrow",stDirections=leads.map(lead=>gates.st?estimateSt(lead,grid):indeterminateSt(lead,"ST resolution gate not met")),limitations=[];
 if(!rateReliable)limitations.push("R波検出の信頼性不足");if(qrsWidthCandidate==="indeterminate")limitations.push("QRS幅を安全に分類できません");if(stDirections.some(x=>x.direction==="indeterminate"))limitations.push("ST方向を判定できない誘導があります");
 return {heartRateBpm,heartRateSource:rateReliable?source:"indeterminate",rrIntervals,rhythmRegularity,rhythmSource:rhythmReliable?source:"indeterminate",peakCandidates,estimatedQrsDurationMs,qrsWidthCandidate,qrsAudit:qrs,stDirections,quality:quality==="adequate"?"adequate":"limited",limitations};
}

function detectPeaks(points,grid){
 if(points.length<30)return[];const baseline=median(points.map(x=>x.y)),values=points.map(x=>Math.abs(x.y-baseline)),window=Math.max(3,Math.round(grid.xPeriod*1.5)),threshold=Math.max(grid.yPeriod*.9,percentile(values,.90)),raw=[];
 for(let index=window;index<points.length-window;index+=1){const amplitude=values[index];if(amplitude<threshold)continue;const neighborhood=values.slice(index-window,index+window+1);if(amplitude!==Math.max(...neighborhood))continue;const shoulderWidth=Math.max(1,Math.round(window/3)),shoulders=median([...values.slice(index-window,index-shoulderWidth),...values.slice(index+shoulderWidth,index+window+1)]),prominence=amplitude-(shoulders??0);if(prominence<threshold*.35)continue;raw.push({x:points[index].x,prominence,amplitude,precedingRrPx:null,accepted:true,rejectionReason:null})}
 const refractoryPx=Math.max(5,Math.round(grid.xPeriod*5));let last=null;for(const candidate of raw){candidate.precedingRrPx=last==null?null:candidate.x-last;if(last!=null&&candidate.x-last<refractoryPx){candidate.accepted=false;candidate.rejectionReason="refractory_period"}else last=candidate.x}return raw;
}

function estimateQrs(reference,peaks,grid){
 const beats=[];for(const peak of peaks){const near=reference.points.filter(point=>Math.abs(point.x-peak.x)<=grid.xPeriod*4);if(near.length<8)continue;const baselinePoints=near.filter(point=>point.x<=peak.x-grid.xPeriod*1.5),baseline=median(baselinePoints.map(point=>point.y));if(baseline==null)continue;const peakPoint=near.reduce((best,point)=>Math.abs(point.x-peak.x)<Math.abs(best.x-peak.x)?point:best,near[0]),amplitude=Math.abs(peakPoint.y-baseline),threshold=Math.max(grid.yPeriod*.22,amplitude*.18),active=near.filter(point=>Math.abs(point.y-baseline)>=threshold),onset=active.find(point=>point.x<=peak.x),offset=[...active].reverse().find(point=>point.x>=peak.x);if(!onset||!offset)continue;beats.push({peakX:peak.x,onsetX:onset.x,offsetX:offset.x,durationMs:Math.round((offset.x-onset.x)/Math.max(1,grid.xPeriod)*40)})}
 const plausible=beats.filter(beat=>beat.durationMs>=30&&beat.durationMs<=240),durations=plausible.map(beat=>beat.durationMs),medianDurationMs=median(durations),adequate=durations.length>=3&&coefficientOfVariation(durations)<=.35;return {measurementLead:reference.lead,beatCount:durations.length,beats,medianDurationMs:adequate?Math.round(medianDurationMs):null,quality:adequate?"adequate":"limited",limitations:adequate?[]:["QRS onset/offset候補の一貫性不足"]};
}
function emptyQrsAudit(lead,reason){return {measurementLead:lead,beatCount:0,beats:[],medianDurationMs:null,quality:"limited",limitations:[reason]}}

function estimateSt(lead,grid){
 if(lead.quality!=="adequate"||lead.points.length<40)return indeterminateSt(lead,"波形抽出品質不足");const peaks=detectPeaks(lead.points,grid).filter(x=>x.accepted);if(peaks.length<2)return indeterminateSt(lead,"R波候補不足");const samples=[];
 for(const peak of peaks){const pre=lead.points.filter(point=>point.x>=peak.x-grid.xPeriod*4&&point.x<=peak.x-grid.xPeriod*2),baselineY=median(pre.map(point=>point.y));if(baselineY==null)continue;const post=lead.points.filter(point=>point.x>=peak.x&&point.x<=peak.x+grid.xPeriod*4),j=post.find(point=>Math.abs(point.y-baselineY)<=Math.max(1,grid.yPeriod*.35));if(!j)continue;const targetX=j.x+grid.xPeriod*1.5,sample=lead.points.reduce((best,point)=>Math.abs(point.x-targetX)<Math.abs(best.x-targetX)?point:best,lead.points[0]);if(Math.abs(sample.x-targetX)>grid.xPeriod)continue;samples.push({baselineCandidate:{startX:pre[0]?.x??peak.x,endX:pre.at(-1)?.x??peak.x},jPointCandidate:{x:j.x,y:j.y},samplePointCandidate:{x:sample.x,y:sample.y},baselineY,stY:sample.y,differencePx:sample.y-baselineY})}
 if(samples.length<2)return indeterminateSt(lead,"baselineまたはJ点候補の信頼性不足");const differences=samples.map(x=>x.differencePx),differencePx=median(differences);if(coefficientOfVariation(differences.map(Math.abs))>.75)return indeterminateSt(lead,"ST候補のbeat間一貫性不足");const tolerance=Math.max(1,grid.yPeriod*.3),direction=differencePx<-tolerance?"elevation":differencePx>tolerance?"depression":"isoelectric",audit=samples[Math.floor(samples.length/2)];return {lead:lead.lead,direction,quality:"adequate",...audit,differencePx,limitations:[...lead.limitations,"J点・mmは確定計測ではありません"]};
}
function indeterminateSt(lead,reason){return {lead:lead.lead,direction:"indeterminate",quality:lead.quality==="inadequate"?"inadequate":"limited",baselineCandidate:null,jPointCandidate:null,samplePointCandidate:null,baselineY:null,stY:null,differencePx:null,limitations:[...lead.limitations,reason]}}
function contiguousElevation(values){return Object.values(contiguousLeadGroups).some(group=>group.filter(lead=>values.some(x=>x.lead===lead&&x.direction==="elevation"&&x.quality==="adequate")).length>=2)}
function reciprocal(values){const elev=new Set(values.filter(x=>x.direction==="elevation").map(x=>x.lead)),dep=new Set(values.filter(x=>x.direction==="depression").map(x=>x.lead));return (["II","III","aVF"].some(x=>elev.has(x))&&["I","aVL"].some(x=>dep.has(x)))||(["V1","V2","V3","V4"].some(x=>elev.has(x))&&["II","III","aVF"].some(x=>dep.has(x)))}
function coefficientOfVariation(values){if(values.length<2)return Infinity;const mean=values.reduce((a,b)=>a+b,0)/values.length,sd=Math.sqrt(values.reduce((sum,x)=>sum+(x-mean)**2,0)/values.length);return sd/Math.max(1,mean)}
function median(values){if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2}
function percentile(values,p){if(!values.length)return 0;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]}
function status(callback,value){callback?.(value)}function abort(signal){if(signal?.aborted)throw new DOMException("Aborted","AbortError")}function yieldFrame(){return new Promise(resolve=>requestAnimationFrame(()=>resolve()))}function unsupported(message){const error=new Error(message);error.name="UnsupportedImageError";return error}

export {measure as measureLocalPocLeads};
export {detectPeaks as detectRPeakCandidates};
