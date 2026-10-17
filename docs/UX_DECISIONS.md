# UX decisions — why the Moment is built this way

One entry per notable choice: the decision, the problem, the principle (with its source), what was refused, what it costs, and the signal that would say we are wrong. Feedback: the pinned Discussion of this repository.

## 1. The lines to call are on the screen in every state

- **Decision.** « Besoin d'aide maintenant ? » with « Appeler le 9-8-8 », « Texter le 9-8-8 » and « Info-Social 811 » is a strip pinned to the bottom of the Moment screen, before a moment, during it, after an answer, when the pack's crisis reply is shown and when the Moment is unavailable. They are three plain links (`tel:`, `sms:`): they work with no script and no network call.
- **Problem.** A person in difficulty does not look for a menu. A help path that sits behind a button, a settings page or a feature that has to load is a path that fails exactly when it is needed.
- **Principle.** Visibility of system status and help at the point of need (Nielsen, *10 Usability Heuristics*, 1994); targets large enough to tap under stress (WCAG 2.2, success criterion 2.5.8 Target Size).
- **Refused.** A « help » icon that opens a dialog; lines shown only after a risk cue (a cue can be missed; the lines cannot be); a generated message offering the numbers (the numbers come from the pack, verified at the source, never from a model).
- **Cost.** One strip of screen on a phone, always.
- **Signal that we are wrong.** People report the strip as alarming or intrusive in the QA notes, or the strip hides the composer on a small phone (checked at 360 px by `tests/e2e/moment.mjs`).

## 2. The presence stops, and the timer shows it

- **Decision.** A moment has a longest length (25 minutes by default), a visible countdown, a note two minutes before the end, and a quiet end. Moments per day and per week are limited on the server; when the limit holds, the screen says when it opens again.
- **Problem.** A conversation that never ends invites dependence, and a limit nobody can see feels like a failure.
- **Principle.** Visibility of system status (Nielsen, 1994); the peak-end rule — people remember the peak and the end of an experience (Kahneman, Fredrickson, Schreiber, Redelmeier, 1993) — so the end is announced and calm rather than a cut.
- **Refused.** A streak, a reward, a « come back » nudge, an unlimited mode.
- **Cost.** Someone who wants to go on cannot, today.
- **Signal that we are wrong.** QA notes that the two-minute note arrives too late to finish a thought, or that the stop reads as a refusal.

## 3. What is kept is read and agreed to before the first word

- **Decision.** The screen that chooses the presence shows what is kept (nothing of what is said is saved; the words are held only while the moment lasts) and asks for a tick before the button works. The presence's first line says it is an AI presence, and the AI mark stays on its face.
- **Problem.** What happens to the words is the first thing a person wonders, and it cannot be learned after saying them.
- **Principle.** Privacy by design — proactive, embedded in the default, visible and transparent (Cavoukian, *Privacy by Design: The 7 Foundational Principles*, 2009); disclosure of an automated interlocutor (EU AI Act, art. 50).
- **Refused.** A link to a policy page; a pre-ticked box.
- **Cost.** One extra tap before the first moment.
- **Signal that we are wrong.** People tick without reading (QA sessions are watched for it) — then the text is too long or too late.

The text on this screen is **not yet reviewed by a lawyer** (krizaka/.github#40); the Moment is for the QA accounts only until it is.
