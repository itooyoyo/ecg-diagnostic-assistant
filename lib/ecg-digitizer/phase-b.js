import {detectGrid,estimatePaperQuad,estimateSkew} from "./digitizer-core.js";
import {LOCAL_IMAGE_QUALITY_THRESHOLDS as defaults} from "../../data/local-image-analysis/quality-thresholds.js";

export function evaluateLocalImageQuality(gray,thresholds=defaults){
  const count=gray.data.length;if(!count)return emptyQuality(gray);
  let sum=0,sum2=0,white=0,black=0,lapSum=0,lap2=0,lapCount=0,edgeDark=0,edgeCount=0;
  for(const value of gray.data){sum+=value;sum2+=value*value;if(value>=250)white++;if(value<=5)black++}
  for(let y=1;y<gray.height-1;y+=2)for(let x=1;x<gray.width-1;x+=2){const i=y*gray.width+x,lap=4*gray.data[i]-gray.data[i-1]-gray.data[i+1]-gray.data[i-gray.width]-gray.data[i+gray.width];lapSum+=lap;lap2+=lap*lap;lapCount++}
  const border=Math.max(2,Math.round(Math.min(gray.width,gray.height)*.02));
  for(let y=0;y<gray.height;y+=2)for(let x=0;x<gray.width;x+=2)if(x<border||x>=gray.width-border||y<border||y>=gray.height-border){edgeCount++;if(gray.data[y*gray.width+x]<100)edgeDark++}
  const mean=sum/count,contrast=Math.sqrt(Math.max(0,sum2/count-mean*mean)),lapMean=lapCount?lapSum/lapCount:0,blur=Math.sqrt(Math.max(0,lap2/Math.max(1,lapCount)-lapMean*lapMean));
  const whiteRatio=white/count,blackRatio=black/count,edgeRatio=edgeDark/Math.max(1,edgeCount),glare=glareCandidate(gray,thresholds);
  const skew=estimateSkew(gray),quad=estimatePaperQuad(gray),perspective=perspectiveRatio(quad.corners);
  const grid=detectGrid(gray),issues=[];
  if(gray.width<thresholds.minimumWidthPx||gray.height<thresholds.minimumHeightPx)issues.push(issue("low_resolution","severe","画像の解像度が著しく不足しています"));
  if(contrast<thresholds.minimumContrastStdDev)issues.push(issue("low_contrast","moderate","波形と背景のコントラストが不足しています"));
  if(blur<thresholds.minimumLaplacianStdDev)issues.push(issue("blur","moderate","ぼけの可能性があります"));
  if(whiteRatio>thresholds.maximumWhiteClipRatio)issues.push(issue("overexposure","severe","白飛びが広い範囲にあります"));
  if(blackRatio>thresholds.maximumBlackClipRatio)issues.push(issue("underexposure","severe","黒つぶれが広い範囲にあります"));
  if(glare.ratio>thresholds.maximumGlareTileRatio)issues.push({...issue("glare","moderate","局所的な反射・ハイライト候補があります"),affectedRegion:glare.region});
  if(edgeRatio>thresholds.maximumDarkEdgeRatio)issues.push(issue("cropped_edges","moderate","画像端で波形または用紙が切れている可能性があります"));
  if(Math.abs(skew.angleDegrees)>thresholds.excessiveRotationDegrees)issues.push(issue("excessive_rotation","moderate",`約${Math.abs(skew.angleDegrees).toFixed(1)}度の傾き候補があります`));
  if(perspective!=null&&perspective>thresholds.perspectiveWidthDifferenceRatio)issues.push(issue("perspective_distortion","moderate","用紙輪郭に台形歪み候補があります"));
  if(!grid.detected)issues.push(issue("grid_not_detected","severe","グリッド候補を検出できません"));
  if(quad.status!=="candidate")issues.push(issue("cropped_edges","severe","心電図用紙領域を推定できません"));
  const severe=issues.some(x=>x.severity==="severe"),level=severe?"inadequate":issues.length?"limited":"adequate";
  return {level,width:gray.width,height:gray.height,aspectRatio:gray.width/gray.height,issues,metrics:{brightnessMean:mean,contrastEstimate:contrast,blurEstimate:blur,clippedWhiteRatio:whiteRatio,clippedBlackRatio:blackRatio,estimatedRotationDeg:skew.angleDegrees},canProceedToLayoutDetection:!severe,suggestedActions:actions(issues)};
}

export function createPaperRegionCandidate(gray){const quad=estimatePaperQuad(gray);return quad.corners?{polygon:quad.corners,confidence:"medium",limitations:["明度差と輪郭から推定した候補です。医師確認前に補正へ使用しません。"]}:{polygon:[],confidence:"indeterminate",limitations:["心電図用紙領域を推定できません"]}}
export function createGridCandidate(gray){const grid=detectGrid(gray);return {detected:grid.detected,horizontalSpacingPx:grid.xPeriod,verticalSpacingPx:grid.yPeriod,confidence:grid.detected?grid.confidence:"indeterminate",limitations:grid.detected?["グリッド間隔候補です。1 mm、時間、電位への換算には使用しません。"]:["グリッド候補を検出できません"]}}

