import {
  Observer,
  Horizon
} from "astronomy-engine";

import stars from "./data/stars.json";

export type StarPoint = {
  x: number;
  y: number;
  magnitude: number;
};

export type StarHorizontal = {
  ra: number;
  dec: number;
  magnitude: number;
  altitude: number;
  azimuth: number;
};

export function computeVisibleStars(
  date: Date,
  latitude: number,
  longitude: number,
  width: number,
  height: number
): StarPoint[] {
  const observer = new Observer(latitude, longitude, 0);
  const output: StarPoint[] = [];

  for (const star of stars) {
    // Convert RA/Dec → Horizon (Alt/Az)
    // Horizon accepts RA in sidereal hours and Dec in degrees
    const hor = Horizon(
      date,
      observer,
      star.ra,
      star.dec
    );

    // Only stars above the horizon
    if (hor.altitude <= 0) continue;

    // Polar projection
    const r = (90 - hor.altitude) / 90;
    const angle = (hor.azimuth * Math.PI) / 180;

    const x = width / 2 + r * Math.sin(angle) * width * 0.45;
    const y = height / 2 - r * Math.cos(angle) * height * 0.45;

    output.push({
      x,
      y,
      magnitude: star.mag
    });
  }

  return output;
}

/**
 * Compute which stars from the catalog are above the horizon for a given date and location.
 * Returns altitude/azimuth values only (no projection).
 * 
 * @param date - The date and time for the observation
 * @param latitude - Observer's latitude in degrees
 * @param longitude - Observer's longitude in degrees
 * @returns Array of stars above the horizon with their horizontal coordinates
 */
export function computeStarsAboveHorizon(
  date: Date,
  latitude: number,
  longitude: number
): StarHorizontal[] {
  const observer = new Observer(latitude, longitude, 0);
  const output: StarHorizontal[] = [];

  for (const star of stars) {
    // Convert RA/Dec → Horizon (Alt/Az) using astronomy-engine
    // Horizon accepts RA in sidereal hours and Dec in degrees
    const hor = Horizon(
      date,
      observer,
      star.ra,
      star.dec
    );

    // Only stars above the horizon
    if (hor.altitude <= 0) continue;

    output.push({
      ra: star.ra,
      dec: star.dec,
      magnitude: star.mag,
      altitude: hor.altitude,
      azimuth: hor.azimuth
    });
  }

  return output;
}
