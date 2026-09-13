# ERD — Database Plan (v2)

> Changes from v1 marked **+** (added) / **−** (dropped) / **~** (modified).
> Complementary API shapes live in [Contract.md](Contract.md).

```mermaid
erDiagram
    KELAS {
        int id PK
        varchar name UK "e.g. 2P420 - dynamic seed data"
    }

    ACCOUNT {
        int id PK "+ new - credential admin accounts"
        varchar username UK
        varchar password_hash
        int role_id FK "+ new - ROLE survives only here"
        varchar status "+ new - aktif or menunggu"
        datetime created_at "+ new"
    }

    ROLE {
        int id PK "~ kept - now referenced by ACCOUNT only (no longer by TOKEN)"
        varchar name UK "dynamic - seed values are examples only"
    }

    PACK {
        int id PK
        varchar title
        int duration_minutes
        int pass_mark_pct "default 70"
        int status_id FK
        varchar created_by "~ modified - now ACCOUNT.username of logged-in admin"
        datetime created_at
    }

    PACK_STATUS {
        int id PK
        varchar name UK "draft or published"
    }

    QUESTION {
        int id PK "~ kept - no type column; arbitration: options rows => MC else fill"
        int pack_id FK
        text prompt
        int position "display order in runner"
    }

    IMAGE_URL {
        int id PK "+ new - stimulus images for question rendering (kasus)"
        int question_id FK
        varchar url
        int position
    }

    ANSWER_OPTION {
        int id PK
        int question_id FK
        varchar option_text
        int position
        boolean is_correct "~ kept - contract diagram no longer greys is_correct; stripped from server responses only"
    }

    ACCEPTED_ANSWER {
        int id PK
        int question_id FK
        varchar answer_text "one row per accepted spelling"
    }

    TOKEN {
        int id PK
        varchar code UK "8-char code"
        int pack_id FK "~ modified - NOT NULL: exam-only tokens, each bound to one pack"
        varchar created_by
        datetime created_at
        datetime expires_at
        datetime revoked_at "NULL = not revoked - kills future redemptions only"
    }

    TOKEN_REDEMPTION {
        int id PK
        int token_id FK "many npms per token"
        varchar npm "UNIQUE with token_id; REQUIRED - npm x cannot reuse token x"
        varchar participant_name "REQUIRED; self-declared at admission"
        int kelas_id FK "REQUIRED; self-declared at admission"
        int attendance_no "+ new - batch set parity derives from this at exam.start()"
        datetime redeemed_at
    }

    ATTEMPT {
        int id PK
        int redemption_id FK "single attempt per redemption (CHECK) - no retakes v2"
        int pack_id FK "denormalized from token - keep in sync"
        datetime started_at
        datetime last_activity_at "heartbeat for live monitoring"
        datetime submitted_at "NULL while in progress"
    }

    ATTEMPT_RESULT {
        int attempt_id PK "1-1 immutable grade snapshot"
        int attempt_id FK
        decimal score_pct
        boolean passed
        datetime graded_at "NULL = essays still pending"
    }

    ATTEMPT_ANSWER {
        int id PK "composite ${attempt_id}:${question_id} at contract level"
        int attempt_id FK "sparse - one row per touched question"
        int question_id FK
        boolean is_flagged
    }

    ATTEMPT_SELECTION {
        int answer_id PK "composite with option_id"
        int answer_id FK
        int option_id PK "real FK, not a positional index"
        int option_id FK
    }

    ATTEMPT_TEXT_RESPONSE {
        int answer_id PK "fill-type responses only"
        int answer_id FK
        text response_text
        decimal manual_score "essay grading"
        varchar graded_by "~ modified - ACCOUNT.username"
        datetime graded_at
    }

    FEEDBACK {
        int id PK "+ new - kesan & pesan module"
        int redemption_id FK "UNIQUE - one feedback per admission"
        int kelas_id FK "+ denormalized from redemption for scrubbed admin listing"
        text kesan
        text pesan
        datetime created_at "+ new"
    }

    KELAS ||--o{ ACCOUNT : "not related"
    KELAS ||--o{ TOKEN_REDEMPTION : "self-declared at"
    ROLE ||--o{ ACCOUNT : "authorizes"
    PACK }o--|| PACK_STATUS : "labeled"
    PACK ||--|{ QUESTION : "contains"
    QUESTION ||--o| IMAGE_URL : "illustrates"
    QUESTION ||--o{ ANSWER_OPTION : "offers"
    QUESTION ||--o{ ACCEPTED_ANSWER : "accepts"
    PACK ||--o| TOKEN : "unlocks"
    TOKEN ||--o{ TOKEN_REDEMPTION : "admits many npms"
    TOKEN_REDEMPTION ||--o| ATTEMPT : "single attempt"
    PACK ||--o{ ATTEMPT : "taken on"
    ATTEMPT ||--o| ATTEMPT_RESULT : "graded into"
    ATTEMPT ||--o{ ATTEMPT_ANSWER : "contains"
    QUESTION ||--o{ ATTEMPT_ANSWER : "answered in"
    ATTEMPT_ANSWER ||--o{ ATTEMPT_SELECTION : "selects"
    ANSWER_OPTION ||--o{ ATTEMPT_SELECTION : "chosen via"
    ATTEMPT_ANSWER ||--o| ATTEMPT_TEXT_RESPONSE : "typed as"
    TOKEN_REDEMPTION ||--o| FEEDBACK : "leaves one anonymous"
```

