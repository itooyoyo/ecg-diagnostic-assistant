export type ReviewFieldStatus="unreviewed"|"normal"|"abnormal"|"indeterminate";
export type ReviewStepState={status:ReviewFieldStatus;completed:boolean;values:Record<string,boolean|string|number|null>};
export type ReviewState={steps:Record<string,ReviewStepState>;urgentMode:boolean};
export const reviewStatuses:ReviewFieldStatus[];
export function createReviewState(stepIds:string[]):ReviewState;
export function reviewProgress(state:ReviewState):{completed:number;total:number;hasUnreviewed:boolean};
export function evaluateReviewNavigator(state:ReviewState):{suggestions:string[];suggestionsByStep:Record<string,string[]>;contradictions:{message:string;step:string}[];redFlags:string[];exclusions:string[]};
