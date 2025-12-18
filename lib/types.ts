export type FormState = {
  date: string;
  time: string;
  location: string;
};

export type Coordinates = {
  lat: number;
  lon: number;
  timezone?: string;
};

export type LocationSuggestion = {
  id: string;
  label: string;
  lat: number;
  lon: number;
};

export type TextBox = {
  id: number;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  align: "left" | "center";
  color?: string;
  font?: FontKey;
  bold?: boolean;
  italic?: boolean;
  role?: "location" | "date";
  isAuto?: boolean;
};

export type Occasion =
  | "wedding"
  | "anniversary"
  | "birthday"
  | "newArrival"
  | "firstDance"
  | "memorial"
  | "proposal"
  | "graduation"
  | "pet"
  | "foreverNight";
export type StyleKey = "minimalNoir" | "celestialInk" | "classicStarMap" | "vintage" | "zodiac";
export type ShapeKey =
  | "none"
  | "circle"
  | "heart"
  | "star"
  | "cutDiamond"
  | "diamondRing"
  | "angelWings"
  | "hexagon"
  | "square";
export type FontKey =
  | "modernSans"
  | "classicSerif"
  | "elegantSerif"
  | "minimalGrotesk"
  | "playfulScript";
export type ModeKey = "preset" | "custom";
export type PreviewMode = "preset" | "generated";

export type StylePreset = {
  background: string;
  starColor: string;
  starOpacity: [number, number];
  starSize: [number, number];
  glow: number;
};
