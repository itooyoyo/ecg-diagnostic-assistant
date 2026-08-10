export type NoPriorityDisplay={title:string;summary:string;enteredFindings:string[];unassessedItems:string[];additionalInformation:string[]};
export function buildNoPriorityDisplay(input:{candidateCount:number;criticalCount:number;enteredFindings:string[];unassessedItems:string[]}):NoPriorityDisplay|null;
