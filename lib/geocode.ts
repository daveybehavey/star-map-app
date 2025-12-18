const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const guessTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
};

const fetchTimezoneForCoordinates = async (lat: number, lon: number) => {
  const retryDelays = [500, 1500, 3000];
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weathercode&timezone=auto`;

  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    if (attempt > 0) {
      await wait(retryDelays[attempt - 1]);
    }

    let response: Response;
    try {
      response = await fetch(url);
    } catch {
      if (attempt < retryDelays.length) {
        continue;
      }
      return undefined;
    }

    if (!response.ok) {
      const shouldRetry = response.status === 429 || response.status >= 500;
      if (shouldRetry && attempt < retryDelays.length) {
        continue;
      }
      return undefined;
    }

    const data = await response.json();
    if (data && typeof data.timezone === "string" && data.timezone.length > 0) {
      return data.timezone;
    }
    return undefined;
  }

  return undefined;
};

export async function geocodeCity(
  cityName: string,
): Promise<{ lat: number; lon: number; timezone?: string; label?: string } | null> {
  try {
    const encodedCity = encodeURIComponent(cityName);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedCity}&format=json&limit=1&addressdetails=1`;
    const retryDelays = [500, 1500, 3000];

    await wait(300);

    for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
      if (attempt > 0) {
        await wait(retryDelays[attempt - 1]);
      }

      let response: Response;
      try {
        response = await fetch(url, {
          headers: {
            "User-Agent": "StarMapApp/1.0",
          },
        });
      } catch (error) {
        if (attempt < retryDelays.length) {
          continue;
        }
        console.error("Geocoding error:", error);
        return null;
      }

      if (!response.ok) {
        const shouldRetry = response.status === 429 || response.status >= 500;
        if (shouldRetry && attempt < retryDelays.length) {
          continue;
        }
        return null;
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        return null;
      }

      const firstResult = data[0];
      const lat = parseFloat(firstResult.lat);
      const lon = parseFloat(firstResult.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return null;
      }

      const timezone =
        firstResult.address?.timezone ||
        (await fetchTimezoneForCoordinates(lat, lon)) ||
        guessTimezone();
      const address = firstResult.address || {};
      const locality = address.city || address.town || address.village || "";
      const region = address.state || address.region || address.county || "";
      const country = address.country || "";
      const labelParts = [locality, region, country].filter(Boolean);
      const label = labelParts.join(", ");

      return {
        lat,
        lon,
        timezone,
        label: label || firstResult.display_name || cityName,
      };
    }

    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}
