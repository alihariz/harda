// NFR14 — English + Bahasa Melayu (BM) for the HARDA mobile app.
// Provider hydrates the saved language from SecureStore on mount; t(key, vars)
// resolves dot-path keys with {var} interpolation and falls back to English.

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';

export type Lang = 'en' | 'ms';
export const LANGS: Lang[] = ['en', 'ms'];
export const LANG_LABEL: Record<Lang, string> = { en: 'EN', ms: 'BM' };

const STORAGE_KEY = 'harda_lang';

const STRINGS: Record<Lang, any> = {
  en: {
    common: {
      loading: 'Loading…',
      save: 'Save',
      cancel: 'Cancel',
      unknownError: 'Unknown error',
      language: 'Language',
      back: '← Back',
      ok: 'OK',
    },
    login: {
      tagline: 'Hazard Assessment Road Detection — report it, we’ll route it.',
      signIn: 'Sign in',
      signInSub: 'Use your HARDA account. Field crew see their team’s assignments after sign-in.',
      email: 'Email',
      password: 'Password',
      signInBtn: 'Sign in',
      guestBtn: 'Continue as guest (report only)',
      noAccount: 'No account yet? ',
      register: 'Register',
      missingTitle: 'Missing details',
      missingMsg: 'Enter both email and password.',
      failedTitle: 'Login failed',
    },
    register: {
      title: 'Create account',
      firstName: 'First name',
      lastName: 'Last name',
      username: 'Username',
      email: 'Email',
      password: 'Password',
      createBtn: 'Create account',
      haveAccount: 'Already have an account? ',
      signIn: 'Sign in',
      missingTitle: 'Missing details',
      missingMsg: 'Username, email and password are required.',
      failedTitle: 'Registration failed',
    },
    home: {
      title: 'Nearby hazards',
      count: '{n} verified reports across Malaysia',
      loadErrTitle: 'Could not load map',
      hazard: 'Hazard',
      markerDesc: 'Severity {sev} • Report #{id}',
    },
    capture: {
      title: 'Report a hazard',
      subtitle: 'Snap a photo of the pothole, faded lane marking, or uneven surface. We’ll auto-classify it with YOLO and geotag it from the photo’s GPS data.',
      takePhoto: '📷  Take photo',
      pickLibrary: '🖼  Pick from library',
      hint: '✓ JPEG or PNG, max 10 MB\n✓ GPS extracted from photo EXIF when present; device location used otherwise\n✓ All submissions are auto-classified, then reviewed by an admin',
      camPermTitle: 'Camera permission needed',
      camPermMsg: 'Allow camera access to capture hazards.',
      libPermTitle: 'Library permission needed',
      libPermMsg: 'Allow photo access to pick existing hazards.',
    },
    preview: {
      review: 'Review',
      location: 'Location',
      gpsExif: 'GPS extracted from photo EXIF',
      gpsDevice: 'GPS from your current device location',
      gpsNone: 'No GPS available — please enter manually',
      latitude: 'Latitude',
      longitude: 'Longitude',
      titleOptional: 'Title (optional)',
      titlePlaceholder: 'e.g. Pothole on Jalan Bukit Bintang',
      descOptional: 'Description (optional)',
      descPlaceholder: 'Any extra context?',
      submitBtn: 'Submit hazard report',
      submittedTitle: 'Submitted ✓',
      trackingId: 'Tracking ID #{id}',
      flaggedTitle: 'Flagged for review',
      flaggedMsg: 'Our AI wasn’t confident enough to classify this automatically. An admin will review it before it appears on the map.',
      aiDetected: 'AI detected',
      confidence: '{pct}% confidence',
      viewReports: 'View my reports',
      submitAnother: 'Submit another',
      noImageTitle: 'No image',
      noImageMsg: 'Go back and pick a photo first.',
      noGpsTitle: 'No GPS',
      noGpsMsg: 'EXIF and device GPS both failed. Type approximate latitude/longitude.',
      submitFailedTitle: 'Submission failed',
    },
    myReports: {
      title: 'My reports',
      subUser: 'Tracks every hazard you submit',
      subGuest: 'Sign in as a user to see your history',
      emptyUser: 'No reports yet — tap Submit to add your first.',
      emptyGuest: 'Guest mode: submissions are anonymous and not tracked here.',
      awaitingClassification: 'awaiting classification',
      severity: 'severity {n}',
    },
    profile: {
      title: 'Profile',
      account: 'Account',
      role: 'Role:',
      email: 'Email:',
      name: 'Name:',
      teamId: 'Team ID:',
      guest: 'guest',
      apiTitle: 'API base URL (override)',
      apiHint: 'Useful when running on a physical phone — point this at your dev machine’s LAN IP, e.g. http://192.168.1.100:5000/api/v1',
      baseUrl: 'Base URL',
      save: 'Save',
      signOut: 'Sign out',
      language: 'Language',
    },
    crew: {
      inboxTitle: 'Assignments',
      inboxSub: 'Hazards routed to your team',
      empty: 'No assignments right now. New ones appear here automatically.',
      countOpen: '{n} open',
      countTotal: '{n} total',
      showResolved: 'Show resolved',
      hideResolved: 'Hide resolved',
      loadErr: 'Could not load assignments',
      detailTitle: 'Assignment',
      navigate: 'Navigate to location',
      resolveBtn: 'Mark resolved (after-photo)',
      beforePhoto: 'Reported photo',
      location: 'Location',
      severity: 'Severity',
      resolveTitle: 'Resolve hazard',
      resolveSub: 'Capture an “after” photo to confirm the hazard is fixed.',
      takeAfter: '📷  Take after-photo',
      pickAfter: '🖼  Pick from library',
      uploadBtn: 'Upload & mark resolved',
      uploadedTitle: 'Resolved ✓',
      uploadedMsg: 'After-photo uploaded. This hazard is now closed and archived for audit.',
      backToInbox: 'Back to assignments',
      camPermTitle: 'Camera permission needed',
      camPermMsg: 'Allow camera access to capture the after-photo.',
      noPhotoTitle: 'No photo',
      noPhotoMsg: 'Capture or pick an after-photo first.',
      uploadFailedTitle: 'Upload failed',
      profileTitle: 'Crew profile',
      team: 'Team:',
      assignmentNo: 'Assignment #{id}',
      loadingAssignment: 'Loading assignment…',
      loadAssignmentErr: 'Could not load assignment',
      noPhotoAttached: 'No photo attached',
      resolvedOn: '✓ Resolved on {date}',
      markResolved: 'Mark resolved (upload after-photo)',
      afterPhoto: 'After-photo',
      resolveHint: 'Tap “Capture after-photo” below',
      retake: 'Retake',
      captureAfter: 'Capture after-photo',
    },
    tabs: {
      map: 'Map',
      submit: 'Submit',
      myReports: 'My Reports',
      profile: 'Profile',
      inbox: 'Inbox',
      crewProfile: 'Profile',
    },
    status: {
      submitted: 'Submitted',
      verified: 'Verified',
      in_progress: 'In Progress',
      resolved: 'Resolved',
      rejected: 'Rejected',
    },
    severity: { 1: 'Very Low', 2: 'Low', 3: 'Medium', 4: 'High', 5: 'Critical' },
    hazardType: {
      pothole: 'Pothole',
      faded_lane_marking: 'Faded Lane Marking',
      uneven_surface: 'Uneven Surface',
    },
  },

  ms: {
    common: {
      loading: 'Memuatkan…',
      save: 'Simpan',
      cancel: 'Batal',
      unknownError: 'Ralat tidak diketahui',
      language: 'Bahasa',
      back: '← Kembali',
      ok: 'OK',
    },
    login: {
      tagline: 'Penilaian Bahaya & Pengesanan Jalan — laporkan, kami uruskan.',
      signIn: 'Log masuk',
      signInSub: 'Gunakan akaun HARDA anda. Krew lapangan melihat tugasan pasukan selepas log masuk.',
      email: 'E-mel',
      password: 'Kata laluan',
      signInBtn: 'Log masuk',
      guestBtn: 'Teruskan sebagai tetamu (lapor sahaja)',
      noAccount: 'Belum ada akaun? ',
      register: 'Daftar',
      missingTitle: 'Butiran tidak lengkap',
      missingMsg: 'Masukkan e-mel dan kata laluan.',
      failedTitle: 'Log masuk gagal',
    },
    register: {
      title: 'Cipta akaun',
      firstName: 'Nama pertama',
      lastName: 'Nama akhir',
      username: 'Nama pengguna',
      email: 'E-mel',
      password: 'Kata laluan',
      createBtn: 'Cipta akaun',
      haveAccount: 'Sudah ada akaun? ',
      signIn: 'Log masuk',
      missingTitle: 'Butiran tidak lengkap',
      missingMsg: 'Nama pengguna, e-mel dan kata laluan diperlukan.',
      failedTitle: 'Pendaftaran gagal',
    },
    home: {
      title: 'Bahaya berdekatan',
      count: '{n} laporan disahkan di seluruh Malaysia',
      loadErrTitle: 'Tidak dapat memuatkan peta',
      hazard: 'Bahaya',
      markerDesc: 'Keterukan {sev} • Laporan #{id}',
    },
    capture: {
      title: 'Laporkan bahaya',
      subtitle: 'Ambil foto lubang jalan, garisan lorong pudar, atau permukaan tidak rata. Kami akan mengelaskannya secara automatik dengan YOLO dan menanda lokasinya daripada data GPS foto.',
      takePhoto: '📷  Ambil foto',
      pickLibrary: '🖼  Pilih dari galeri',
      hint: '✓ JPEG atau PNG, maksimum 10 MB\n✓ GPS diambil daripada EXIF foto jika ada; lokasi peranti digunakan sebaliknya\n✓ Semua penghantaran dikelaskan automatik, kemudian disemak oleh pentadbir',
      camPermTitle: 'Kebenaran kamera diperlukan',
      camPermMsg: 'Benarkan akses kamera untuk merakam bahaya.',
      libPermTitle: 'Kebenaran galeri diperlukan',
      libPermMsg: 'Benarkan akses foto untuk memilih bahaya sedia ada.',
    },
    preview: {
      review: 'Semak',
      location: 'Lokasi',
      gpsExif: 'GPS diambil daripada EXIF foto',
      gpsDevice: 'GPS daripada lokasi peranti semasa anda',
      gpsNone: 'Tiada GPS tersedia — sila masukkan secara manual',
      latitude: 'Latitud',
      longitude: 'Longitud',
      titleOptional: 'Tajuk (pilihan)',
      titlePlaceholder: 'cth. Lubang di Jalan Bukit Bintang',
      descOptional: 'Penerangan (pilihan)',
      descPlaceholder: 'Sebarang konteks tambahan?',
      submitBtn: 'Hantar laporan bahaya',
      submittedTitle: 'Dihantar ✓',
      trackingId: 'ID Penjejakan #{id}',
      flaggedTitle: 'Ditanda untuk semakan',
      flaggedMsg: 'AI kami tidak cukup yakin untuk mengelaskannya secara automatik. Pentadbir akan menyemaknya sebelum ia muncul di peta.',
      aiDetected: 'AI mengesan',
      confidence: '{pct}% keyakinan',
      viewReports: 'Lihat laporan saya',
      submitAnother: 'Hantar lagi',
      noImageTitle: 'Tiada imej',
      noImageMsg: 'Kembali dan pilih foto dahulu.',
      noGpsTitle: 'Tiada GPS',
      noGpsMsg: 'EXIF dan GPS peranti gagal. Taipkan anggaran latitud/longitud.',
      submitFailedTitle: 'Penghantaran gagal',
    },
    myReports: {
      title: 'Laporan saya',
      subUser: 'Menjejaki setiap bahaya yang anda hantar',
      subGuest: 'Log masuk sebagai pengguna untuk melihat sejarah anda',
      emptyUser: 'Tiada laporan lagi — ketik Hantar untuk menambah yang pertama.',
      emptyGuest: 'Mod tetamu: penghantaran adalah tanpa nama dan tidak dijejaki di sini.',
      awaitingClassification: 'menunggu pengelasan',
      severity: 'keterukan {n}',
    },
    profile: {
      title: 'Profil',
      account: 'Akaun',
      role: 'Peranan:',
      email: 'E-mel:',
      name: 'Nama:',
      teamId: 'ID Pasukan:',
      guest: 'tetamu',
      apiTitle: 'URL asas API (tindih ganti)',
      apiHint: 'Berguna semasa menjalankan pada telefon fizikal — halakan ini ke IP LAN mesin pembangunan anda, cth. http://192.168.1.100:5000/api/v1',
      baseUrl: 'URL Asas',
      save: 'Simpan',
      signOut: 'Log keluar',
      language: 'Bahasa',
    },
    crew: {
      inboxTitle: 'Tugasan',
      inboxSub: 'Bahaya yang dihalakan ke pasukan anda',
      empty: 'Tiada tugasan buat masa ini. Tugasan baharu muncul di sini secara automatik.',
      countOpen: '{n} terbuka',
      countTotal: '{n} jumlah',
      showResolved: 'Tunjuk selesai',
      hideResolved: 'Sembunyi selesai',
      loadErr: 'Tidak dapat memuatkan tugasan',
      detailTitle: 'Tugasan',
      navigate: 'Navigasi ke lokasi',
      resolveBtn: 'Tanda selesai (foto selepas)',
      beforePhoto: 'Foto dilaporkan',
      location: 'Lokasi',
      severity: 'Keterukan',
      resolveTitle: 'Selesaikan bahaya',
      resolveSub: 'Rakam foto “selepas” untuk mengesahkan bahaya telah dibaiki.',
      takeAfter: '📷  Ambil foto selepas',
      pickAfter: '🖼  Pilih dari galeri',
      uploadBtn: 'Muat naik & tanda selesai',
      uploadedTitle: 'Selesai ✓',
      uploadedMsg: 'Foto selepas dimuat naik. Bahaya ini kini ditutup dan diarkibkan untuk audit.',
      backToInbox: 'Kembali ke tugasan',
      camPermTitle: 'Kebenaran kamera diperlukan',
      camPermMsg: 'Benarkan akses kamera untuk merakam foto selepas.',
      noPhotoTitle: 'Tiada foto',
      noPhotoMsg: 'Rakam atau pilih foto selepas dahulu.',
      uploadFailedTitle: 'Muat naik gagal',
      profileTitle: 'Profil krew',
      team: 'Pasukan:',
      assignmentNo: 'Tugasan #{id}',
      loadingAssignment: 'Memuatkan tugasan…',
      loadAssignmentErr: 'Tidak dapat memuatkan tugasan',
      noPhotoAttached: 'Tiada foto dilampirkan',
      resolvedOn: '✓ Diselesaikan pada {date}',
      markResolved: 'Tanda selesai (muat naik foto selepas)',
      afterPhoto: 'Foto selepas',
      resolveHint: 'Ketik “Ambil foto selepas” di bawah',
      retake: 'Ambil semula',
      captureAfter: 'Ambil foto selepas',
    },
    tabs: {
      map: 'Peta',
      submit: 'Hantar',
      myReports: 'Laporan',
      profile: 'Profil',
      inbox: 'Peti Masuk',
      crewProfile: 'Profil',
    },
    status: {
      submitted: 'Dihantar',
      verified: 'Disahkan',
      in_progress: 'Dalam Proses',
      resolved: 'Selesai',
      rejected: 'Ditolak',
    },
    severity: { 1: 'Sangat Rendah', 2: 'Rendah', 3: 'Sederhana', 4: 'Tinggi', 5: 'Kritikal' },
    hazardType: {
      pothole: 'Lubang Jalan',
      faded_lane_marking: 'Garisan Lorong Pudar',
      uneven_surface: 'Permukaan Tidak Rata',
    },
  },
};

function resolve(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18nValue | null>(null);

export const useI18n = (): I18nValue => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n must be used inside <I18nProvider>');
  return v;
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((v) => { if (v === 'en' || v === 'ms') setLangState(v); })
      .catch(() => { /* ignore */ });
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    SecureStore.setItemAsync(STORAGE_KEY, l).catch(() => { /* ignore */ });
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    let s = resolve(STRINGS[lang], key);
    if (s == null) s = resolve(STRINGS.en, key);
    if (s == null) return key;
    if (typeof s !== 'string') return key;
    if (vars) {
      for (const [k, val] of Object.entries(vars)) {
        s = s.split(`{${k}}`).join(String(val));
      }
    }
    return s;
  }, [lang]);

  const value = useMemo<I18nValue>(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
