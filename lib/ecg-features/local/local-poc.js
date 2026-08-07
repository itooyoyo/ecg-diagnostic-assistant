import {createDefaultIntegratedInput} from "../../../data/integration/defaults.js";
import {buildIntegratedInterpretation} from "../../../logic/integration/build-integrated-interpretation.js";
import {detectGrid,detectSupportedLayout,enhanceContrast,estimatePaperQuad,extractPolyline,rectifyQuad,segmentStandard3x4,segmentStandard6x2,toGrayscale} from "../../ecg-digitizer/digitizer-core.js";
import {evaluateLocalImageQuality} from "../../ecg-digitizer/phase-b.js";
import {evaluatePocStageGates} from "../../../data/local-image-analysis/poc-stage-gates.js";

const standardLeads=new Set(["I","II","III","aVR","aVL","aVF","V1","V2","V3","V4","V5","V6"]);

export async function analyzeLocalEcgPoc(file,{signal,onStatus,layoutType="auto"}={}){
  const started=performance.now();
  status(onStatus,"validating_image");abort(signal);
  const bitmap=await createImageBitmap(file,{imageOrientation:"from-image"});
  try{
    const scale=Math.min(1,1800/Math.max(bitmap.width,bitmap.height));
    const width=Math.max(1,Math.round(bitmap.width*scale)),height=Math.max(1,Math.round(bitmap.height*scale));
    const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
    const context=canvas.getContext("2d",{willReadFrequently:true});if(!context)throw new Error("画像処理Canvasを初期化できませんでした。");
    context.fillStyle="#fff";context.fillRect(0,0,width,height);context.drawImage(bitmap,0,0,width,height);abort(signal);
    const gray=enhanceContrast(toGrayscale(context.getImageData(0,0,width,height)));
    const imageQuality=evaluateLocalImageQuality(gray),grid=detectGrid(gray),paper=estimatePaperQuad(gray);
    const automaticLayout=detectSupportedLayout(gray),selectedLayout=layoutType==="auto"?automaticLayout.layoutType:layoutType;
    const gates=evaluatePocStageGates({width,height,layoutType:selectedLayout,gridDetected:Boolean(grid.detected&&grid.xPeriod&&grid.yPeriod),imageQualityAdequate:imageQuality.level==="adequate"});
    if(!gates.layout)throw unsupported("心電図配置を確定できません。3行×4列または6行×2列を選択してください。");
    status(onStatus,"detecting_layout");abort(signal);
    const previewRegions=selectedLayout==="six_by_two"?segmentStandard6x2(width,height):segmentStandard3x4(width,height);
    if(!gates.segmentation)throw unsupported(`${selectedLayout==="six_by_two"?"6行×2列":"3行×4列"}として認識しましたが、12誘導領域を安全に分割できる解像度がありません。`);
    if(!gates.polyline)throw unsupported(`${selectedLayout==="six_by_two"?"6行×2列":"3行×4列"}として認識し、${previewRegions.length}誘導領域を生成しましたが、画像解像度が不足しているため波形の自動推定は行えません。`);
    if(paper.status!=="candidate"||!paper.corners)throw unsupported("用紙領域を確定できないため波形の自動推定は行えません。");
    const corrected=rectifyQuad(gray,paper.corners);
    const regions=selectedLayout==="six_by_two"?segmentStandard6x2(corrected.width,corrected.height):segmentStandard3x4(corrected.width,corrected.height);
    if(regions.length!==12)throw unsupported("主要12誘導の領域を作成できませんでした。");
    status(onStatus,"extracting_waveforms");await yieldFrame();abort(signal);
    const leads=regions.map(region=>{const trace=extractPolyline(corrected,region.bounds,{threshold:115,minPointDistance:1});const coverage=trace.points.length/Math.max(1,region.bounds.width);return {lead:region.lead,points:trace.points,quality:trace.status!=="extracted"?"inadequate":coverage<.55?"limited":"adequate",limitations:trace.limitations}}).filter(x=>standardLeads.has(x.lead));
    if(leads.filter(x=>x.quality!=="inadequate").length<10)throw unsupported("波形を安定して抽出できない誘導が多いため解析を停止しました。");
    status(onStatus,"measuring");await yieldFrame();abort(signal);
    const measurements=measure(leads,grid,imageQuality.level,{heartRate:gates.heartRate,qrs:gates.qrs,st:gates.st});
    status(onStatus,"evaluating_rules");await yieldFrame();abort(signal);
    const adapted=localPocToRuleContext(measurements);
    return {imageQuality:imageQuality.level==="adequate"?"adequate":"limited",layout:selectedLayout,leads,measurements,context:adapted.context,ruleResult:buildIntegratedInterpretation(adapted.context),extractedFields:adapted.extractedFields,indeterminateFields:adapted.indeterminateFields,limitations:[...new Set([...measurements.limitations,...adapted.limitations])],processingTimeMs:Math.round(performance.now()-started)};
  }finally{bitmap.close()}
}

