# HARDA – Hazard Assessment Road Detection Application
## Claude Code Project Brief

**Project:** Final Year Project (PSM II) — Universiti Teknologi Malaysia  
**Student:** Ali Hariz Bin Anuari (A22EC0037)  
**Supervisor:** Dr. Muhammad Khatibsyarbini Bin Abd Rahim  
**Degree:** Bachelor of Computer Science (Software Engineering)  
**Deadline:** June 2026  

---

## What This System Does

HARDA automates road hazard detection and reporting in Malaysia. Users submit images of road hazards (potholes, faded lane markings, uneven surfaces) via mobile or web. The system runs YOLO inference on the image, geotags the hazard using GPS metadata from the image EXIF or device location, and plots it on an interactive Google Maps dashboard. Local authorities use an admin panel to verify, prioritise, and update report statuses.

---

## Monorepo Structure

```
harda/
├── backend/        # Flask REST API + PostgreSQL (primary development target)
├── frontend/       # React.js web app (user-facing map + admin dashboard)
├── mobile/         # Android (Kotlin) app
├── ml/             # YOLO inference service (Python)
└── docs/           # Thesis PDF and supporting documents
```

---

## Tech Stack

### Backend
- **Language:** Python 3.8+
- **Framework:** Flask 2.0+
- **ORM:** SQLAlchemy
- **Database:** PostgreSQL 12+
- **Auth:** JWT tokens, bcrypt password hashing
- **Image storage:** Local filesystem (dev), Google Cloud Storage (prod)

### ML / Detection
- **Model:** YOLOv8 via Ultralytics library (pre-trained, fine-tuned on road hazard dataset — NOT training from scratch)
- **Strategy:** Use `ultralytics` pip package; load pretrained weights, fine-tune on a road hazard dataset (Roboflow or similar public dataset for potholes/lane markings)
- **Libraries:** OpenCV 4.5+, NumPy, Pillow (for EXIF GPS extraction)
- **Inference target:** < 5 seconds per image, minimum 70% confidence threshold

### Web Frontend
- **Framework:** React.js (Vite)
- **Styling:** Tailwind CSS
- **Maps:** Google Maps JavaScript API (`@react-google-maps/api`)
- **HTTP client:** Axios
- **Two interfaces:** Public-facing (hazard map + submit report) and Admin dashboard

### Mobile (Android)
- **Language:** Kotlin
- **IDE:** Android Studio
- **Min SDK:** API level 26 (Android 8.0+)
- **HTTP:** Retrofit2
- **Maps:** Google Maps SDK for Android
- **Camera:** CameraX API

### APIs & Services
- **Google Maps API** — geospatial mapping, marker clustering, geocoding
- **RESTful API** — JSON, all communication between frontend/mobile and backend

---

## Database Schema (8 Tables — PostgreSQL)

### `users`
| Column | Type | Notes |
|---|---|---|
| user_id | integer PK | |
| username | varchar(50) | unique |
| email | varchar(100) | unique |
| password_hash | varchar(255) | bcrypt |
| first_name | varchar(50) | |
| last_name | varchar(50) | |
| phone_number | varchar(20) | |
| created_date | timestamp | |
| last_login | timestamp | |
| is_active | boolean | default true |

### `admins`
| Column | Type | Notes |
|---|---|---|
| admin_id | integer PK | |
| username | varchar(50) | |
| email | varchar(100) | |
| password_hash | varchar(255) | |
| first_name | varchar(50) | |
| last_name | varchar(50) | |
| created_date | timestamp | |
| last_login | timestamp | |
| is_active | boolean | |

### `locations`
| Column | Type | Notes |
|---|---|---|
| location_id | integer PK | |
| latitude | decimal(10,8) | |
| longitude | decimal(11,8) | |
| address_name | varchar(255) | |
| state | varchar(50) | |
| postal_code | varchar(10) | |
| country | varchar(50) | default 'Malaysia' |
| accuracy | decimal(8,2) | metres |

### `hazard_types`
| Column | Type | Notes |
|---|---|---|
| hazard_type_id | integer PK | |
| type_name | varchar(50) | e.g. 'pothole', 'faded_lane', 'uneven_surface' |
| description | varchar(255) | |
| icon_path | varchar(255) | |
| default_severity | integer | 1-5 |

### `hazard_statuses`
| Column | Type | Notes |
|---|---|---|
| status_id | integer PK | |
| status_name | varchar(50) | 'submitted', 'verified', 'in_progress', 'resolved', 'rejected' |
| description | varchar(255) | |

### `hazard_reports`
| Column | Type | Notes |
|---|---|---|
| report_id | integer PK | |
| user_id | integer FK → users | nullable (guest submissions) |
| location_id | integer FK → locations | |
| hazard_type_id | integer FK → hazard_types | set by YOLO detection |
| status_id | integer FK → hazard_statuses | default 'submitted' |
| admin_id | integer FK → admins | nullable, set on validation |
| title | varchar(100) | |
| description | text | optional user description |
| severity_score | integer | 1-5, from YOLO confidence |
| report_date | timestamp | |
| validation_date | timestamp | |
| resolution_date | timestamp | |
| is_public | boolean | default true |

