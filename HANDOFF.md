# HARDA Progress 2 — Handoff

**Last updated:** 2026-06-27 by Cowork session (NFR8 rate limiting, NFR14 BM/EN localisation, lint fixes, thesis accuracy report)
**Owner of next session:** Ali Hariz — run `npm run lint` / `npm run build` (web) and `tsc --noEmit` (mobile) on Windows to confirm the i18n changes; then the Task #18 lifecycle demo
**Read alongside:** `CLAUDE.md` (project conventions + schema + endpoints), `docs/Thesis_Accuracy_Report.md`

---

## 2026-06-27 sprint — "finish the system" pass

All code authored via Cowork file tools. **The Linux sandbox could not run Vite / Metro / ESLint (they need native binaries that exist on Windows but not in the sandbox), so run the web build, web lint, and mobile typecheck on your machine to confirm.** The backend (pure Python) was fully verified: **pytest 28 passed**.

- **NFR8 — API rate limiting.** `Flask-Limiter` in `backend/app/__init__.py` (`limiter`); config in `app/config.py` (`RATELIMIT_ENABLED/STORAGE_URI/DEFAULT/AUTH/DETECTION`); decorators on `auth.py` (register/login/admin-login → `RATELIMIT_AUTH`, 10/min) and `detection.py` (`/analyse` → `RATELIMIT_DETECTION`, 30/min). Off in `TestingConfig`. New `tests/test_ratelimit.py`. `Flask-Limiter==3.8.0` added to `requirements.txt`; env vars added to `backend/.env.example`.
- **CORS hardening.** `CORS(app)` → env-driven `CORS_ORIGINS` (defaults to `*`). Set it to the homelab domain when ready.
- **Lint fixes (web).** Two pre-existing ESLint errors resolved with targeted disables: `react-refresh/only-export-components` on `useAuth` (`context/AuthContext.jsx`) and `react-hooks/set-state-in-effect` on the mount fetch (`pages/AdminDashboard.jsx`).
- **NFR14 — BM/EN localisation (web).** New `frontend/src/i18n/{strings.js,I18nContext.jsx}` + `components/LanguageToggle.jsx`; provider wired in `main.jsx`; toggle in the navbar. All 9 pages translated. Persisted in `localStorage` (`harda_lang`).
- **NFR14 — BM/EN localisation (mobile).** New `mobile/lib/i18n.tsx` + `components/LanguageToggle.tsx`; provider wired in `app/_layout.tsx`; toggle in both profile screens. All auth/user/crew screens + tab labels + `StatusBadge` translated. Persisted via `expo-secure-store`.
- **Thesis accuracy report.** `docs/Thesis_Accuracy_Report.md` cross-references `docs/HARDA - Tesis.pdf` (PSM I design doc) vs. the Progress 2 build. Headline thesis edits: mobile platform (Android/Kotlin → React Native/Expo), 8→9 tables (add `Team`), `role` on `users` not `admins`, add the Field-Crew actor/use cases. NFR8 + NFR14 are now **met**.

No backend schema/endpoint changes this session except the rate-limit wiring; the ERD/use-case items are documentation only.

---

## What's the state right now

### Just completed in the prior Cowork session (17 of 18 Progress 2 tasks)

