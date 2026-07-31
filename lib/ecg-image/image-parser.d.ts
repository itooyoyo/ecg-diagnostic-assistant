export const ACCEPTED_ECG_TYPES: readonly string[];
export function validateEcgFile(file:Pick<File,"type"|"size">): {valid:boolean;error:string|null};
