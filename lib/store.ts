import { create } from "zustand";
import {
  ModeKey,
  Occasion,
  ShapeKey,
  StyleKey,
  TextBox,
} from "@/lib/types";

export const OCCASION_PRESETS: Record<Occasion, TextBox[]> = {
  wedding: [
    { id: 1, text: 'Under these stars we said "I do"', x: 50, y: 30, fontSize: 36, align: "center", color: "#f8fafc", font: "modernSans" },
    { id: 2, text: "[Date] • [Location]", x: 50, y: 70, fontSize: 18, align: "center", color: "#d1d5db", font: "modernSans" },
    { id: 3, text: "Forever begins here", x: 50, y: 85, fontSize: 14, align: "center", color: "#e5e7eb", font: "classicSerif" },
  ],
  anniversary: [
    { id: 1, text: "The night our story continues", x: 50, y: 30, fontSize: 36, align: "center", color: "#f8fafc", font: "modernSans" },
    { id: 2, text: "[Date] • [Location]", x: 50, y: 70, fontSize: 18, align: "center", color: "#d1d5db", font: "modernSans" },
    { id: 3, text: "Still counting stars with you", x: 50, y: 85, fontSize: 14, align: "center", color: "#e5e7eb", font: "classicSerif" },
  ],
  birthday: [
    { id: 1, text: "The sky on the day you were born", x: 50, y: 30, fontSize: 36, align: "center", color: "#f8fafc", font: "modernSans" },
    { id: 2, text: "[Date] • [Location]", x: 50, y: 70, fontSize: 18, align: "center", color: "#d1d5db", font: "modernSans" },
    { id: 3, text: "Make a wish", x: 50, y: 85, fontSize: 14, align: "center", color: "#e5e7eb", font: "playfulScript" },
  ],
  newArrival: [
    { id: 1, text: "The stars welcomed you", x: 50, y: 30, fontSize: 36, align: "center", color: "#f8fafc", font: "modernSans" },
    { id: 2, text: "[Date] • [Location]", x: 50, y: 70, fontSize: 18, align: "center", color: "#d1d5db", font: "modernSans" },
    { id: 3, text: "Our little light", x: 50, y: 85, fontSize: 14, align: "center", color: "#e5e7eb", font: "elegantSerif" },
  ],
  firstDance: [
    { id: 1, text: "Our first dance under these stars", x: 50, y: 30, fontSize: 36, align: "center", color: "#f8fafc", font: "modernSans" },
    { id: 2, text: "[Date] • [Location]", x: 50, y: 70, fontSize: 18, align: "center", color: "#d1d5db", font: "modernSans" },
    { id: 3, text: "The song still plays", x: 50, y: 85, fontSize: 14, align: "center", color: "#e5e7eb", font: "classicSerif" },
  ],
  memorial: [
    { id: 1, text: "Forever shining bright", x: 50, y: 30, fontSize: 36, align: "center", color: "#f8fafc", font: "modernSans" },
    { id: 2, text: "[Date] • [Location]", x: 50, y: 70, fontSize: 18, align: "center", color: "#d1d5db", font: "modernSans" },
    { id: 3, text: "In loving memory", x: 50, y: 85, fontSize: 14, align: "center", color: "#e5e7eb", font: "elegantSerif" },
  ],
  proposal: [
    { id: 1, text: "The night I asked forever", x: 50, y: 30, fontSize: 36, align: "center", color: "#f8fafc", font: "modernSans" },
    { id: 2, text: "[Date] • [Location]", x: 50, y: 70, fontSize: 18, align: "center", color: "#d1d5db", font: "modernSans" },
    { id: 3, text: "She said yes", x: 50, y: 85, fontSize: 14, align: "center", color: "#e5e7eb", font: "playfulScript" },
  ],
  graduation: [
    { id: 1, text: "The sky the night you soared", x: 50, y: 30, fontSize: 36, align: "center", color: "#f8fafc", font: "modernSans" },
    { id: 2, text: "[Date] • [Location]", x: 50, y: 70, fontSize: 18, align: "center", color: "#d1d5db", font: "modernSans" },
    { id: 3, text: "Future so bright", x: 50, y: 85, fontSize: 14, align: "center", color: "#e5e7eb", font: "modernSans" },
  ],
  pet: [
    { id: 1, text: "Paw prints on our hearts", x: 50, y: 30, fontSize: 36, align: "center", color: "#f8fafc", font: "playfulScript" },
    { id: 2, text: "[Date] • [Location]", x: 50, y: 70, fontSize: 18, align: "center", color: "#d1d5db", font: "modernSans" },
    { id: 3, text: "Forever our furry star", x: 50, y: 85, fontSize: 14, align: "center", color: "#e5e7eb", font: "classicSerif" },
  ],
  foreverNight: [
    { id: 1, text: "A moment captured forever", x: 50, y: 30, fontSize: 36, align: "center", color: "#f8fafc", font: "elegantSerif" },
    { id: 2, text: "[Date] • [Location]", x: 50, y: 70, fontSize: 18, align: "center", color: "#d1d5db", font: "modernSans" },
    { id: 3, text: "Under these stars always", x: 50, y: 85, fontSize: 14, align: "center", color: "#e5e7eb", font: "classicSerif" },
  ],
};


type TextBoxUpdater = TextBox[] | ((current: TextBox[]) => TextBox[]);

type CustomizationState = {
  mode: ModeKey;
  occasion: Occasion;
  styleId: StyleKey;
  shapeId: ShapeKey;
  zoom: number;
  rotation: number;
  showConstellations: boolean;
  textBoxes: TextBox[];
  hasEditedText: boolean;
  locationLineOptOut: boolean;
  dateLineOptOut: boolean;
  initialized: boolean;
  setMode: (mode: ModeKey) => void;
  setOccasion: (occasion: Occasion) => void;
  setStyleId: (styleId: StyleKey) => void;
  setShapeId: (shapeId: ShapeKey) => void;
  setZoom: (zoom: number) => void;
  setRotation: (rotation: number) => void;
  setShowConstellations: (value: boolean) => void;
  setTextBoxes: (next: TextBoxUpdater) => void;
  setHasEditedText: (value: boolean) => void;
  setLocationLineOptOut: (value: boolean) => void;
  setDateLineOptOut: (value: boolean) => void;
  initialize: (boxes: TextBox[]) => void;
};

export const useCustomizationStore = create<CustomizationState>((set) => ({
  mode: "preset",
  occasion: "wedding",
  styleId: "minimalNoir",
  shapeId: "circle",
  zoom: 1,
  rotation: 0,
  showConstellations: true,
  textBoxes: [],
  hasEditedText: false,
  locationLineOptOut: false,
  dateLineOptOut: false,
  initialized: false,
  setMode: (mode) => set({ mode }),
  setOccasion: (occasion) => set({ occasion }),
  setStyleId: (styleId) => set({ styleId }),
  setShapeId: (shapeId) => set({ shapeId }),
  setZoom: (zoom) => set({ zoom }),
  setRotation: (rotation) => set({ rotation }),
  setShowConstellations: (value) => set({ showConstellations: value }),
  setTextBoxes: (next) =>
    set((state) => ({
      textBoxes: typeof next === "function" ? next(state.textBoxes) : next,
    })),
  setHasEditedText: (value) => set({ hasEditedText: value }),
  setLocationLineOptOut: (value) => set({ locationLineOptOut: value }),
  setDateLineOptOut: (value) => set({ dateLineOptOut: value }),
  initialize: (boxes) =>
    set((state) =>
      state.initialized
        ? state
        : {
            textBoxes: boxes,
            initialized: true,
          },
    ),
}));
