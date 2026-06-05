# HARDA Mobile (Progress 2)

Cross-platform iOS + Android app for the HARDA road hazard reporting system.
Built with **React Native + Expo (SDK 51)** and **expo-router** for file-based
routing. Replaces the previous Kotlin/Android-only plan.

## Two modes, one app

After login, the app routes by JWT role claim:

- **User mode** (`role: "user"`) — capture and submit hazard reports, view
  nearby hazards on a map, track submission status. UC001 / UC002 / UC005.
- **Crew mode** (`role: "crew"`) — receive assignments scoped to the crew
  member's team, navigate to the hazard, upload an after-photo to mark the
  hazard resolved. Sufie's stakeholder feature.

## Getting started

```bash
cd mobile
npm install                # installs all deps
npx expo install --check   # aligns versions to the installed Expo SDK

# Pick a target:
npx expo start --android   # Android emulator or device
npx expo start --ios       # iOS simulator (macOS only)
npx expo start --tunnel    # physical phone via Expo Go (any OS)
```

> If you're running the backend on `localhost:5000`, the Android emulator
> reaches it at `http://10.0.2.2:5000` and iOS simulator at
> `http://localhost:5000`. On a physical phone, use your dev machine's LAN IP
> (set in `app.json > extra.apiBaseUrlDevice` or override via the in-app
> Profile screen).

## Demo accounts (after running `python backend/seeds.py`)

| Role  | Email                  | Password   | Team               |
|-------|------------------------|------------|--------------------|
| user  | user@harda.my          | User123!   | —                  |
| crew  | crew_kl@harda.my       | Crew123!   | KL Maintenance Crew|
| crew  | crew_johor@harda.my    | Crew123!   | Johor South Crew   |

## Project layout

```
mobile/
├── app/                         # expo-router file-based routes
│   ├── _layout.tsx              # root layout (AuthProvider)
│   ├── index.tsx                # entry redirect (by auth + role)
│   ├── (auth)/                  # login / register
│   ├── (user)/                  # user mode tabs
│   └── (crew)/                  # crew mode tabs
├── components/                  # reusable UI primitives
├── context/AuthContext.tsx      # JWT + role + team_id store
└── lib/                         # API client, theme, types, EXIF helper
```

## Google Maps configuration

The same API key as the web frontend is referenced in `app.json` under
`ios.config.googleMapsApiKey` and `android.config.googleMaps.apiKey`. Before
shipping a TestFlight / Play Store build, add platform-restricted entries on
the same key (or create separate platform keys) in the Google Cloud console:

- iOS — bundle identifier `my.edu.utm.harda`
- Android — package `my.edu.utm.harda` + your signing-key SHA-1 fingerprint

Required APIs to enable on the same Google Cloud project:
- Maps SDK for Android
- Maps SDK for iOS
- (already enabled for web) Maps JavaScript API
