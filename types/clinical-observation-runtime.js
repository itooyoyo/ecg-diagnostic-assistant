export const notAssessed=()=>({status:"not_assessed"});
export const unknownObservation=reason=>reason?{status:"unknown",reason}:{status:"unknown"};
export const presentObservation=(value,source="physician")=>({status:"present",value,source});
export const absentObservation=()=>({status:"absent",source:"physician"});
