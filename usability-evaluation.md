# Advanced ergonomics evaluation

Evaluated 14 November 2026. NASA research, ISO 9241-110 dialogue principles, and Nielsen's heuristics are design references, not certifications. Medical rules, feeds, record structures, and AI integration remain unchanged.

## Implemented improvements

- Saving stays on the check-in screen; View overview provides explicit navigation.
- All/Open/Completed task views reduce scanning without changing task completion rules.
- System/Light/Dark appearance and preferred trend measurement persist separately from health records.
- Full-size body-region controls complement the original interactive body model.
- All invalid fields are marked and associated with the error; correction preserves other input.
- Notifications occupy document space rather than covering actions or readings.
- Existing status prioritization, undo, confirmation, consent, and source limitations remain available.

## Actual automated scenario measurements

Playwright Chromium, fresh local browser state, desktop 1280 × 1800; tablet 768 × 1024 and phone 390 × 844. Click counts exclude field edits and browser launch/network initialization. Durations are automation execution, not human task times.

| Scenario | Observed result | Measured actions |
| --- | --- | --- |
| A: First-time | Started a check-in, entered pulse 72, saved and read the record back | 2 button clicks, 1 field edit, 0.14 seconds automated execution |
| B: Experienced | Saved another date and pulse without returning through Overview | 1 button click, 2 field edits, 0.05 seconds automated execution |
| C: Incorrect input | Pulse 141 rejected on blur; input retained; correcting to 76 cleared error | 1 deliberately invalid input |
| D: Time-critical | Overall status precedes secondary details; Cardiovascular action card appears before normal areas | 1 click from check-in to overview |
| E: Returning | Reload retained saved dates, dark appearance, and sleep trend selection | Reload persistence verified; extended absence was simulated, not elapsed |

Supplemental checks: task filtering, body-region selection, arrow-key navigation, deletion cancellation, desktop dark appearance, tablet/phone overflow. No browser runtime errors observed. Ten existing/extended unit tests passed.

### Measurable workflow improvement

Before this change, Save returned to Overview, requiring a Check-in navigation click before another entry. Save now stays in Check-in, eliminating that one navigation click per consecutive check-in. This is a source-confirmed workflow comparison, not a controlled human before/after study.

## Expert-based assessment, not user-study results

Scale: 1 poor, 2 significant barriers, 3 usable with limitations, 4 strong with remaining gaps, 5 consistently excellent with supporting user evidence. Scores are qualitative review of the current interface; no baseline scores or satisfaction responses were collected.

| Criterion | Rating | Basis / remaining limitation |
| --- | --- | --- |
| Learnability | 4 | Clear starting action and named screens; health domain still requires explanation |
| Task efficiency | 4 | Consecutive saves and task filters; long measurement form remains |
| Information clarity | 4 | Status, coverage, units and changes visible; live telemetry reliability remains uncertain |
| Navigation quality | 4 | Consistent tabs, explicit Overview action, keyboard navigation |
| Error prevention | 4 | Original ranges, validation, confirmation; device/import adapter constraints remain |
| Error recovery | 4 | Undo, cancellation and preserved input; recovery is session-local |
| Consistency | 4 | Shared monitor tokens and controls; standalone monitor and React guidance remain distinct |
| Accessibility | 3 | Keyboard, labels, focus and larger alternate body controls; no complete WCAG audit |
| Cognitive workload | 4 | Prioritized warnings, disclosure and task filters; clinical interpretation is not validated |
| Overall user satisfaction | Not measured | Requires real participants; an invented rating would not represent satisfaction |

## Framework review

- NASA-inspired awareness: current screen, latest record, source availability and unsaved state remain visible; existing alerts lead the overview.
- ISO task appropriateness and controllability: repeated check-ins need less navigation; users choose when to open Overview and can cancel or undo destructive actions.
- ISO self-descriptiveness, expectations and learnability: named screens, stable labels and explicit task states; no new medical behavior.
- ISO error tolerance and individualization: validation preserves inputs; appearance and trend preferences persist.
- Nielsen status, real-world match, consistency and recognition: named outcomes, units, coverage, comparison dates and recognizable controls.
- Nielsen control, prevention and recovery: confirmation, undo, error association, consent and draft preservation.
- Nielsen flexibility, minimalism and help: task filters, keyboard navigation, progressive disclosure and existing contextual measurement/source explanations.

## Remaining validation limits

- No real participants, satisfaction survey, clinical validation, formal ISO compliance or NASA certification.
- No full WCAG 2.2 audit, screen-reader device matrix, or exhaustive contrast measurement.
- Bluetooth devices require hardware testing; their adapters were not changed.
- Existing live cabin readings can be implausible; source values and medical evaluation were intentionally preserved.
- No claim of reduced human error rate or faster human completion times; those require a controlled study.
- AI safety unit tests passed; no additional billable inference was needed for these presentation changes.