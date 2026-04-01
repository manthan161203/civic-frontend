import axios from 'axios';

export const reverseGeocode = async (latitude, longitude) => {
  try {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
    );

    if (response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      const addressComponents = result.address_components;

      // Extract address parts from Google's response
      let street = '';
      let locality = '';
      let district = '';
      let city = '';

      addressComponents.forEach((component) => {
        if (component.types.includes('route')) {
          street = component.long_name;
        }
        if (component.types.includes('locality')) {
          locality = component.long_name;
        }
        if (component.types.includes('administrative_area_level_2')) {
          district = component.long_name;
        }
        if (component.types.includes('administrative_area_level_1')) {
          city = component.long_name;
        }
      });

      return {
        address: result.formatted_address,
        street: street || result.address_components[0]?.long_name || '',
        locality: locality || district || '',
        city: city || '',
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};
