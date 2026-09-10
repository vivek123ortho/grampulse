// utils/geolocation.js
//
// Wraps the browser's Geolocation API in a Promise so components can just
// `await getCurrentLocation()` instead of dealing with callback syntax.

export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(new Error("Could not get your location: " + error.message));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}
