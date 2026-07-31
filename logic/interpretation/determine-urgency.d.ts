import type { EcgInterpretationItem, UrgencyLevel } from "../../types/interpretation";

export function sortByUrgency<T extends EcgInterpretationItem>(items: T[]): T[];
export function urgencyLabel(urgency: UrgencyLevel): string;
