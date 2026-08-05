# Version 2 Rule Adapter Completion

## Completion status

- Common rule adapters: 57 / 57
- Unadapted rules: 0
- Brugada rules: evaluated through the common `EcgRule` / `EcgRuleEvaluation` contract
- Rule relations: `matchedRuleIds`, `insufficientRuleIds`, `competingRuleIds`, `suppressedRuleIds`, and `relatedRuleIds`

The adapter layer wraps existing rule results. It does not replace the existing clinical functions, add thresholds, or change treatment content. Missing required input remains `insufficient_data` and is never converted to a normal finding.

## Brugada adapter

The Brugada adapter preserves the existing V1/V2 placement check and the RBBB-like-pattern differential. Syncope and family history are used only when explicitly entered. An absent value is not treated as a negative value.

## Competing rules

Competing rules are retained rather than deleted. IDs are deduplicated and ordered by urgency, rule priority, and stable Rule ID. The standard UI describes these as candidates that may coexist or require differentiation.

## Suspected lead reversal

Suspected lead reversal is an important quality warning. It reduces confidence in axis, P-wave polarity, and lead-distribution interpretation, but it does not automatically delete an ischemia candidate or establish a normal ECG.

When an ischemia candidate coexists with suspected lead reversal:

- both quality and ischemia Rule IDs are retained;
- correct electrode placement and repeat 12-lead recording are requested;
- comparison with a previous ECG is requested;
- the ischemia candidate is retained for reassessment after repeat recording;
- acute symptoms, reciprocal change, dynamic change, or hemodynamic instability keep their existing urgency.

The existing status model is unchanged. Candidate retention is represented using the existing matched result plus limitations and additional checks.