### `hazard_images`
| Column | Type | Notes |
|---|---|---|
| image_id | integer PK | |
| report_id | integer FK → hazard_reports | |
| file_path | varchar(255) | |
| file_name | varchar(255) | |
| file_size | integer | bytes |
| mime_type | varchar(50) | 'image/jpeg', 'image/png' |
| upload_date | timestamp | |
| is_primary | boolean | |

### `system_reports`
| Column | Type | Notes |
|---|---|---|
| report_id | integer PK | |
| generated_by | integer FK → admins | |
| report_type | varchar(80) | |
| generated_date | timestamp | |
| content | text | JSON analytics payload |
| start_date | date | |
| end_date | date | |
| file_path | varchar(255) | exported file |

---

## REST API Endpoints

All endpoints prefixed with `/api/v1/`.

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | User registration |
| POST | `/auth/login` | User login → returns JWT |
| POST | `/auth/admin/login` | Admin login → returns JWT |
| POST | `/auth/logout` | Invalidate token |
| POST | `/auth/refresh` | Refresh JWT |

### Reports (UC001, UC004, UC005)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/reports` | Submit hazard report with image |
| GET | `/reports` | List reports (filterable by status, type, location) |
| GET | `/reports/:id` | Get report details including detection result |
| GET | `/reports/user/:userId` | User's own submission history |
| PUT | `/reports/:id/status` | Admin: update report status |
| PUT | `/reports/:id/validate` | Admin: validate and set hazard type |
| DELETE | `/reports/:id` | Admin: delete report |
| GET | `/reports/map` | Returns all public verified reports with lat/lng for map rendering |

### Detection (UC001, UC002)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/detection/analyse` | Run YOLO on uploaded image, returns hazard type + confidence + bounding boxes |

### Locations (UC002, UC003)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/locations/hazards` | All verified hazard locations for map markers |
| GET | `/locations/hotspots` | Clustered hazard locations by area |

### Users (UC006, UC007)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/users/:id` | Get user profile |
| PUT | `/users/:id` | Update profile |
| GET | `/admin/users` | Admin: list all users |
| PUT | `/admin/users/:id/status` | Admin: activate/deactivate user |

### Admin / Analytics (UC008–UC012)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/reports` | All reports with full metadata, filterable |
| GET | `/admin/reports/pending` | Reports awaiting validation |
| POST | `/admin/reports/bulk-action` | Bulk validate/reject/update |
| GET | `/admin/analytics/summary` | Dashboard stats (totals, trends) |
| POST | `/admin/system-reports` | Generate analytical report |
| GET | `/admin/system-reports` | List generated reports |

---

## Use Cases (12 total)

### Hazard Reporting Module
- **UC001** – Upload Hazard Image: user submits image → triggers YOLO detection
- **UC002** – Auto Capture Geolocation: extract GPS from EXIF metadata or use device GPS
- **UC003** – View Hazard Map: interactive Google Maps with verified hazard markers
- **UC004** – Check Hazard Details: detailed view of specific hazard with image and status
- **UC005** – Check Hazard Status: user tracks their submission progress

### User Management Module
- **UC006** – Manage Personal Account: user updates profile, views history
- **UC007** – Manage User Accounts (Admin): admin manages all user accounts/permissions

### Hazard Report Management Module
- **UC008** – Review Hazard Reports: admin validates submitted reports for accuracy
- **UC009** – Validate Hazard Reports: cross-reference YOLO result with manual assessment
- **UC010** – Update Hazard Status: manage lifecycle: submitted → verified → in_progress → resolved
- **UC011** – Manage Hazard Data: maintain database integrity, bulk operations
- **UC012** – Generate Reports: analytical reports for decision-making and planning

---

## Functional Requirements

| ID | Requirement | Key Constraint |
|---|---|---|
| F1 | Image upload via mobile/web | JPEG/PNG only, max 10MB, auto-resize for YOLO |
| F2 | YOLO hazard detection | Min 70% confidence threshold, < 5s processing, multi-hazard per image |
| F3 | GPS geolocation + Google Maps | Extract from EXIF metadata first, device GPS fallback, < 10m accuracy, manual correction |
| F4 | User auth | Register/login, guest mode (no auth required to submit), admin roles, JWT |
| F5 | Admin dashboard | Report queue, bulk actions, status lifecycle, analytics charts |

