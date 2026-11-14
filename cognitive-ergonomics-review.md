# Cognitive ergonomics review

## Scope and evidence

Task evaluation is a separate local workspace available from Data options → Task evaluation. It does not record operational clicks, health readings, symptoms, identities or AI conversations. A reviewer explicitly enters task time, interaction steps, errors and navigation changes; optional workload and satisfaction values must come from a participant. No sample results are seeded.

Raw NASA-TLX is the unweighted mean of six 0–100 dimensions. Performance is encoded as difficulty: 0 perfect success, 100 failure. The dashboard is a methodological aid, not a validated research instrument; weighted pairwise NASA-TLX is not implemented. There is no invented overload threshold. Missing feedback remains absent, not zero.

## Walkthrough observations and barriers

| Workflow | Goal / action recognition | Expected result / feedback | Remaining barrier |
| --- | --- | --- | --- |
| Check-in | Named screen and measured/entered hints | Save updates dated coverage and preserves screen; validation marks errors | Long form; workload needs participant feedback |
| Urgent status | Overview status precedes secondary details | Act/Watch areas and existing action lists precede Normal | Source quality needs independent verification |
| Trends | Named measurement selector | Latest/previous comparison and history show units and dates | Sparse real measurements limit chart availability |
| Tasks | Named task rows, All/Open/Completed views | Completion feedback; reversible checkboxes | Automatic tasks depend on recorded values |
| Import | Device/import disclosure and CSV action | Date validation, overlap confirmation and undo | CSV measurement semantics remain adapter-defined |
| Wellness guidance | Named action, symptom field, explicit consent | Pending status, guidance or preserved-input error | AI advice is not diagnosis; sent context cannot be recalled |

These are expert observations of visible behavior, not claims about participant understanding. The dashboard provides the four-step walkthrough protocol and a SHERPA-inspired register of action, selection, retrieval, checking and communication risks. Likelihood labels are estimates, not measured probabilities.

## Interaction efficiency and decision complexity

- Existing primary actions and alternative body-region controls provide named targets; workload slider thumbs now have accessible names and 24-pixel dimensions.
- Repeated check-ins remain on the form. Secondary data actions stay grouped; workload and error-analysis tools stay outside operational monitoring.
- No Fitts movement-time coefficients or Hick-Hyman decision-time coefficients have been fitted. No motor-performance or cognitive-speed benefit is claimed without participants.

## Verification

- Thirteen unit tests passed, including six-dimension Raw TLX averaging and rejection of missing/out-of-range dimensions, absence of empty metrics, and omission of missing subjective feedback.
- Browser verification started empty, saved one deliberately scripted observation (30 seconds, 2 steps, 0 errors, 1 navigation change), exercised six ratings of 5, confirmed Raw TLX 5/100, reloaded it and exported JSON.
- Those browser inputs are test fixtures in a disposable browser, not actual participant feedback and not production seeds.
- Error-analysis and walkthrough views opened; desktop 1280 × 1800 and phone 390 × 844 rendered without horizontal overflow or browser runtime errors.
- Build passed. Formal accessibility certification, participant studies, physical device tests and clinical validation remain outside this evaluation.

## Improvement register

| Issue | Priority | Status / next step |
| --- | --- | --- |
| No task-specific workload feedback | High | Local optional six-dimension form implemented |
| Metrics could imply uncollected results | High | Empty metrics show Not measured / No feedback; no seeded results |
| Evaluation mixed into health tasks | High | Separate route and isolated storage implemented |
| Slider thumb lacked accessible label | Medium | Label forwarded to focusable thumb; keyboard tested |
| Implausible live telemetry | High | Open: needs independent source/unit validation; medical adapters intentionally unchanged |
| Human workload and satisfaction evidence | Medium | Open: requires real participant observations, not automated fixtures |

Use the cycle Analyze → Identify → Prioritize → Implement → Test → Evaluate → Improve after each set of real observations. Review highest-rated workload dimensions with participants before choosing an ergonomic change; no automated medical action follows from these ratings.