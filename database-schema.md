# Database Schema Reference

> **Project:** Conference Management System  
> **Engine:** PostgreSQL (Supabase)  
> **Last Updated:** 2026-04-27

---

## Table of Contents

1. [Authentication & Users](#1-authentication--users)
2. [Conferences](#2-conferences)
3. [Sessions & Chairs](#3-sessions--chairs)
4. [Papers & Review](#4-papers--review)
5. [Tickets & Registrations](#5-tickets--registrations)
6. [Subscriptions & Plans](#6-subscriptions--plans)
7. [Notifications](#7-notifications)
8. [CMS & Email](#8-cms--email)
9. [AI & Embeddings](#9-ai--embeddings)
10. [Q&A (Live Session)](#10-qa-live-session)
11. [Proceedings](#11-proceedings)
12. [Conversations (AI Chat)](#12-conversations-ai-chat)
13. [Known Issues & Tech Debt](#13-known-issues--tech-debt)
14. [ERD Summary](#14-erd-summary)

---

## 1. Authentication & Users

### `auth.users` *(Supabase built-in)*
Managed by Supabase Auth. Primary identity source via UUID.

---

### `public.profiles`
Supabase Auth-linked user profiles. **Primary user table — all modern FK references point here via `user_id` (integer).**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK, FK → `auth.users(id)` |
| `user_id` | integer (IDENTITY) | NOT NULL | Surrogate integer PK (UNIQUE) — used as FK in most tables |
| `full_name` | varchar | NOT NULL | |
| `email` | varchar | NOT NULL | |
| `organization` | varchar | YES | |
| `description` | text | YES | |
| `description_embed` | USER-DEFINED | YES | pgvector embedding of description |
| `avatar_url` | text | YES | |
| `google_refresh_token` | text | YES | For Google Calendar integration |
| `created_at` | timestamptz | NOT NULL | Default: `now()` |
| `updated_at` | timestamptz | NOT NULL | Default: `now()` |

> ⚠️ **Dual-PK pattern:** `id` (uuid) is the Auth PK; `user_id` (integer) is the surrogate key used as FK across all operational tables.

---

### `public.users`
Legacy user table — separate from Supabase Auth. Still referenced by `questions.author_id`, `reviewer_assignments.assigned_by`, and `user_roles_temp`.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `user_id` | integer (IDENTITY) | NOT NULL | PK |
| `full_name` | varchar | NOT NULL | |
| `email` | varchar | NOT NULL | UNIQUE |
| `password_hash` | varchar | NOT NULL | |
| `organization` | varchar | YES | |
| `description` | text | YES | |
| `description_embed` | USER-DEFINED | YES | pgvector |
| `avatar_url` | text | YES | |
| `created_at` | timestamp | YES | Default: `CURRENT_TIMESTAMP` |

> ⚠️ **Legacy table.** Do not use for new features. Kept for backward compatibility.

---

### `public.roles`

| Column | Type | Notes |
|---|---|---|
| `role_id` | integer | PK |
| `role_name` | varchar | NOT NULL, UNIQUE |

---

### `public.user_roles`
Current active role mapping — maps `auth.users` (UUID) to roles.

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid | PK, FK → `auth.users(id)` |
| `role_id` | integer | PK, FK → `roles(role_id)` |

---

### `public.user_roles_temp`
Transitional mapping — maps legacy `users` (integer) to roles. Being phased out.

| Column | Type | Notes |
|---|---|---|
| `user_id` | integer | FK → `users(user_id)` |
| `role_id` | integer | FK → `roles(role_id)` |

> ⚠️ **No PK defined.** Migration artifact — do not use for new logic.

---

### `public.user_conference_roles`
Per-conference role assignments (e.g., `organizer`, `reviewer`).

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | integer | NOT NULL | PK |
| `user_id` | integer | NOT NULL | No FK constraint defined |
| `conference_id` | integer | NOT NULL | No FK constraint defined |
| `role` | varchar | NOT NULL | |
| `created_at` | timestamptz | YES | Default: `now()` |

> ⚠️ **Missing FK constraints** on `user_id` and `conference_id`.

---

## 2. Conferences

### `public.conferences`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `conf_id` | integer | NOT NULL | PK |
| `conf_name` | varchar | NOT NULL | |
| `start_date` | date | YES | |
| `end_date` | date | YES | |
| `location` | varchar | YES | |
| `is_active` | boolean | YES | Default: `true` |
| `status` | varchar | YES | Default: `'DRAFT'` |
| `description` | text | YES | |
| `banner_urls` | jsonb | YES | Array of image URLs |
| `keywords` | jsonb | YES | Array of topic keywords |
| `open_for_papers` | boolean | YES | CFP open flag |
| `sessions_ready` | boolean | YES | Default: `true` |
| `create_time` | timestamptz | YES | |
| `format_type` | text | YES | Default: `'in-person'`. Values: `in-person`, `virtual`, `hybrid` |
| `timezone` | text | YES | Default: `'UTC'` |
| `max_chairs_per_session` | integer | NOT NULL | Default: `1`. Max chairpersons allowed per session |

---

## 3. Sessions & Chairs

### `public.sessions`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `session_id` | integer | NOT NULL | PK |
| `session_name` | varchar | YES | |
| `start_time` | timestamp | YES | |
| `end_time` | timestamp | YES | |
| `room_location` | varchar | YES | |
| `is_ai_generated` | boolean | YES | Default: `false` |
| `conf_id` | integer | YES | FK → `conferences(conf_id)` |
| `session_type` | varchar | YES | Default: `'Technical'` |
| `format_type` | text | YES | Default: `'in-person'`. Values: `in-person`, `virtual`, `hybrid` |
| `meet_link` | text | YES | Google Meet URL |
| `record_video_url` | text | YES | Recording URL |
| `google_event_id` | text | YES | Google Calendar event ID |
| `is_meet_active` | boolean | YES | Default: `false` |

> ℹ️ `chair_person_id` column removed. Chairpersons now managed via `session_chairs` (many-to-many) and `chair_invitations`.

---

### `public.session_chairs`
Maps multiple chairpersons to a session. Replaces the old `sessions.chair_person_id` single FK.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `session_id` | integer | NOT NULL | PK, FK → `sessions(session_id)` |
| `user_id` | integer | NOT NULL | PK, FK → `profiles(user_id)` |
| `assigned_at` | timestamptz | YES | Default: `now()` |

> `conferences.max_chairs_per_session` controls the max rows allowed per session here.

---

### `public.chair_invitations`
Invitation flow for assigning chairpersons via email token.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `invitation_id` | uuid | NOT NULL | PK, Default: `uuid_generate_v4()` |
| `conf_id` | integer | YES | FK → `conferences(conf_id)` |
| `session_id` | integer | YES | FK → `sessions(session_id)` |
| `email` | varchar | NOT NULL | Invitee email |
| `status` | USER-DEFINED | YES | Custom type `invitation_status`. Default: `'PENDING'` |
| `token` | text | YES | UNIQUE. Secure token for invitation link |
| `invited_by` | integer | YES | FK → `profiles(user_id)` |
| `created_at` | timestamptz | YES | Default: `now()` |
| `responded_at` | timestamptz | YES | When invitee accepted or declined |

---

### `public.session_papers`
Junction: papers assigned to sessions with presentation schedule.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `session_id` | integer | NOT NULL | PK, FK → `sessions(session_id)` |
| `paper_id` | integer | NOT NULL | PK, FK → `papers(paper_id)` |
| `presentation_order` | integer | YES | |
| `start_time` | timestamp | YES | |
| `end_time` | timestamp | YES | |

---

### `public.agenda_drafts`
Versioned agenda drafts per conference.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `draft_id` | integer | NOT NULL | PK |
| `conference_id` | integer | YES | FK → `conferences(conf_id)` |
| `version` | integer | NOT NULL | |
| `is_final` | boolean | YES | Default: `false` |
| `created_by` | integer | YES | FK → `profiles(user_id)` |
| `created_at` | timestamp | YES | Default: `CURRENT_TIMESTAMP` |

---

### `public.agenda_comments`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `comment_id` | integer | NOT NULL | PK |
| `draft_id` | integer | YES | FK → `agenda_drafts(draft_id)` |
| `commenter_id` | integer | YES | FK → `profiles(user_id)` |
| `comment_text` | text | YES | |
| `commented_at` | timestamp | YES | Default: `CURRENT_TIMESTAMP` |

---

### `public.attendences`
Session check-in records.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `at_id` | bigint (IDENTITY) | NOT NULL | PK |
| `is_checkin` | boolean | YES | |
| `checkin_time` | timestamp | YES | |
| `registration_id` | integer | YES | FK → `registrations(registration_id)` |
| `session_id` | integer | YES | FK → `sessions(session_id)` |

---

## 4. Papers & Review

### `public.papers`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `paper_id` | integer | NOT NULL | PK |
| `title` | text | NOT NULL | |
| `abstract` | text | YES | |
| `primary_author_id` | integer | YES | FK → `profiles(user_id)` |
| `status` | varchar | YES | Values: `SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`, `REVISION_REQ`. ⚠️ DEFAULT is boolean `true` — migration bug |
| `final_decision_date` | timestamp | YES | |
| `created_at` | timestamp | YES | Default: `CURRENT_TIMESTAMP` |
| `submitted_conf` | integer | YES | FK → `conferences(conf_id)` |

---

### `public.paper_coauthors`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `paper_id` | integer | NOT NULL | PK, FK → `papers(paper_id)` |
| `user_id` | integer | NOT NULL | PK, FK → `profiles(user_id)` |
| `author_order` | integer | YES | Display order |

---

### `public.paper_versions`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `version_id` | integer | NOT NULL | PK |
| `paper_id` | integer | YES | FK → `papers(paper_id)` |
| `file_path` | varchar | NOT NULL | Storage path |
| `version_number` | integer | NOT NULL | |
| `is_final` | boolean | YES | Default: `false` |
| `plagiarism_safe` | boolean | YES | Result of AI plagiarism check |
| `format_ok` | boolean | YES | Result of AI format check |
| `upload_date` | timestamp | YES | Default: `CURRENT_TIMESTAMP` |
| `upload_by` | integer | YES | FK → `profiles(user_id)` |
| `display` | boolean | YES | Visible to reviewers flag |

---

### `public.reviewer_assignments`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `assignment_id` | integer | NOT NULL | PK |
| `paper_id` | integer | YES | FK → `papers(paper_id)` |
| `reviewer_id` | integer | YES | FK → `profiles(user_id)` |
| `assigned_by` | integer | YES | FK → `users(user_id)` *(legacy)* |
| `assigned_at` | timestamp | YES | Default: `CURRENT_TIMESTAMP` |

---

### `public.reviews`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `review_id` | integer | NOT NULL | PK |
| `paper_id` | integer | YES | FK → `papers(paper_id)` |
| `reviewer_id` | integer | YES | FK → `profiles(user_id)` |
| `status` | varchar | YES | Default: `'PENDING'`. Values: `PENDING`, `COMPLETED` |
| `recommendation` | varchar | YES | Values: `ACCEPT`, `REJECT`, `WEAK_ACCEPT`, `REVISION` |
| `score` | numeric | YES | |
| `comments` | text | YES | |
| `review_date` | timestamp | YES | Default: `CURRENT_TIMESTAMP` |

---

### `public.paper_decisions`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `decision_id` | integer | NOT NULL | PK |
| `paper_id` | integer | YES | FK → `papers(paper_id)` |
| `decision` | varchar | YES | Values: `ACCEPT`, `REJECT` |
| `decided_by` | integer | YES | FK → `profiles(user_id)` |
| `decision_note` | text | YES | |
| `decided_at` | timestamp | YES | Default: `CURRENT_TIMESTAMP` |

---

### `public.review_ai_metrics`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `metric_id` | integer | NOT NULL | PK |
| `review_id` | integer | YES | FK → `reviews(review_id)` |
| `ai_depth_score` | numeric | YES | |
| `ai_sentiment` | jsonb | YES | Sentiment breakdown |
| `analyzed_at` | timestamp | YES | Default: `CURRENT_TIMESTAMP` |

---

## 5. Tickets & Registrations

### `public.ticket_configs`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `ticket_id` | integer | NOT NULL | PK |
| `ticket_name` | varchar | NOT NULL | |
| `currency` | varchar | YES | Default: `'VND'` |
| `quantity_limit` | integer | YES | |
| `sold_quantity` | integer | YES | Default: `0` |
| `open_time` | timestamp | NOT NULL | |
| `close_time` | timestamp | NOT NULL | |
| `is_active` | boolean | YES | Default: `true` |
| `description` | text | YES | |
| `price` | numeric | YES | |
| `ticket_type` | text | YES | No CHECK constraint in current schema |

---

### `public.ticket_session`
Maps tickets to sessions (which sessions a ticket grants access to).

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `ticket_id` | integer (IDENTITY) | NOT NULL | PK, FK → `ticket_configs(ticket_id)` |
| `session_id` | integer | NOT NULL | PK, FK → `sessions(session_id)` |
| `price` | numeric | YES | Per-session price override |

> ⚠️ `ticket_id` is both IDENTITY and FK — semantically confusing. Composite PK is `(ticket_id, session_id)`.

---

### `public.registrations`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `registration_id` | integer | NOT NULL | PK |
| `user_id` | integer | YES | FK → `profiles(user_id)` |
| `ticket_id` | integer | YES | FK → `ticket_configs(ticket_id)` |
| `created_at` | timestamp | YES | Default: `CURRENT_TIMESTAMP` |

---

### `public.transactions`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `trans_id` | integer | NOT NULL | PK |
| `registration_id` | integer | YES | FK → `registrations(registration_id)` |
| `subscription_id` | integer | YES | FK → `subscriptions(subscription_id)` |
| `payment_gateway` | varchar | YES | Values: `MOMO`, `VNPAY`, `STRIPE`, `PAYOS`, `BANK_TRANSFER` |
| `amount` | numeric | YES | |
| `created_at` | timestamptz | YES | |
| `order_code` | text | YES | Gateway order reference |
| `status` | USER-DEFINED | YES | Custom type `trans_type`. Default: `'PENDING'` |
| `provider_tx_ref` | text | YES | Provider transaction reference |
| `updated_at` | timestamptz | YES | |
| `metadata` | jsonb | YES | Replaces previous `ticket_data` column |
| `order_type` | USER-DEFINED | YES | CHECK: NOT NULL enforced via constraint. Differentiates ticket vs subscription payments |

---

## 6. Subscriptions & Plans

### `public.subscription_plans`
Available subscription tiers configuration.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `plan_id` | integer | NOT NULL | PK |
| `plan_code` | text | NOT NULL | UNIQUE. Identifier used in code |
| `name` | text | NOT NULL | Display name |
| `description` | text | YES | |
| `subscription_type` | USER-DEFINED | NOT NULL | Custom enum type |
| `price` | numeric | NOT NULL | CHECK: `> 0` |
| `monthly_tokens` | integer | NOT NULL | CHECK: `> 0` |
| `is_active` | boolean | NOT NULL | Default: `true` |
| `max_chats_per_day` | integer | YES | Rate limit per plan |
| `features` | jsonb | YES | Default: `{}`. Feature flags per plan |
| `ticket_discount` | numeric | YES | Default: `0.00`. Discount % on ticket purchase. CHECK: `0–100` |
| `created_at` | timestamptz | YES | Default: `now()` |
| `updated_at` | timestamptz | YES | Default: `now()` |

---

### `public.subscriptions`
Active subscriptions per user.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `subscription_id` | integer | NOT NULL | PK |
| `user_id` | integer | NOT NULL | FK → `profiles(user_id)` |
| `subscription_type` | USER-DEFINED | NOT NULL | Custom enum |
| `status` | USER-DEFINED | NOT NULL | Custom type `subscription_status`. Default: `'ACTIVE'` |
| `price_paid` | numeric | NOT NULL | Amount paid at time of subscription |
| `monthly_tokens` | integer | NOT NULL | Token quota per month |
| `tokens_remaining` | integer | NOT NULL | Default: `0`. Current remaining tokens |
| `last_reset_at` | timestamptz | NOT NULL | Default: `now()`. Last token reset timestamp |
| `started_at` | timestamptz | NOT NULL | Default: `now()` |
| `expires_at` | timestamptz | NOT NULL | |
| `canceled_at` | timestamptz | YES | Null if not canceled |
| `created_at` | timestamptz | YES | Default: `now()` |
| `updated_at` | timestamptz | YES | |

---

## 7. Notifications

### `public.notifications`
Master notification record (one per send action).

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `notification_id` | integer | NOT NULL | PK |
| `conf_id` | integer | YES | FK → `conferences(conf_id)`. NULL = system-wide |
| `sender_id` | integer | YES | FK → `profiles(user_id)` |
| `title` | varchar | NOT NULL | |
| `content` | text | NOT NULL | HTML rich-text content |
| `attachments` | jsonb | YES | Default: `[]` |
| `type` | varchar | NOT NULL | Values: `manual`, `template` |
| `target_type` | varchar | NOT NULL | Values: `all`, `specific_users` |
| `target_criteria` | jsonb | YES | Snapshot of targeting config used at send time |
| `created_at` | timestamptz | NOT NULL | Default: `now()` |

---

### `public.user_notifications`
Fan-out table — one row per recipient per notification.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | bigint | NOT NULL | PK |
| `notification_id` | integer | NOT NULL | FK → `notifications(notification_id)` |
| `user_id` | integer | NOT NULL | FK → `profiles(user_id)` |
| `dynamic_title` | varchar | YES | Resolved title after variable substitution |
| `dynamic_content` | text | YES | Resolved content after variable substitution |
| `is_read` | boolean | NOT NULL | Default: `false` |
| `read_at` | timestamptz | YES | |

---

### `public.notification_templates`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `template_id` | integer | NOT NULL | PK |
| `conf_id` | integer | YES | FK → `conferences(conf_id)`. NULL = global template |
| `template_name` | varchar | NOT NULL | |
| `title_template` | varchar | NOT NULL | Supports vars: `[Conference_Name]`, `[Date]` |
| `content_template` | text | NOT NULL | Supports variable placeholders |
| `created_by` | integer | YES | FK → `profiles(user_id)` |
| `created_at` | timestamptz | NOT NULL | Default: `now()` |

---

## 8. CMS & Email

### `public.cms_contents`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `content_id` | integer | NOT NULL | PK |
| `title` | varchar | YES | |
| `body_content` | text | YES | |
| `content_type` | varchar | YES | Values: `CFP`, `AGENDA`, `VENUE`, `POST_EVENT_MAIL` |
| `scheduled_publish_time` | timestamp | YES | |
| `is_published` | boolean | YES | Default: `false` |
| `created_by` | integer | YES | FK → `profiles(user_id)` |

---

### `public.email_templates`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `template_id` | integer | NOT NULL | PK |
| `template_name` | varchar | YES | UNIQUE |
| `subject` | varchar | YES | |
| `body_html` | text | YES | |
| `created_at` | timestamp | YES | Default: `CURRENT_TIMESTAMP` |

---

### `public.email_logs`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `email_log_id` | integer | NOT NULL | PK |
| `recipient_email` | varchar | YES | |
| `email_type` | varchar | YES | |
| `sent_at` | timestamp | YES | Default: `CURRENT_TIMESTAMP` |
| `status` | varchar | YES | Values: `SENT`, `FAILED` |

---

## 9. AI & Embeddings

### `public.paper_chunks`
Chunked paper content for RAG / semantic search.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | integer | NOT NULL | PK |
| `chunk_index` | integer | NOT NULL | Order within document |
| `version_id` | integer | YES | FK → `paper_versions(version_id)` |
| `paper_id` | integer | YES | FK → `papers(paper_id)` |
| `chunk_content` | text | NOT NULL | |
| `chunk_metadata` | jsonb | YES | Default: `{}` |
| `embedding` | USER-DEFINED | YES | pgvector vector |
| `created_at` | timestamp | YES | Default: `CURRENT_TIMESTAMP` |

---

### `public.ai_paper_analysis_logs`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `log_id` | integer | NOT NULL | PK |
| `version_id` | integer | YES | FK → `paper_versions(version_id)` |
| `check_type` | varchar | YES | Values: `FORMAT_CHECK`, `PROOFREADING`, `PLAGIARISM` |
| `result_data` | jsonb | YES | Raw AI output |
| `passed` | boolean | YES | Default: `false` |
| `checked_at` | timestamp | YES | Default: `CURRENT_TIMESTAMP` |

---

## 10. Q&A (Live Session)

### `public.questions`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `question_id` | integer | NOT NULL | PK |
| `session_id` | integer | NOT NULL | FK → `sessions(session_id)` |
| `paper_id` | integer | NOT NULL | FK → `papers(paper_id)` |
| `author_id` | integer | NOT NULL | FK → `users(user_id)` *(legacy)* |
| `content` | text | NOT NULL | |
| `attendee_type` | varchar | YES | Values: `in-person`, `virtual` |
| `status` | varchar | YES | Default: `'asking'`. Values: `pending`, `approved`, `denied`, `done` |
| `answer_type` | varchar | YES | Values: `direct`, `written` |
| `answer_content` | text | YES | |
| `upvotes_count` | integer | YES | Default: `0` |
| `answered_at` | timestamptz | YES | |
| `created_at` | timestamptz | YES | Default: `now()` |

> ⚠️ Default `'asking'` does not match the CHECK constraint values (`pending`, `approved`, `denied`, `done`). Will fail on insert without explicit status.  
> ℹ️ `is_approved` column removed — replaced by `status` values `approved`/`denied`.

---

### `public.question_upvotes`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `upvote_id` | integer | NOT NULL | PK |
| `question_id` | integer | NOT NULL | FK → `questions(question_id)` |
| `user_id` | integer | NOT NULL | FK → `profiles(user_id)` |
| `is_upvoted` | boolean | YES | Toggle flag — allows un-upvoting |
| `created_at` | timestamptz | YES | Default: `now()` |

---

### `public.qa_bans`
Banned users from Q&A participation.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `user_id` | bigint | NOT NULL | PK, FK → `profiles(user_id)` |
| `banned_by` | bigint | YES | FK → `profiles(user_id)` |
| `reason` | text | YES | |
| `created_at` | timestamptz | NOT NULL | Default: `now()` |

---

## 11. Proceedings

### `public.proceedings_configs`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `conf_id` | integer | NOT NULL | PK, FK → `conferences(conf_id)` |
| `proceedings_title` | text | YES | |
| `foreword` | text | YES | |
| `venue_details` | text | YES | |
| `registration_hours` | text | YES | |
| `gala_info` | text | YES | |
| `isbn` | varchar | YES | |
| `publisher` | varchar | YES | Default: `'Springer'` |
| `template_name` | varchar | YES | |
| `pdf_url` | text | YES | Generated proceedings PDF URL |
| `break_info` | text | YES | |
| `internet_info` | text | YES | |
| `room_map_url` | text | YES | |
| `committee_selection` | jsonb | YES | Selected committee members |
| `sponsor_logos` | jsonb | YES | |
| `organizer_logos` | jsonb | YES | |
| `keynotes_json` | jsonb | YES | Default: `[]` |
| `room_assignments` | text | YES | |
| `created_at` | timestamptz | YES | Default: `now()` |

---

## 12. Conversations (AI Chat)

### `public.conversations`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `conv_id` | integer (IDENTITY) | NOT NULL | PK |
| `user_id` | integer | YES | FK → `profiles(user_id)` |
| `title` | varchar | YES | |
| `summary` | varchar | YES | Auto-generated summary |
| `created_at` | timestamptz | NOT NULL | Default: `now()` |

---

### `public.tab_context`
Browser tab state snapshot for context-aware AI responses.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `tab_id` | bigint (IDENTITY) | NOT NULL | PK |
| `current_page` | varchar | YES | Current page route |
| `elements` | json | YES | DOM/UI elements snapshot |
| `created_at` | timestamptz | NOT NULL | Default: `now()` |

---

### `public.messages`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `message_id` | integer (IDENTITY) | NOT NULL | PK |
| `conv_id` | bigint | YES | FK → `conversations(conv_id)` |
| `role` | varchar | YES | Values: `user`, `assistant` |
| `content` | varchar | YES | |
| `parent_id` | integer | YES | For threaded messages |
| `tab_id` | integer | YES | FK → `tab_context(tab_id)` |
| `tokens_count` | bigint | YES | Token usage per message |
| `created_at` | timestamptz | NOT NULL | Default: `now()` |

---

## 13. Known Issues & Tech Debt

| # | Issue | Table | Impact |
|---|---|---|---|
| 1 | Dual user tables | `profiles` vs `users` | `questions.author_id` and `reviewer_assignments.assigned_by` still FK to legacy `users`. Inconsistent identity model. |
| 2 | `papers.status` default type mismatch | `papers` | Column is `varchar` but `DEFAULT true` (boolean). Migration bug — always override explicitly on insert. |
| 3 | `ticket_session.ticket_id` is IDENTITY + FK | `ticket_session` | Semantically confusing — a generated identity column that is also a FK to `ticket_configs`. |
| 4 | Missing FK constraints | `user_conference_roles` | `user_id` and `conference_id` have no enforced FK constraints. |
| 5 | `conv_id` type mismatch | `messages` | `conversations.conv_id` is `integer`; `messages.conv_id` is `bigint`. |
| 6 | `user_roles_temp` has no PK | `user_roles_temp` | Risk of duplicate rows. Migration artifact — do not use. |
| 7 | `questions.status` default mismatch | `questions` | Default is `'asking'` but CHECK only allows `pending`, `approved`, `denied`, `done`. Default will violate CHECK on insert. |
| 8 | `transactions.order_type` nullable with NOT NULL CHECK | `transactions` | `CHECK (order_type IS NOT NULL)` enforced via constraint only, column definition is nullable. Enforcement depends entirely on the CHECK. |

---

## 14. ERD Summary

```
auth.users (uuid)
  └── profiles (user_id int)
        ├── user_roles (uuid FK to auth.users)
        ├── subscriptions → transactions (subscription_id)
        ├── conversations → messages
        ├── papers (primary_author_id)
        ├── paper_coauthors
        ├── paper_versions (upload_by)
        ├── reviewer_assignments (reviewer_id)
        ├── reviews (reviewer_id)
        ├── paper_decisions (decided_by)
        ├── session_chairs
        ├── chair_invitations (invited_by)
        ├── registrations (user_id) → transactions (registration_id)
        ├── user_notifications
        ├── notifications (sender_id)
        ├── notification_templates (created_by)
        ├── agenda_drafts (created_by)
        ├── agenda_comments (commenter_id)
        ├── cms_contents (created_by)
        ├── question_upvotes
        └── qa_bans (user_id + banned_by)

users (legacy)
  ├── user_roles_temp
  ├── reviewer_assignments (assigned_by)
  └── questions (author_id)

conferences (conf_id)
  ├── sessions (conf_id)
  │     ├── session_chairs → profiles
  │     ├── chair_invitations (session_id)
  │     ├── session_papers → papers
  │     ├── ticket_session → ticket_configs
  │     ├── attendences
  │     └── questions
  ├── papers (submitted_conf)
  ├── notifications (conf_id)
  ├── notification_templates (conf_id)
  ├── agenda_drafts (conference_id)
  ├── proceedings_configs (conf_id)
  └── chair_invitations (conf_id)

ticket_configs (ticket_id)
  ├── ticket_session
  └── registrations → transactions (registration_id)

subscription_plans
  └── [referenced by app logic; no FK to subscriptions table]

subscriptions (subscription_id)
  └── transactions (subscription_id)

papers (paper_id)
  ├── paper_versions → ai_paper_analysis_logs
  ├── paper_chunks (paper_id + version_id)
  ├── paper_coauthors
  ├── reviewer_assignments → reviews → review_ai_metrics
  ├── paper_decisions
  ├── session_papers
  └── questions

notifications (notification_id)
  └── user_notifications
```