const leadRows3x4=[["I","aVR","V1","V4"],["II","aVL","V2","V5"],["III","aVF","V3","V6"]];
const leadRows6x2=[["I","V1"],["II","V2"],["III","V3"],["aVR","V4"],["aVL","V5"],["aVF","V6"]];
export function createLayoutCandidate(layoutType,bounds){
  if(layoutType==="unknown")return {layoutType,confidence:"indeterminate",expectedLeadOrder:[],detectedRegions:[],missingLeads:[],limitations:["対応レイアウトを確定できません。疑似的な誘導領域は作成しません。"],reviewStatus:"pending"};
  const longLead=layoutType==="twelve_lead_with_long_ii"?"II":layoutType==="twelve_lead_with_long_v1"?"V1":null;
  const rows=layoutType==="six_by_two"?leadRows6x2:leadRows3x4;
  const mainHeight=longLead?bounds.height*.78:bounds.height,regions=[];
  rows.forEach((row,rowIndex)=>row.forEach((lead,columnIndex)=>regions.push(regionFor(lead,bounds.x+columnIndex*bounds.width/row.length,bounds.y+rowIndex*mainHeight/rows.length,bounds.width/row.length,mainHeight/rows.length))));
  if(longLead)regions.push(regionFor("rhythm_strip",bounds.x,bounds.y+mainHeight,bounds.width,bounds.height-mainHeight,[`${longLead}長時間誘導の位置候補です。誘導名はOCRで読み取っていません。`]));
  return {layoutType,confidence:"low",expectedLeadOrder:regions.map(x=>x.lead),detectedRegions:regions,missingLeads:[],limitations:["選択レイアウトと位置関係から割り当てた候補です。誘導名をOCRで認識していません。"],reviewStatus:"pending"};
}
export function updateLeadRegion(regions,id,patch){return regions.map(region=>region.id===id?{...region,...patch,region:patch.region?clampRegion(patch.region):region.region}:region)}
export function buildConfirmedLeadLayout({layout,paperRegion,grid,imageQuality}){if(!layout||layout.layoutType==="unknown"||!paperRegion?.polygon?.length)return null;const leads=layout.detectedRegions.filter(x=>x.reviewStatus==="accepted"||x.reviewStatus==="modified").map(x=>({lead:x.lead,region:x.region}));if(!leads.length)return null;return {layoutType:layout.layoutType,paperRegion,grid:{detected:grid.detected,horizontalSpacingPx:grid.horizontalSpacingPx,verticalSpacingPx:grid.verticalSpacingPx},leads,imageQuality}}

function regionFor(lead,x,y,width,height,limitations=[]){return {id:`${lead}-${Math.round(x)}-${Math.round(y)}`,lead,region:{x,y,width,height},confidence:"low",reviewStatus:"pending",limitations}}
function clampRegion(region){return {x:Math.max(0,region.x),y:Math.max(0,region.y),width:Math.max(1,region.width),height:Math.max(1,region.height)}}
function issue(type,severity,explanationJa){return {type,severity,explanationJa}}
function actions(issues){const result=[];if(issues.some(x=>x.type==="glare"))result.push("反射を避けて再撮影してください");if(issues.some(x=>x.type==="cropped_edges"))result.push("心電図全体が入るよう撮影または切り抜き範囲を修正してください");if(issues.some(x=>x.type==="blur"||x.type==="low_resolution"))result.push("ピントを合わせて近距離から再撮影してください");if(issues.some(x=>x.type==="grid_not_detected"))result.push("グリッドが確認できる画像を使用してください");return [...new Set(result)]}
function emptyQuality(gray){return {level:"indeterminate",width:gray.width,height:gray.height,aspectRatio:0,issues:[issue("unknown","severe","画像データがありません")],metrics:{brightnessMean:null,contrastEstimate:null,blurEstimate:null,clippedWhiteRatio:null,clippedBlackRatio:null,estimatedRotationDeg:null},canProceedToLayoutDetection:false,suggestedActions:["画像を選択してください"]}}
function perspectiveRatio(corners){if(!corners)return null;const top=Math.hypot(corners[1].x-corners[0].x,corners[1].y-corners[0].y),bottom=Math.hypot(corners[2].x-corners[3].x,corners[2].y-corners[3].y);return Math.abs(top-bottom)/Math.max(1,Math.max(top,bottom))}
function glareCandidate(gray,tile=defaults){const size=Math.max(16,Math.floor(Math.min(gray.width,gray.height)/10));let bright=0,total=0,best=null;for(let y=0;y<gray.height;y+=size)for(let x=0;x<gray.width;x+=size){let sum=0,count=0;for(let yy=y;yy<Math.min(gray.height,y+size);yy+=2)for(let xx=x;xx<Math.min(gray.width,x+size);xx+=2){sum+=gray.data[yy*gray.width+xx];count++}const mean=sum/Math.max(1,count);total++;if(mean>=tile.glareTileMean){bright++;if(!best)best={x,y,width:Math.min(size,gray.width-x),height:Math.min(size,gray.height-y)}}}return {ratio:bright/Math.max(1,total),region:best??undefined}}
