// EXIF GPS extraction helper. UC002.
//
// Strategy: expo-image-picker can return EXIF when asked (exif: true).
// When it does, we parse the same DMS → decimal conversion the backend does.
// If the picker doesn't surface EXIF (older Android paths, edited photos),
// fall back to the device GPS via expo-location.

import * as Location from 'expo-location';

export type GpsResult = { lat: number; lng: number; source: 'exif' | 'device' };

const dmsToDecimal = (dms: number[] | string, ref: string): number => {
  // expo-image-picker returns DMS arrays on Android and decimal strings on iOS.
  if (Array.isArray(dms) && dms.length === 3) {
    const [d, m, s] = dms;
    let value = Number(d) + Number(m) / 60 + Number(s) / 3600;
    if (ref === 'S' || ref === 'W') value = -value;
    return value;
  }
  const num = Number(dms);
  if (ref === 'S' || ref === 'W') return -num;
  return num;
};

export const extractFromExif = (
  exif: Record<string, unknown> | null | undefined,
): GpsResult | null => {
  if (!exif) return null;
  const lat = exif['GPSLatitude'];
  const lng = exif['GPSLongitude'];
  const latRef = (exif['GPSLatitudeRef'] as string) ?? 'N';
  const lngRef = (exif['GPSLongitudeRef'] as string) ?? 'E';
  if (lat == null || lng == null) return null;
  try {
    return {
      lat: dmsToDecimal(lat as number[] | string, latRef),
      lng: dmsToDecimal(lng as number[] | string, lngRef),
      source: 'exif',
    };
  } catch {
    return null;
  }
};

export const getDeviceGps = async (): Promise<GpsResult | null> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      source: 'device',
    };
  } catch {
    return null;
  }
};
