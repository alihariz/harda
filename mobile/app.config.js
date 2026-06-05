// Dynamic config — reads Google Maps API key from environment.
// For local dev: set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in mobile/.env
// For EAS Build: set it as an EAS secret (eas secret:create ...)
const { expo: base } = require('./app.json');

export default {
  expo: {
    ...base,
    ios: {
      ...base.ios,
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
      },
    },
    android: {
      ...base.android,
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
        },
      },
    },
  },
};
