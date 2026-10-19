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

## 4. Voice: hold to talk, captions always, the voice can be turned off

- **Decision.** The microphone opens only while the person holds the button (or holds Space or Enter on it) and closes the moment they let go, or after 30 seconds. What the presence says is also written, sentence by sentence, in the conversation, whether or not the sound is on; « Voice on / Voice off » turns only the sound. While the presence speaks, a waveform follows the real signal. A recording shorter than half a second is ignored with a gentle note.
- **Problem.** An open microphone is a surveillance feeling in a conversation about one's life; a voice with no text excludes people who cannot or do not want to listen, and a spoken answer cannot be re-read.
- **Principle.** Privacy by design, nothing on by default (Cavoukian, 2009); captions for live audio and a way to pause or stop audio that plays (WCAG 2.2, criteria 1.2.4 Captions (Live) and 1.4.2 Audio Control).
- **Refused.** Always-listening and voice-activity detection (the browser would hear what was not meant for it); autoplaying without a gesture; a spoken answer with no text.
- **Cost.** Holding a button is less fluid than talking; a browser that cannot record in WebM or Ogg/Opus is told so and offered the keyboard.
- **Signal that we are wrong.** QA notes that holding is tiring on a phone, or that the cut at 30 seconds interrupts a thought — then a tap-to-start, tap-to-stop mode with the same visible state is the alternative.

## 5. Navigation: three places, and the lines to call are not one of them

- **Decision.** The signed-in space has three destinations — **Home**, **A moment**, **Account** — and, for an organiser only, a fourth group (**Members**). Each is one job: see what is mine and begin; talk; look after my account (profile, display, consent, what I bring, deletion). The lines to call are not a destination: they are on the screen (§1). What I keep, the thread and my notebook are shown on Home as designed empty states until they exist; they are not menu items of their own.
- **Problem.** A listening space with a menu of eight things asks a tired person to choose before they can speak.
- **Principle.** Hick's law — decision time grows with the number of choices (Hick, 1952; Hyman, 1953); the navigation of at most about five top-level items of the dev-preview standard.
- **Refused.** A destination per feature (« thread », « notebook », « keeps »); docs or platform entries next to the product's own; a mobile tab bar with more than three tabs.
- **Cost.** What I keep will have to earn its own place the day it has content.
- **Signal that we are wrong.** QA notes that someone cannot find their summaries, or an organiser looks for the members elsewhere.

## 6. The end: keep three lines, or let it all go; and what is left

- **Decision.** After a moment the person is asked once whether they want three lines kept — what came up, what helped, a small step, what to bring with them — described by the pack from their own words, and shown to read, edit, copy, download or let go. Their own two numbers (1 to 5, before and after) are optional and never computed. The screen then says how many moments are left today and this week and when the next one opens. Nothing is stored here: the words are forgotten as soon as the lines are written, or after 15 minutes without a choice.
- **Problem.** A conversation that ends in a wall (« limit reached ») or in silence leaves the person with nothing to hold; a summary written for them and kept by someone else is a file.
- **Principle.** The peak-end rule (Kahneman et al., 1993): the end is what is remembered, so it is calm and useful; user control and freedom (Nielsen, 1994): every generated line is editable and can be dropped; privacy by design (Cavoukian, 2009): nothing kept by default.
- **Refused.** A history of moments in the app; an automatic summary; a score or a « progress » line; a streak.
- **Cost.** Lines that are not copied or downloaded are lost; one extra question at the end.
- **Signal that we are wrong.** QA notes that people always skip it (then it is noise) or that they look for their lines the next day (then a notebook, with consent, is the next step).

## 7. The organisation sees counts, never words

- **Decision.** The organiser's « Moments » view shows figures (moments, average length, how often the lines to call were shown, share of lines kept) and one line per moment — when to the hour, presence, language, length, turns, how it ended — with no word and no name. Krizaka UI's Stat grid and DataTable, sorted, filtered and paged on the server.
- **Problem.** An organisation has to know whether the product is used and whether the safety path fires, without being given the means to read anyone.
- **Principle.** Data minimisation (Loi 25, GDPR art. 5(1)(c)); aggregate statistics only (docs/FRAMEWORK.md).
- **Refused.** Per-member rows, transcripts, any mood figure, an alert that names a person.
- **Cost.** An organiser cannot follow up on a given person; that is the point.
- **Signal that we are wrong.** The organisation asks for a duty-of-care escalation: that is a decision with the lawyer, not a column.

The text on this screen is **not yet reviewed by a lawyer** (krizaka/.github#40); the Moment is for the QA accounts only until it is.