---

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR1 | Web response time < 3 seconds |
| NFR2 | Mobile app startup < 2 seconds |
| NFR3 | YOLO processing < 5 seconds per image |
| NFR4 | System availability > 99.5% |
| NFR5 | Support 1000+ concurrent users |
| NFR6 | HTTPS for all data transmission |
| NFR7 | Passwords hashed with bcrypt |
| NFR8 | API rate limiting |
| NFR9 | Input validation — prevent SQL injection and XSS |
| NFR10 | Regular security audits |
| NFR11 | Mobile UI intuitive for first-time users |
| NFR12 | Web interface accessible on mobile browsers |
| NFR13 | Max 3 clicks/taps to submit a hazard report |
| NFR14 | Support English and Malay (BM) |
| NFR15 | WCAG 2.1 accessibility compliance |

---

## System Architecture (3-Tier Layered)

```
Presentation Layer
├── Mobile App (Android/Kotlin)          → field hazard reporting
└── Web App (React.js)                   → map view + admin dashboard

Domain / Application Layer
├── Core Services
│   ├── HazardReportingService           → UC001, UC002, UC004, UC005
│   ├── UserManagementService            → UC006, UC007
│   ├── NotificationService              → status update emails
│   └── HazardManagementService          → UC008–UC011
├── Processing Services
│   ├── ImageProcessingService           → resize, normalise, EXIF parse
│   ├── YOLODetectionEngine              → Ultralytics YOLOv8 inference
│   ├── GeolocationService               → GPS extract + Google Maps geocoding
│   └── ValidationService               → confidence threshold check
└── Analytics & Reporting
    ├── ReportGenerationService          → UC012
    ├── DataAnalysisService              → trend analysis
    └── ExportService                    → CSV/PDF export

Data Access Layer
├── PostgreSQL Database                  → all structured data (8 tables above)
└── File Storage                         → uploaded images (local dev / GCS prod)
```

---

## ML / YOLO Implementation Notes

**Do NOT train from scratch.** Use this approach instead:

1. Install `ultralytics` — provides YOLOv8 with pretrained COCO weights
2. Source a road hazard fine-tuning dataset (e.g. from Roboflow: search "pothole detection" or "road damage detection") with classes: `pothole`, `faded_lane_marking`, `uneven_surface`
3. Fine-tune for ~50 epochs on that dataset using `model.train()`
4. For local dev/testing, the pretrained YOLOv8n model can be used as a placeholder — it will detect general objects until fine-tuned weights are ready
5. Wrap inference in a Flask route at `POST /api/v1/detection/analyse`
6. Return: `{ hazard_type, confidence, bounding_boxes, severity_score }`

EXIF GPS extraction: use `Pillow` (`PIL.Image`, `PIL.ExifTags`) to extract `GPSLatitude` / `GPSLongitude` from uploaded images.

---

## Mobile App Flow (UC001 → UC002)

1. User opens app → Home screen: camera button + nearby hazards map
2. Capture/select image → Preview screen: shows photo + extracted GPS coordinates
3. Submit → backend runs YOLO → returns detection result
4. Confirmation screen: shows detected hazard type + confidence score + tracking ID
5. Report visible on map once admin verifies (UC009/UC010)

Material Design guidelines. High-contrast colours for outdoor visibility. Minimal text input — rely on automated detection and GPS.

---

## Web Admin Dashboard Layout

- **Header:** auth controls, nav links
- **Sidebar:** quick nav to Reports, Map, Analytics, Users, Settings
- **Main area:** dynamic — shows map / report queue / charts
- **Footer:** version info, support links

Admin report queue: filterable by status/type/date, bulk action controls, detailed view with image + YOLO detection result + metadata.

---

## Development Rules for Claude Code

1. **Backend first** — all features should have a working API endpoint before any frontend work
2. **Follow the ERD exactly** — do not rename tables or columns without flagging it
3. **Use the use case IDs** in comments (`# UC001`, `# UC003`) to keep traceability to the thesis
4. **YOLO via Ultralytics only** — no custom model architecture, no training from scratch
5. **JWT for all protected routes** — guest users can POST to `/api/v1/reports` without auth; everything else requires a valid token
6. **Confidence threshold is 0.70** — reject detections below this and return `low_confidence` flag
7. **Image storage path convention:** `uploads/{year}/{month}/{report_id}_{timestamp}.jpg`
8. **Status flow is one-directional:** `submitted → verified → in_progress → resolved` (or `rejected` from any state by admin)
9. **Guest submissions** are allowed — `user_id` is nullable on `hazard_reports`
10. **All API responses** follow: `{ success: bool, data: {}, message: str, errors: [] }`

---

## Environment Variables Required (`.env`)

```
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/harda_db

# Flask
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
FLASK_ENV=development

# Google APIs
GOOGLE_MAPS_API_KEY=your-key
GOOGLE_CLOUD_STORAGE_BUCKET=harda-images

# YOLO
YOLO_MODEL_PATH=ml/weights/yolov8n.pt
YOLO_CONFIDENCE_THRESHOLD=0.70

# File Upload
UPLOAD_FOLDER=uploads/
MAX_CONTENT_LENGTH=10485760
```

---

*Last updated: April 2026 — PSM II Development Phase*