export function recalculateLocalPocRules(correction,imageQuality="adequate"){
  const measurements={heartRateBpm:correction.heartRateBpm,rrIntervals:[],rhythmRegularity:correction.rhythmRegularity,estimatedQrsDurationMs:null,qrsWidthCandidate:correction.qrsWidthCandidate,stDirections:correction.stDirections,quality:imageQuality,limitations:[]};
  const adapted=localPocToRuleContext(measurements,correction.source);
  return {...adapted,ruleResult:buildIntegratedInterpretation(adapted.context)};
}

export function localPocToRuleContext(measurements,source="local_image_poc"){
  const context=createDefaultIntegratedInput(),extractedFields=[],indeterminateFields=[],limitations=[source==="local_image_poc"?"画像から端末内で推定した暫定所見です。":"医師修正所見でルールだけを再計算しました。"];context.confirmedModules=[source];
  context.quality.imageAdequate=measurements.quality!=="inadequate";context.quality.allLeads=measurements.stDirections.length===12;context.quality.leadLabels=false;context.quality.speedVisible=false;context.quality.gainVisible=false;context.quality.jPointClear=false;context.quality.pWaveClear=false;context.quality.tEndClear=false;
  if(measurements.heartRateBpm!=null){extractedFields.push("heartRateBpm");context.ecg.bradycardia=measurements.heartRateBpm<50;context.ecg.veryRapidRate=measurements.heartRateBpm>=150}else indeterminateFields.push("heartRateBpm");
  if(measurements.rhythmRegularity!=="indeterminate"){extractedFields.push("rhythmRegularity");context.ecg.irregularTachycardia=measurements.rhythmRegularity==="irregularly_irregular"&&Boolean(measurements.heartRateBpm&&measurements.heartRateBpm>=100)}else indeterminateFields.push("rhythmRegularity");
  if(measurements.qrsWidthCandidate!=="indeterminate"){extractedFields.push("qrsWidthCandidate");context.ecg.wideQrs=measurements.qrsWidthCandidate==="wide";context.ecg.qrsProlonged=context.ecg.wideQrs}else indeterminateFields.push("qrsWidthCandidate");
  const known=measurements.stDirections.filter(x=>x.direction!=="indeterminate");if(known.length){extractedFields.push("stDirections");const is=(lead,d)=>known.some(x=>x.lead===lead&&x.direction===d);context.ecg.inferiorStElevation=["II","III","aVF"].filter(x=>is(x,"elevation")).length>=2;context.ecg.contiguousStElevation=contiguousElevation(known);context.ecg.stDepressionV1toV3=["V1","V2","V3"].some(x=>is(x,"depression"));context.ecg.diffuseStDepression=known.filter(x=>x.direction==="depression").length>=6;context.ecg.avrElevation=is("aVR","elevation");context.ecg.v1Elevation=is("V1","elevation");context.ecg.reciprocalChange=reciprocal(known)}else indeterminateFields.push("stDirections");
  limitations.push("誘導名はOCRではなく標準3×4の位置テンプレートから割り当てています。","STは方向候補のみで、J点・振幅mm・診断閾値を測定していません。","未抽出項目はunknownのまま保持し、正常値を補完しません。");
  return {context,extractedFields,indeterminateFields,limitations};
}

