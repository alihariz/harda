# HARDA — Thesis vs. Implementation Accuracy Report

**Prepared:** 27 June 2026
**Thesis reviewed:** `docs/HARDA - Tesis.pdf` (60 pp., PSM I design document, last modified 22 Mar 2025)
**Compared against:** the Progress 2 codebase (`backend/`, `frontend/`, `mobile/`, `ml/`) and `CLAUDE.md`

> **Why there are differences.** The thesis is the **PSM I (design-phase)** document. Chapter 5 (“Implementation and Testing”) is still a stub — both Chapter 5 and Chapter 6 begin on page 33. Since it was written, the project advanced through **Progress 2**, which added a field-crew workflow, a 9th database table, a cross-platform mobile app, and several other changes. Most discrepancies below are simply the design document not yet reflecting decisions made after it was submitted. None of them indicate a defect in the build — they are edits to make the **written thesis** match the **system you actually built** before the PSM II submission.

---

## Summary of findings

| # | Area | Thesis says | Implementation has | Severity |
|---|------|-------------|--------------------|----------|
| 1 | Mobile platform | Android Studio + Java/Kotlin (Android only) | React Native + Expo (TypeScript), iOS + Android | **Major** |
| 2 | Database tables | "a total of 8 tables" | **9 tables** (added `teams`) | **Major** |
| 3 | `role` attribute | On the **Admin** entity | On the **`users`** table (`'user'`/`'crew'`) | **Major** |
| 4 | Actors / use cases | 2 actors (User, Admin), 12 use cases | + **Field Crew** actor and crew use cases | **Major** |
| 5 | New schema columns | Not present | Progress 2 columns on `users`, `hazard_reports`, `hazard_images` | Moderate |
| 6 | Location attributes | `address`, `city` | `address_name`, `state` (no `city`) | Minor |
| 7 | Field widths | `status_name varchar(30)`, `description varchar(200)` | `varchar(50)`, `varchar(255)` | Minor |
| 8 | Backend framework | "Flask **or Django**" | **Flask** specifically | Minor |
| 9 | YOLO accuracy claim | "> 85% for trained hazard types" | Threshold is 0.70; current weights = pothole only | Minor (verify) |
| 10 | Project scope wording | "mobile (Android)" | Cross-platform (Android **and iOS**) | Minor |

**Good news:** two requirements the thesis lists but the system previously did **not** meet — **NFR8 (API rate limiting)** and **NFR14 (English + Malay)** — are now **implemented** (see "Requirements now satisfied"). The thesis text for these is already correct; the implementation has caught up to it.

---

## Detailed findings

### 1. Mobile platform — Android/Kotlin → React Native + Expo *(Major)*

The thesis repeatedly specifies a native Android stack:

- §3.4 Tools (≈ p.20): *"Android Studio: IDE for Android mobile app development"* and *"Java/Kotlin: Programming languages for Android development."*
- §1.5 Project Scope: *"Development of mobile (Android) and web applications…"*
- §2.x Literature: *"…Android Studio for mobile, provide responsive… interfaces."*

**Implementation:** the mobile app is **React Native + Expo (SDK 54) in TypeScript**, file-based routing via `expo-router`, running on **both iOS and Android** (`mobile/`). There is no Kotlin/Android Studio project.

**Recommended thesis edits**
- Replace "Android Studio / Java / Kotlin" in the tools list with **"React Native + Expo (TypeScript); Expo Router; runs on iOS and Android."**
- §1.5 scope: change "mobile (Android)" → **"cross-platform mobile (Android and iOS)."**
- Any literature-review sentence implying a native-Android build should be softened to "a cross-platform framework (React Native)."

### 2. Database table count — 8 → 9 *(Major)*

§4.3 (≈ p.28): *"Within the system, a total of **8 tables** have been constructed, including User, Location, HazardStatus, HazardType, Admin, HazardReport, SystemReport and HazardImage."*

**Implementation:** Progress 2 added a 9th table, **`teams`** (`team_id`, `team_name`, `lead_admin_id` → admins, `region`, `description`, `created_date`, `is_active`), to support admin → field-crew assignment.

**Recommended thesis edits**
- Change "8 tables" → **"9 tables"** and add **`Team`** to the list.
- Regenerate the **ERD (Figure 4.3)** to include the `Team` entity and its relationships: `users.team_id → teams`, `hazard_reports.assigned_team_id → teams`, `teams.lead_admin_id → admins`.

### 3. `role` attribute is on the wrong entity *(Major)*

In the thesis ERD, **`role: varchar(30)`** appears on the **Admin** entity, and the **User** entity has no role.

**Implementation:** the **`users`** table carries **`role varchar(20)` (`'user'` | `'crew'`, default `'user'`)** and **`team_id`**. Admins are a separate table; the admin role is conveyed through the JWT claim rather than a `role` column on `admins`.

**Recommended thesis edit:** move the `role` attribute onto the **User** entity (values `user`/`crew`) and add **`team_id` (FK → Team)**; remove `role` from Admin (or note that the admin role is implicit/JWT-based).

### 4. Use case model omits the Field-Crew actor *(Major)*

§4.2 / Figure 4.2.1 shows **two actors (User, Admin)** and **12 use cases (UC001–UC012)**.

**Implementation:** Progress 2 introduced a **Field Crew** role with its own flows that aren't represented:
- Admin **assigns a team** to a verified report (`PUT /admin/reports/:id/assign`; status → `in_progress`).
- Crew see a team **assignment inbox** (`GET /crew/assignments`), open an assignment, navigate to it, and **upload an "after" photo** (`POST /reports/:id/after-photo`; status → `resolved`).
- Resolved reports flow into an **audit archive** with before/after photos (`GET /admin/archive`, CSV export).

