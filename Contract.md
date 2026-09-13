# Contract — tRPC API Plan (v2)

> Validated against the UI mockup and the ERD. UI composition/screens are owned by the design team;
> this document only locks request/response shapes and their backing storage.

## Conventions

- **Session scopes** three ways: exam session cookie = `TOKEN_REDEMPTION` (set by `auth.redeem`),
  admin session cookie = `ACCOUNT` (set by `adminAuth.login`).
- **Question type is never stored.** Arbitration rule (loose):
  any `ANSWER_OPTION` rows ⇒ multiple-choice, otherwise fill-type. `exam.start()` derives and
  returns `type: "mc" | "fill"` per question. A question with both options and accepted answers
  is representable at DB level; MC takes precedence.
- **Question display type for the runner** is `mc` (ChoiceInput), `fill` (textarea), or `fill` with
  `stimulusUrls` non-empty (kasus rendering). `type` and `stimulusUrls` are derived server-side.
- **`responseId` format** = composite string `` `${attemptId}:${questionId}` `` — keys the sparse
  `ATTEMPT_ANSWER` ↔ `ATTEMPT_TEXT_RESPONSE` pair exactly, no lazily created int ids.
- **`is_correct` never leaves the server.** `exam.start()` returns options as `{ id, text }[]`.

## auth — public (participant side)

```ts
auth.classList()
  → { id, name }[]                       // KELAS table; dropdown at token entry

auth.redeem({
  code: string,                          // TOKEN.code (8-char)
  npm: string,                           // required
  name: string,                          // required — self-declared
  kelasId: int,                          // required — self-declared
  attendanceNo: int,                     // required — stored on TOKEN_REDEMPTION
})                                       // creates TOKEN_REDEMPTION row, sets exam session cookie
  → { redirect: "/exam" }                // tokens are exam-only; one token per pack
```

Admin login does **not** go through `auth.*` (see `adminAuth`).

## adminAuth — public (credential accounts)

```
adminAuth.login({ username, password })  → session cookie (ACCOUNT)
adminAuth.logout()                       → { ok }
adminAuth.me()                           → { id, username, role } | UNAUTHORIZED
```

## exam — participant (exam session's pack)

```
exam.me()           → { pack, attempt?, remainingSeconds? }   // resume support; pack from token.pack_id
exam.start()        → { attemptId, questions }
  // creates ATTEMPT under the session's redemption (single attempt per redemption — reject re-start)
  // question shape:
  //   {
  //     id: string,
  //     prompt: string,
  //     type: "mc" | "fill",            // derived: options>0 ⇒ "mc", else "fill"
  //     options?: { id, text }[],       // is_correct stripped
  //     stimulusUrls: string[],         // IMAGE_URL rows (may be empty)
  //   }
  // ordered by QUESTION.position
exam.saveAnswer({ questionId, optionId?, text?, isFlagged? })
  // upserts sparse ATTEMPT_ANSWER; optionId → ATTEMPT_SELECTION, text → ATTEMPT_TEXT_RESPONSE
exam.heartbeat()    → { ok }             // writes ATTEMPT.last_activity_at
exam.submit()       → { result }         // sets submitted_at, autogrades; graded_at NULL if essays pending
exam.result()       → { result, answers? }  // read after submit (retakes locked: 1 attempt/redemption)
```

## feedback — participant (exam session's redemption)

```
feedback.submit({ kesan, pesan })    // insert FEEDBACK row;
                                     // kelas + redemption id derived from session
                                     // UNIQUE per redemption — one feedback per admission
→ { ok }
```

## monitoring — public (doodle feed)

```
monitoring.active()  → anonymized in-progress feed
  // ⚠ npm/name strictly masked — derived from ATTEMPT(submitted_at NULL) only
```

## admin — admin session required

```
// packs
admin.pack.create({ title, durationMinutes, passMarkPct? })   // passMarkPct default 70
admin.pack.update({ id, ...patch })
admin.pack.publish({ id })         // draft → published, one-way; created_by = ACCOUNT.username

// questions (children of pack)
admin.question.create({ packId, prompt, options?: [{ text, isCorrect }], acceptedAnswers?: string[] })
  // options → ANSWER_OPTION(text, is_correct); acceptedAnswers → ACCEPTED_ANSWER rows (per spelling)
admin.question.update({ id, ...patch })
admin.question.delete({ id })      // draft packs only
admin.question.reorder({ packId, order: id[] })   // rewrites QUESTION.position

// tokens (exam-only, REQUIRED packId)
admin.token.create({ packId, expiresAt? })     // auto-generates 8-char code; created_by = ACCOUNT.username
admin.token.revoke({ tokenId })                // sets revoked_at; kills future redemptions only
admin.token.list()                             // + redemption count per token

// accounts (new)
admin.user.create({ username, password, roleId })   // status starts "Menunggu"
admin.user.approve({ userId })                      // status → "Aktif"
admin.user.list()                                   // { id, username, role, status }
admin.user.setRole({ userId, roleId })
admin.user.delete({ userId })

// kelas
admin.kelas.create({ name })
admin.kelas.list()

// monitoring (registered views)
admin.monitoring.active()          → { npm, name, kelas, lastActivityAt }[]   // staleness derived client-side

// reports
admin.report.attempts({ packId, filters? })
  → { npm, name, kelas, score, passed }[]     // ATTEMPT ⋈ TOKEN_REDEMPTION ⋈ ATTEMPT_RESULT
admin.report.export({ packId })    → csv

// grading
admin.grading.setManualScore({ responseId, score })
  // responseId = `${attemptId}:${questionId}`; writes ATTEMPT_TEXT_RESPONSE.manual_score,
  // graded_by = ACCOUNT.username, graded_at = now; re-check pass when all essays scored
```

## Decisions of record

| # | Decision |
|---|---|
| 1 | `attendance_no` stored on `TOKEN_REDEMPTION`; batch set (A/B) = parity at `exam.start()` |
| 2 | `npm`, `name`, `kelasId` **required** on redeem (not optional) |
| 3 | Tokens are exam-only; `TOKEN.pack_id` NOT NULL; redirect fixed to `/exam`; Quiz and Post-Test each need their own token |
| 4 | Admin auth = username/password over `ACCOUNT`; no token-based admin access |
| 5 | ROLE dropped from TOKEN — exists only as `ACCOUNT.role_id` |
| 6 | Options payloads are `{ text, isCorrect }[]`; `is_correct` never leaves the server |
| 7 | Loose question-type arbitration (options ⇒ MC else fill), derived at `exam.start()` |
| 8 | Stimuli stored in 1:N `IMAGE_URL` table linked to `QUESTION` |
| 9 | `responseId` = composite `${attemptId}:${questionId}` |
| 10 | Monitoring returns heartbeat staleness only — progress column dropped |
| 11 | Retake policy: single attempt per redemption, enforced at `exam.start()` |
| 12 | Public `monitoring.active()` kept, npm/name masked |
| 13 | Feedback redemption-linked (`FEEDBACK.redemption_id` UNIQUE); admin listing scrubs identity — kelas only |
| 14 | Audit-lite columns (`created_by`, `graded_by`) = logged-in `ACCOUNT.username` |