## Deltas from v1

| # | Change | Rationale |
|---|---|---|
| 1 | **+ `TOKEN_REDEMPTION.attendance_no`** | batch set selector (odd/even → setA/setB) had no home anywhere |
| 2 | **~ Redemption fields required** — `npm`, `participant_name`, `kelas_id` no longer considered nullable | contract's `redeem` validates all required |
| 3 | **− `TOKEN.role_id`, ROLE-from-TOKEN usage** — ROLE table kept but referenced only by ACCOUNT | tokens are exam-only; authorization is account-based |
| 4 | **~ `TOKEN.pack_id` NOT NULL** (was optional staff-token escape hatch) | one token = one exam pack; admin access is no longer token-based |
| 5 | **~ `PACK.created_by` / `ATTEMPT_TEXT_RESPONSE.graded_by` = ACCOUNT username** — "audit-lite (no accounts to FK to)" is superseded since ACCOUNT now exists | audit values come from the admin session |
| 6 | **+ `ACCOUNT`** { username UK, password_hash, role_id FK, status } | usernames/password admin credentials per decision of record #4 |
| 7 | **+ `IMAGE_URL`** 1:N from QUESTION (with position) | kasus stimulus images previously rendered from mock data with no storage |
| 8 | **~ `ATTEMPT`: 1 per redemption** (relationship starts o\|) | single-attempt retake policy, enforced at `exam.start()` |
| 9 | **+ `FEEDBACK`** { kesan, pesan, kelas_id } linked to redemption_id UNIQUE | kesan-pesan was end-to-end in mockup with zero backing; identity scrubbed in admin listing |
| 10 | **~ `ANSWER_OPTION.is_correct`** — stays in DB, guaranteed stripped from any serialized client payload | explicit after `options` became `{text, isCorrect}` inputs |
| 11 | **+ `ACCOUNT` relationship to ROLE** | role management (`admin.user.*`) needs it |

## Intentionally left out

- **No `FEEDBACK ↔ ATTEMPT_ANSWER` linkage** — feedback is per-redemption, not per-attempt.
- **No soft-delete on QUESTION/PACK** — publish is one-way; drafts are the only deletable state.
- **No progress/status counters** — monitoring derives status from `last_activity_at` staleness + `submitted_at`.
- **No `kesan-pesan` admin approval flow** — listing is read-only (+ CSV export).
