import * as Location from 'expo-location';

export interface LocationInfo {
  latitude: number;
  longitude: number;
  mapsUrl: string;
}

export const getCurrentLocation = async (): Promise<LocationInfo | null> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Location permission was denied');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = location.coords;
    const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;

    return { latitude, longitude, mapsUrl };
  } catch (error) {
    console.error('Error fetching location:', error);
    return null;
  }
};