**Recommended thesis edits**
- Add a **Field Crew** actor to the use case diagram.
- Add use cases (or extensions) for: *Assign Team*, *View Assignments*, *Resolve with After-Photo*, *View/Export Archive*. These align with the stakeholder feedback from **Sufie Silat (ex-Roadcare site supervisor)** — Roadcare's loss of report history after resolution is the gap HARDA's retained before/after archive addresses. Consider noting this stakeholder explicitly (the thesis currently cites a generic "Town Developer" stakeholder in §1.4).

### 5. New Progress 2 schema columns are not documented *(Moderate)*

Beyond the `teams` table, these columns were added and should appear in the ERD / data dictionary:

- **`users`**: `role`, `team_id`
- **`hazard_reports`**: `assigned_team_id` (FK → teams), `assigned_at`, `detection_confidence` (`NUMERIC(5,4)`), `detection_low_confidence` (boolean)
- **`hazard_images`**: `is_resolution_photo` (boolean), `uploaded_by_user_id` (FK → users)

### 6. Location attribute naming *(Minor)*

Thesis `Location` lists **`address`** and **`city`**. Implementation uses **`address_name varchar(255)`**, has **`state varchar(50)`**, and has **no `city` column** (columns: `latitude, longitude, address_name, state, postal_code, country, accuracy`). Update the ERD attribute names to match.

### 7. Field-width mismatches *(Minor)*

- `HazardStatus.status_name`: thesis `varchar(30)` → implementation **`varchar(50)`**.
- `HazardType.description`: thesis `varchar(200)` → implementation **`varchar(255)`**.
- `User.phone_number`: thesis `varchar(15)` → implementation **`varchar(20)`**.

Harmonise the ERD/data-dictionary widths with the models (or vice-versa) so the SDD matches the code exactly.

### 8. Backend framework — "Flask or Django" → Flask *(Minor)*

§3.4 and §2.x hedge with *"Flask or Django."* The build is **Flask** (Flask 3, Flask-SQLAlchemy, Flask-Migrate, Flask-JWT-Extended, Flask-Limiter). State Flask definitively in the implementation chapter.

### 9. YOLO accuracy claim *(Minor — verify before submission)*

§3.5.1 states *"YOLO detection accuracy: > 85% for trained hazard types."* The system's operating **confidence threshold is 0.70** (`YOLO_CONFIDENCE_THRESHOLD=0.70`), and the current shipped weights are **pothole-only** (`ml/weights/pothole_yolov8s.pt`); the 3-class fine-tune (pothole / faded_lane_marking / uneven_surface) is prepared in `ml/harda_finetune.ipynb` but not yet trained. Make sure any accuracy figure quoted in Chapter 5 reflects **measured** results on your actual validation set, not the 85% target, and clarify the single-class-vs-three-class status.

### 10. Project scope wording *(Minor)*

§1.5 says the system targets *"mobile (Android)."* Since the app is cross-platform, broaden to **"Android and iOS."**

---

## Requirements now satisfied (thesis was already correct)

The thesis §4.2.2 lists these — they were specified correctly but were **not implemented** until the current sprint, which closed the gap:

- **NFR8 — API rate limiting to prevent abuse.** Now implemented with **Flask-Limiter**: configurable global limit plus tighter per-route limits on auth endpoints (default 10/min) and the YOLO `/detection/analyse` endpoint (30/min), env-tunable via `RATELIMIT_*`. Returns HTTP 429 when exceeded; covered by an automated test.
- **NFR14 — Support for multiple languages (English, Malay).** Now implemented end-to-end: a full **EN/BM i18n layer** with a language switcher across the **web app** (all public + admin pages) and the **mobile app** (all user + crew screens), with the choice persisted.

When you write Chapter 5, you can now legitimately mark **NFR8 and NFR14 as met**, with the web/mobile language toggle and the rate-limit test as evidence.

---

## What is accurate (no change needed)

The following thesis claims match the implementation and need no correction:

- Core detection approach: **YOLO (Ultralytics)**, pretrained + fine-tuned, multi-hazard, < 5 s target, 0.70 confidence threshold.
- **Google Maps API** for geotagging and visualisation; EXIF-first GPS with device fallback.
- **PostgreSQL** as the primary database (12+).
- **React.js** web application (public map + admin dashboard).
- **Flask** REST backend; **JWT** auth; **bcrypt** password hashing.
- The **three-tier architecture** (presentation / domain / data) described in §4.3.
- The **core 12 use cases (UC001–UC012)** and the functional requirements table (F1–F5) — still valid; the crew workflow is an **addition**, not a replacement.
- Performance NFRs (NFR1–NFR5), security NFRs (NFR6, NFR7, NFR9, NFR10), and usability NFRs (NFR11–NFR13, NFR15) remain consistent with the design.

---

## Suggested next actions

1. **Regenerate the ERD (Figure 4.3)** with 9 tables, the `Team` entity, corrected `role`/`team_id` placement, and the Progress 2 columns.
2. **Update the use case diagram (Figure 4.2.1)** to add the Field-Crew actor and crew use cases.
3. **Fix the tools/scope text** (items 1, 8, 10) to React Native + Expo, Flask, and cross-platform.
4. **Write Chapter 5** from the real build — including NFR8 and NFR14 as now-met, and **measured** YOLO accuracy rather than the 85% target.
5. **Reconcile field widths and Location attribute names** (items 6, 7) between the SDD and the models.

*This report compares the written thesis to the current code; it does not modify the thesis PDF (the source document lives outside this repo). Apply the edits above in your thesis source, then re-export.*
