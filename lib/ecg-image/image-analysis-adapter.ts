import type { ObjectiveFindings } from "@/types/ecg";
export interface EcgImageAnalysisAdapter { analyze(file:File):Promise<ObjectiveFindings>; }
export class MockEcgImageAnalysisAdapter implements EcgImageAnalysisAdapter {
  async analyze():Promise<ObjectiveFindings> {
    const leads = ["I","II","III","aVR","aVL","aVF","V1","V2","V3","V4","V5","V6"] as const;
    const measured=(value:number,unit:string)=>({value,unit,confidence:.86,unmeasurable:false});
    return { heartRate:measured(72,"bpm"),rhythm:"洞調律",regularity:"整",pWavePresent:true,pWaveMorphology:"明瞭",pQrsRelationship:"1:1",prInterval:measured(164,"ms"),qrsDuration:measured(92,"ms"),qtInterval:measured(388,"ms"),qtc:measured(425,"ms"),qtcFormula:"Bazett",axis:"正常軸",rWaveProgression:"保たれる",pathologicQWaves:"なし",stElevation:"明らかでない",stDepression:"明らかでない",tWaveAbnormality:"なし",uWave:"評価困難",ectopy:"なし",pacedRhythm:false,artifact:"軽微",leadPlacementConcern:"なし",confidence:.82,analysisLimitations:["Ver.0.1 モックデータ"],leadFindings:Object.fromEntries(leads.map(l=>[l,{}])) as ObjectiveFindings["leadFindings"] };
  }
}
