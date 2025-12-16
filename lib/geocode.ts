export async function geocodeCity(cityName: string): Promise<{ lat: number; lon: number; timezone?: string } | null> {
  try {
    const encodedCity = encodeURIComponent(cityName);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedCity}&format=json&limit=1&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'StarMapApp/1.0'
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      return null;
    }
    
    const firstResult = data[0];
    return {
      lat: parseFloat(firstResult.lat),
      lon: parseFloat(firstResult.lon),
      timezone: firstResult.address?.timezone
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

