# The Yororis framework

> **Under construction — not deployed, not offered to anyone.** This document says what Yororis is, what it is not,
> which controls it inherits from Orazaka, and what is being studied before it can be offered to anyone. It draws **no
> legal conclusion**: that is the study's job, with a lawyer, and its answers are recorded privately by the maintainers
> before anything changes here.

## 1. What Yororis is

**A listening space with a face and a voice.** A person opens a *moment* with a *presence* — an AI presence with a first
name, an animated portrait carrying a permanent "AI" mark, a voice and exact subtitles. The presence listens, reflects
back, asks one question at a time and helps put words on what is being lived. The moment has a maximum length and a
number of moments per day and per week, set by the organisation that offers it (defaults: 25 minutes, one a day, three
a week). When it closes, the transcript is gone; what remains is **what I keep** — a short summary the person reads,
edits or deletes — and **the thread** that carries it into the next moment.

It is meant for organisations first (a wellbeing programme, a clinic, a professional order), which set the limits for
their members. It is **what a person brings to their therapist, doctor or whoever supports them — not instead of them.**

## 2. What Yororis is not

This section is the only place in the product where the words below appear, and only to deny them. They are the
"never" column of the Yororis lexicon, which the product's lexicon test enforces everywhere else.

- **Not care.** Yororis does not diagnose, treat, assess or analyse anyone's state; it is not therapy, not
  psychotherapy, not a mental health service, not a health app, not a clinical or medical device, and it makes no claim
  of a health outcome.
- **Not a person.** The presence is an AI and says so at the start of every moment: *"I'm Léa, an AI presence. I'm not
  a therapist and not an emergency service."* It is never a therapist, counsellor, coach, companion or friend, and never
  passes for human.
- **Not an emergency service.** A crisis is detected by Orazaka's crisis guard and answered with a fixed, reviewed text
  and a sourced regional line — in Canada, call or text **9-8-8**; in Québec, **811** (Info-Social).
- **Not a 24/7 companion.** The presence never says "I'm here 24/7", "you can always count on me", "I miss you"; there
  is no affective nudge, no streak, no reward, and no paid "one more moment today".
- **Not a reader of emotions.** Mood is two self-reported sliders, before and after; nothing is inferred from the
  voice or the text, and no score is computed.
- **Not a record.** No session notes, no file, no clinical history: summaries the person owns, exports as one page,
  and deletes.

## 3. The controls Yororis inherits

Every AI call goes through **Orazaka's wellbeing pack** (`bien-etre`, data class REGULATED) — Yororis has no other AI
provider. The pack brings, enforced by the engine rather than by a prompt
([ADR-055](https://github.com/krizaka/orazaka/blob/main/docs/adr/ADR-055-regulated-controls-and-the-wellbeing-pack.md),
building on [ADR-051](https://github.com/krizaka/orazaka/blob/main/docs/adr/ADR-051-sensitive-controls.md)):

| Control | What it does |
| :--- | :--- |
| Versioned consent, blocking | No consent to the current statement → `451` with the statement; changing it stops every installation until agreed again. |
| Crisis guard | First in the chain, cannot be switched off, survives the AI kill-switch; the response is fixed and reviewed, never generated, with a sourced and dated regional line. |
| Scope guard | Refuses diagnosis and medication questions verbatim. |
| Age attestation | Recorded on the installation; not available to minors. |
| Retention and audit | 30-day retention (shorter on request), encryption, append-only audit, no aggregate without a data class. |
| Regions | Installs only where a verified crisis resource exists (FR, BE-FR, BE-NL, CA today; CA-QC to be added). |

Yororis adds its own: limits applied by the server, the transcript destroyed at the summary, self-reported mood,
export and deletion by the person, aggregate statistics only — and construction mode (§5).

## 4. What is being studied

Questions only, by jurisdiction — answers are recorded privately with their date, then reflected here.

- **Québec (CA-QC)** — the reserved title and act of psychotherapy (Bill 21); Law 25: privacy impact assessment,
  consent, retention, hosting; the crisis resources (9-8-8, 811 Info-Social) and how they are shown.
- **Canada (CA)** — whether any feature could qualify the software as a medical device (Health Canada); federal privacy
  law; competition law and claims made to organisations.
- **France and the European Union (FR/EU)** — the medical device regulation (intended purpose); the AI Act (disclosure
  that one is talking to an AI, art. 50; emotion recognition); GDPR art. 9 (health data); the crisis resources.
- **Belgium (BE)** — the same European questions, and the two language communities' crisis lines.
- **Annex — the United States, if ever** — the state laws on "mental health chatbots" (Illinois, Nevada, Utah).
- **Across all** — the conditions of a pilot with outside people, and liability insurance.

## 5. Construction mode

| Where | Rule |
| :--- | :--- |
| Repositories | Public, opening with the banner; this document exists. Checked by CI. |
| Deployment | No deployment workflow; nothing is published, no production variable exists. Checked by CI. |
| Production start | `NODE_ENV=production` refuses to start without `YORORIS_RELEASE_APPROVAL`, the reference of a written and signed decision. |
| Accounts | No open sign-up: an invitation code is required; only the maintainers and a fictional demo cast. |
| Mobile builds | Development and preview builds for the maintainers' devices only; no public build, no store submission. |
| Demo | Listens on `127.0.0.1` only, with a fictional cast. |
| krizaka.com | The page says "under construction"; its only call to action is "Talk to us about Yororis". |
| Pilot with outside people | Not while construction mode is active. |
| Lifting the mode | A written decision (date, scope: internal · pilot · organisation · public, conditions), then a pull request "release: lift construction mode". Nothing lifts by accident. |