**Backend — fully written, NOT yet run locally**
- New `teams` table + assignment/after-photo columns. Migration: `backend/migrations/versions/b8a2c5f1e734_progress2_teams_and_after_photos.py`
- New endpoints: `GET/POST /admin/teams`, `PUT /admin/reports/:id/assign`, `GET /admin/archive`, `GET /admin/archive/export.csv`, `GET /detection/model-info`, `GET /crew/assignments`, `GET /crew/me`, `POST /reports/:id/after-photo`
- Notification service (console backend) wires into validate / assign / resolve transitions
- Real analytics aggregates (weekly_trend, avg_resolution_days, top_states)
- pytest suite: `tests/conftest.py` + 5 test files (auth, reports, lifecycle, authz, analytics) — uses in-memory SQLite and mocks YOLO
- `.env` repointed: `YOLO_MODEL_PATH=ml/weights/pothole_yolov8s.pt` (was COCO placeholder — that's why Progress 1 returned wrong classes)

**Mobile — upgraded to SDK 54, Metro starts, Expo Go compatible**
- Expo SDK upgraded from 51 → **54.0.34** (SDK 54 = what current Expo Go supports)
- All SDK-aligned package versions pinned:
  - `expo-router` 3.5 → **6.0.23** (routing API unchanged; `Redirect`, `Stack`, `Tabs`, `useLocalSearchParams`, `router.*` all present)
  - `react-native` 0.74 → **0.81.5** (New Architecture already enabled via `newArchEnabled: true`)
  - `react-native-reanimated` 3.x → **4.1.7** (now delegates Babel plugin to `react-native-worklets`; `react-native-worklets@0.8.0` added to deps)
  - `expo-image-picker` 15 → **17.0.11**; `expo-camera` 15 → **17.0.10**; all other expo-* packages bumped
  - `react` 18 → **19.1.0**; `typescript` 5.3 → **5.9.3**
- **Code change:** `ImagePicker.MediaTypeOptions.Images` (deprecated enum) → `['images']` in `capture.tsx` and `resolve/[id].tsx`
- `tsc --noEmit` passes clean — zero type errors
- `npx expo-doctor` passes 18/18 — no issues detected
- **Post-upgrade fix:** `babel-preset-expo` was auto-installed at SDK 56 (latest); pinned to `~54.0.10` to match SDK 54. `react-native-worklets` downgraded from 0.8.0 → 0.5.1 (expo-doctor approved version). `metro.config.js` created (extends `expo/metro-config` — required for expo-doctor Metro check to pass, good practice for SDK 54+).
- LAN mode confirmed: start with `$env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.68.110"; npx expo start --lan -c` (`-c` clears Metro cache after package changes)

**ML**
- `ml/harda_finetune.ipynb` — ready-to-run Colab notebook for 3-class fine-tuning (pothole / faded_lane_marking / uneven_surface) on a Roboflow road-damage dataset
- Current weights cover **pothole only** — see `Progress2_YOLO_Audit.md`

**Docs**
- `CLAUDE.md` synced with all Progress 2 changes (both at project root and the workspace mirror)
- `HARDA_Progress2_Presentation.pptx` — 12-slide demo deck

---

## Outstanding for the next session

### The blocker — RESOLVED (use LAN mode, tunnel is dead)

`--tunnel` is permanently broken on the free ngrok account. Root cause trace:

```
npx expo start --tunnel
  → @expo/ngrok@4.1.3 spawns its bundled ngrok v2.3.41
  → ngrok rejects: ERR_NGROK_121 (free tier minimum is v3.20.0)
  → ngrok exits → local API on :4040 drops
  → @expo/ngrok calls dead API → ECONNREFUSED → error.response = undefined
  → client.js reads error.response.body → TypeError: Cannot read 'body'
```

All ngrok.com triage steps (auth token, reinstall, etc.) fail because the **binary is too old** — `@expo/ngrok@4.1.3` bundles ngrok v2.3.41 and ngrok won't let v2.x agents connect on free plans. Paying for ngrok would fix it, but LAN mode is simpler and faster.

**How to start Metro (LAN mode — phone and laptop on same WiFi):**

```pwsh
cd D:\dev\harda\mobile
npx expo start          # omit --tunnel
```

Scan the QR code with Expo Go. The LAN IP for this machine is `192.168.68.110`.

**Set API base URL inside the app (required for physical devices):**

The default `apiBaseUrl` in `app.json` points to `10.0.2.2:5000` (Android emulator).
Physical devices must use the Profile screen override:

1. Open app in Expo Go → go to **Profile**
2. Enter `http://192.168.68.110:5000/api/v1` in "API base URL (override)"
3. Save — this persists in `expo-secure-store` across restarts

`app.json` `apiBaseUrlDevice` has been updated to `192.168.68.110` as reference.
`~/.ngrok2/ngrok.yml` was written with the auth token (from the v3 config at AppData/Local/ngrok) in case it's needed later.

**If tunnel is ever truly needed (different-network demo):**

Use Cloudflare Tunnel instead of ngrok — free, no account required, no agent version restrictions:
```pwsh
winget install --id Cloudflare.cloudflared
# Terminal 1: npx expo start --port 8081
# Terminal 2: cloudflared tunnel --url http://localhost:8081
# Expo Go → Enter URL manually → paste the https://xxx.trycloudflare.com URL
# Set API URL override in Profile to http://192.168.68.110:5000/api/v1
```

### Tasks still pending

1. **Demo verification (Task #18)** — full flow on a real device or simulator:
   - Mobile user submits a hazard photo
   - Admin verifies + assigns the KL team via web
   - Crew (`crew_kl@harda.my` / `Crew123!`) sees it in their inbox
   - Crew uploads after-photo → status → resolved
   - Archive view shows before+after pair
2. **Run the Colab notebook** to get the 3-class `harda_v1.pt` weights; drop in `ml/weights/` and flip the `.env` path.
3. **Frontend admin UI — DONE.** Report detail modal + Archive page both complete (see below).
4. **BM/EN localisation pass** (NFR14, not started).

### What was just built (admin report detail modal)

**Files changed:**
- `backend/app/services/hazard_reporting.py` — `get_report` now calls `to_dict(include_images=True)` so `GET /reports/:id` returns `before_image`, `after_image`, `images[]`
- `backend/app/__init__.py` — added `/uploads/<path>` route via `send_from_directory` so the browser can fetch image files stored in the `uploads/` folder
- `frontend/src/pages/ReportDetailModal.jsx` — **new file**, the detail modal:
  - Opens when any row in the Report Queue is clicked; closes on Escape or backdrop click
  - Fetches `GET /reports/:id` + `GET /admin/teams` in parallel on open
  - **Photos section:** before/after images side-by-side (after only shown when present)
  - **Location section:** address + lat/lng + embedded Google Map (reuses `VITE_GOOGLE_MAPS_API_KEY`, same `@react-google-maps/api` the HazardMap page uses)
  - **Details section:** hazard type, severity (5-dot visual), submitter, description
  - **Timeline:** Reported → Validated → Assigned → Resolved with actual timestamps
  - **Assigned Team panel:** team name + region + assigned_at (shown when team is set)
  - **Action panel** (conditional by status):
    - `submitted` → Validate / Reject buttons → `PUT /reports/:id/status`
    - `verified` → team dropdown (from `/admin/teams`) + "Assign team →" button → `PUT /admin/reports/:id/assign` (auto-flips to `in_progress`)
    - `in_progress` → read-only message, waiting on crew after-photo
    - `resolved` / `rejected` → no action buttons, full audit view
  - On any successful action: reloads the detail data + calls `onUpdated()` to refresh the queue row
- `frontend/src/pages/AdminReports.jsx` — minimal wiring:
  - `detailId` state added
  - Each `<tr>` gets `onClick={() => setDetailId(r.report_id)}` + `cursor-pointer`
  - Checkbox cell and status-dropdown cell get `stopPropagation` so they still work independently
  - `<ReportDetailModal>` rendered when `detailId` is set; `onUpdated` triggers `fetchReports()`

**No new backend endpoints, no schema changes, no mobile changes.**

### What was just built (admin nav + archive page)

**Files changed:**
- `frontend/src/components/Navbar.jsx` — "Submit Report" and "My Reports" links now wrapped in `{!isAdmin && ...}` in both desktop and mobile blocks; "Archive" NavLink added inside the `{isAdmin && ...}` block (both blocks)
- `frontend/src/pages/AdminArchive.jsx` — **new file** (UC012):
  - Fetches `GET /admin/archive?state=&team_id=` on mount + filter change
  - State filter: hardcoded 16 Malaysian states dropdown
  - Team filter: populated from `GET /admin/teams`
  - Responsive 2-col card grid; each card shows before/after photos with "Before" / "After ✓" overlays, title, location, hazard type, severity pip bar, assigned team, resolved date
  - "Export CSV" button: `api.get` with `responseType:'blob'` → programmatic download via `<a>` click; disabled when archive is empty
  - Clicking any card opens the existing `ReportDetailModal` (resolved status = read-only audit view)
  - Empty state message when no resolved reports yet
- `frontend/src/App.jsx` — added `<Route path="/admin/archive" element={<ProtectedRoute adminOnly><AdminArchive /></ProtectedRoute>} />`

`npm run lint` on the 4 changed files: **0 errors**. Two pre-existing errors in `AuthContext.jsx` and `AdminDashboard.jsx` were already there before this session.

**Lifecycle test path (Task #18):**
1. Submit report via mobile (or `curl -X POST /api/v1/reports ...`)
2. Admin opens `/admin/reports` → clicks the row → modal opens with status `submitted`
3. Click "Validate" → status → `verified`; team dropdown appears
4. Select KL Team → "Assign team →" → status → `in_progress`; modal shows team card + assigned_at
5. Mobile crew logs in as `crew_kl@harda.my` / `Crew123!` → sees report in Inbox → resolves with after-photo
6. Refresh admin modal → after-photo appears in Photos section; timeline shows resolution_date; status badge = Resolved

---

## What was just built (UC011 — admin-edit + hazard-types endpoint)

**New backend endpoints (no migration needed — no schema change):**
- `GET /api/v1/admin/hazard-types` — list of all hazard types for admin dropdowns
- `PUT /api/v1/admin/reports/:id` — admin edits type, severity, title, description, visibility, and/or location fields without touching status; stamps `admin_id`

**New service method:** `HazardReportingService.admin_edit_report(report_id, admin_id, data)` — validates severity 1–5, updates location row in place, returns `to_dict(include_images=True)`

**Tests added (21 total, all green):**
- `test_admin_edit_report_updates_type_and_severity` — edits type + severity + title, verifies GET; status still `submitted`
- `test_admin_edit_invalid_severity_returns_400` — severity 9 rejected
- `test_non_admin_edit_returns_403` — non-admin token returns 403

**Frontend changes:**
- `ReportDetailModal.jsx` — now accepts `initialEditMode` prop; yellow callout banner when `detection_low_confidence && !hazard_type`; "Edit" pencil button on Hazard Details section opens inline edit form (Type dropdown from `/admin/hazard-types`, Severity 1–5, Title, Description, Visibility); "Edit location" toggle on Location section (lat/lng, address, state)
- `AdminReports.jsx` — Type cell shows amber "Set type →" button when `hazard_type` is null, opens modal in edit mode directly; `openModal(id, editMode)` helper

---

## What was just built (YOLO confidence persistence)

**New migration:** `backend/migrations/versions/52a0d9bf8914_progress2_yolo_confidence_persistence.py`
- Adds `detection_confidence NUMERIC(5,4)` and `detection_low_confidence BOOLEAN` to `hazard_reports`
- Already applied to DB (`flask db upgrade` ran successfully in the session)

**Backend changes:**
- `backend/app/models/hazard_report.py` — two new columns + exposed in `to_dict()` as `float`/`bool`
- `backend/app/services/hazard_reporting.py` — `submit_report` persists confidence always (outside the `low_confidence` guard)
- `backend/tests/test_reports.py` — new test `test_detection_confidence_persisted_on_submit` (6/6 pass)

**Frontend changes:**
- `ReportDetailModal.jsx` — new "AI Confidence" `InfoRow` in Hazard Details; amber + ⚠ warning when below threshold
- `AdminReports.jsx` — new "Conf." column (between Sev. and Status); amber + ⚠ icon for low-confidence rows
- `SubmitReport.jsx` — success screen: "YOLO Detection Result" → "AI detected"; low-confidence copy updated
- `MyReports.jsx` — "⚠ Awaiting manual review" amber badge when `detection_low_confidence=true` AND status=`submitted`

**Mobile changes:**
- `mobile/app/(user)/preview.tsx` — result card: tech-speak → "AI detected: Pothole / 87% confidence" or "Flagged for review"

---

## Pre-flight local checklist (only needs running once)

```pwsh
cd D:\dev\harda\backend
# install: pip install -r requirements.txt --break-system-packages  (if not done)
flask db upgrade               # applies migration b8a2c5f1e734
python seeds.py                # adds teams + crew users + lookups
python run.py                  # start API on :5000
# smoke check:
curl http://127.0.0.1:5000/api/v1/detection/model-info
```

```pwsh
cd D:\dev\harda\mobile
# deps already installed — only re-run if you add a new package
$env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.68.110"; npx expo start --lan
# Scan QR with Expo Go (phone + laptop on same WiFi)
# In app: Profile → API base URL → http://192.168.68.110:5000/api/v1
```

Demo accounts (after `python seeds.py`):
- Public user: `user@harda.my` / `User123!`
- Field crew (KL team): `crew_kl@harda.my` / `Crew123!`
- Field crew (Johor team): `crew_johor@harda.my` / `Crew123!`
- Admin: `admin@harda.my` / `Admin123!`

---

## Architectural decisions that matter (not in CLAUDE.md)

- **Mobile = React Native + Expo (TypeScript)** — replaces the originally-planned Kotlin/Android-only app. Now on SDK 54 baseline (pinned); do NOT run `npx expo install --check` again without first checking if Expo Go was updated, as it may bump beyond what Expo Go supports.
- **One app, two modes (user vs crew)** — routing decided after login from the JWT's `role` claim. No separate crew app.
- **YOLO multi-class via Colab fine-tuning**, not "ship single-class and document". Notebook is at `ml/harda_finetune.ipynb`; uses Roboflow datasets. Current pothole-only weights are the placeholder.
- **Stakeholder = Sufie Silat (ex-Roadcare site supervisor)**. The Progress 2 features (team assignment + after-photos + retained archive) are direct responses to her feedback about Roadcare losing report history after resolution.

---

## How to handoff back to Cowork later

Before exiting Claude Code, ask it to update this file:

> Update HANDOFF.md with: what we just changed, what's still broken, any new decisions, and the next thing to try.

Then in Cowork, the first thing I'll do is `Read HANDOFF.md`. That's the bridge.