function measure(leads,grid,quality,gates){const reference=leads.find(x=>x.lead==="II"&&x.quality!=="inadequate")??leads.find(x=>x.quality!=="inadequate");const peaks=reference?detectPeaks(reference.points,Math.max(4,grid.yPeriod)):[];const rrPx=peaks.slice(1).map((x,i)=>x-peaks[i]).filter(x=>x>0);const measuredRr=rrPx.map(px=>Math.round(px/Math.max(1,grid.xPeriod)*40));const rrIntervals=gates.heartRate?measuredRr:[];const medianRr=median(rrIntervals);const heartRateBpm=medianRr&&rrIntervals.length>=2?Math.round(60000/medianRr):null;const cv=coefficientOfVariation(rrIntervals);const rhythmRegularity=rrIntervals.length<3?"indeterminate":cv<.08?"regular":cv<.18?"regularly_irregular":"irregularly_irregular";const qrs=gates.qrs&&reference&&peaks.length?estimateQrs(reference.points,peaks,grid):null;const estimatedQrsDurationMs=qrs?.ms??null;const qrsWidthCandidate=estimatedQrsDurationMs==null?"indeterminate":Math.abs(estimatedQrsDurationMs-120)<12?"indeterminate":estimatedQrsDurationMs>=120?"wide":"narrow";const stDirections=leads.map(lead=>gates.st?estimateSt(lead,grid,qrs?.widthPx??null):{lead:lead.lead,direction:"indeterminate",quality:"limited",limitations:[...lead.limitations,"ST resolution gate not met"]});const limitations=[];if(!heartRateBpm)limitations.push("Rピーク数が不足し、心拍数とRR規則性を判定できません。");if(qrsWidthCandidate==="indeterminate")limitations.push("QRS幅候補を安全に分類できません。");if(stDirections.some(x=>x.direction==="indeterminate"))limitations.push("ST方向を判定できない誘導があります。");return {heartRateBpm,rrIntervals,rhythmRegularity,estimatedQrsDurationMs,qrsWidthCandidate,stDirections,quality:quality==="adequate"?"adequate":"limited",limitations}}
function detectPeaks(points,gridY){if(points.length<20)return[];const baseline=median(points.map(x=>x.y)),values=points.map(x=>Math.abs(x.y-baseline)),threshold=Math.max(gridY*.8,percentile(values,.88)),candidates=[];for(let i=1;i<points.length-1;i++)if(values[i]>=threshold&&values[i]>=values[i-1]&&values[i]>=values[i+1])candidates.push(points[i].x);const minGap=Math.max(8,Math.round((points.at(-1).x-points[0].x)/18));return candidates.filter((x,i)=>i===0||x-candidates[i-1]>=minGap)}
function estimateQrs(points,peaks,grid){const baseline=median(points.map(x=>x.y)),amplitude=Math.max(grid.yPeriod,percentile(points.map(x=>Math.abs(x.y-baseline)),.9)),threshold=amplitude*.28,widths=[];for(const peak of peaks){const near=points.filter(p=>Math.abs(p.x-peak)<=grid.xPeriod*5),active=near.filter(p=>Math.abs(p.y-baseline)>=threshold);if(active.length>1)widths.push(active.at(-1).x-active[0].x)}const widthPx=median(widths);return widthPx?{widthPx,ms:Math.round(widthPx/Math.max(1,grid.xPeriod)*40)}:null}
function estimateSt(lead,grid,qrsWidth){if(lead.quality==="inadequate"||lead.points.length<30)return {lead:lead.lead,direction:"indeterminate",quality:lead.quality,limitations:[...lead.limitations,"波形抽出不足"]};const baseline=median(lead.points.map(x=>x.y)),peaks=detectPeaks(lead.points,Math.max(4,grid.yPeriod));if(peaks.length<2)return {lead:lead.lead,direction:"indeterminate",quality:"limited",limitations:[...lead.limitations,"拍候補不足"]};const offsets=[];for(const peak of peaks){const x=peak+(qrsWidth??grid.xPeriod*2)+grid.xPeriod;const segment=lead.points.filter(p=>p.x>=x&&p.x<=x+grid.xPeriod*1.5);if(segment.length)offsets.push(median(segment.map(p=>p.y))-baseline)}if(!offsets.length)return {lead:lead.lead,direction:"indeterminate",quality:"limited",limitations:[...lead.limitations,"ST区間候補不足"]};const offset=median(offsets),tolerance=Math.max(1,grid.yPeriod*.3),direction=offset<-tolerance?"elevation":offset>tolerance?"depression":"isoelectric";return {lead:lead.lead,direction,quality:lead.quality,limitations:[...lead.limitations,"J点・mmは未計測"]}}
function contiguousElevation(values){const groups=[["V1","V2","V3","V4","V5","V6"],["II","III","aVF"],["I","aVL"]];return groups.some(group=>group.filter(lead=>values.some(x=>x.lead===lead&&x.direction==="elevation")).length>=2)}
function reciprocal(values){const elev=new Set(values.filter(x=>x.direction==="elevation").map(x=>x.lead)),dep=new Set(values.filter(x=>x.direction==="depression").map(x=>x.lead));return (["II","III","aVF"].some(x=>elev.has(x))&&["I","aVL"].some(x=>dep.has(x)))||(["V1","V2","V3","V4"].some(x=>elev.has(x))&&["II","III","aVF"].some(x=>dep.has(x)))}
function coefficientOfVariation(values){if(values.length<2)return Infinity;const mean=values.reduce((a,b)=>a+b,0)/values.length,sd=Math.sqrt(values.reduce((sum,x)=>sum+(x-mean)**2,0)/values.length);return sd/Math.max(1,mean)}
function median(values){if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b),m=Math.floor(sorted.length/2);return sorted.length%2?sorted[m]:(sorted[m-1]+sorted[m])/2}
function percentile(values,p){if(!values.length)return 0;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]}
function status(callback,value){callback?.(value)}function abort(signal){if(signal?.aborted)throw new DOMException("Aborted","AbortError")}function yieldFrame(){return new Promise(resolve=>requestAnimationFrame(()=>resolve()))}function unsupported(message){const error=new Error(message);error.name="UnsupportedImageError";return error}

export {measure as measureLocalPocLeads};
