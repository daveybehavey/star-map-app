"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  CSSProperties,
  useEffect,
  useRef,
  useState,
} from "react";
import { geocodeCity } from "@/lib/geocode";
import HeroSection from "@/components/HeroSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import GiftIntroSection from "@/components/GiftIntroSection";
import MomentForm from "@/components/MomentForm";
import PreviewSection from "@/components/PreviewSection";
import {
  computeVisibleStars,
  StarPoint,
  VisibleSky,
  PlanetName,
} from "@/lib/astronomy";
import {
  Coordinates,
  FormState,
  LocationSuggestion,
  TextBox,
  Occasion,
  StyleKey,
  ShapeKey,
  FontKey,
  PreviewMode,
  StylePreset,
} from "@/lib/types";
import { useCustomizationStore, OCCASION_PRESETS } from "@/lib/store";

const hashStringToSeed = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
};

const createRng = (seed: number) => {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export default function Home() {
  const [formState, setFormState] = useState<FormState>({
    date: "",
    time: "",
    location: "",
  });
  const [displayLocation, setDisplayLocation] = useState<string>("");
  const [, setPendingSubmission] = useState<FormState | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const mode = useCustomizationStore((state) => state.mode);
  const occasion = useCustomizationStore((state) => state.occasion);
  const styleId = useCustomizationStore((state) => state.styleId);
  const shapeId = useCustomizationStore((state) => state.shapeId);
  const zoom = useCustomizationStore((state) => state.zoom);
  const rotation = useCustomizationStore((state) => state.rotation);
  const showConstellations = useCustomizationStore((state) => state.showConstellations);
  const textBoxes = useCustomizationStore((state) => state.textBoxes);
  const hasEditedText = useCustomizationStore((state) => state.hasEditedText);
  const locationLineOptOut = useCustomizationStore((state) => state.locationLineOptOut);
  const dateLineOptOut = useCustomizationStore((state) => state.dateLineOptOut);
  const customizationInitialized = useCustomizationStore((state) => state.initialized);
  const setMode = useCustomizationStore((state) => state.setMode);
  const setOccasion = useCustomizationStore((state) => state.setOccasion);
  const setStyleId = useCustomizationStore((state) => state.setStyleId);
  const setShapeId = useCustomizationStore((state) => state.setShapeId);
  const setZoom = useCustomizationStore((state) => state.setZoom);
  const setRotation = useCustomizationStore((state) => state.setRotation);
  const setShowConstellations = useCustomizationStore((state) => state.setShowConstellations);
  const setTextBoxes = useCustomizationStore((state) => state.setTextBoxes);
  const setHasEditedText = useCustomizationStore((state) => state.setHasEditedText);
  const setLocationLineOptOut = useCustomizationStore((state) => state.setLocationLineOptOut);
  const setDateLineOptOut = useCustomizationStore((state) => state.setDateLineOptOut);
  const initializeCustomization = useCustomizationStore((state) => state.initialize);
  const canvasSize = 720;
  const canvasWidth = canvasSize;
  const canvasHeight = canvasSize;
  const [previewSize, setPreviewSize] = useState({
    width: canvasWidth,
    height: canvasHeight,
  });

  const stylePresets: Record<StyleKey, StylePreset> = {
    minimalNoir: {
      background: "#0b0f19",
      starColor: "#ffffff",
      starOpacity: [0.55, 0.95],
      starSize: [0.7, 1.8],
      glow: 2,
    },
    celestialInk: {
      background: "#0b0c10",
      starColor: "#cfe3ff",
      starOpacity: [0.5, 0.9],
      starSize: [0.8, 2.0],
      glow: 3,
    },
    classicStarMap: {
      background: "#0f0f0f",
      starColor: "#f6f1e7",
      starOpacity: [0.65, 0.95],
      starSize: [0.9, 2.1],
      glow: 1.5,
    },
    vintage: {
      background: "#2b2319",
      starColor: "#f5e6d3",
      starOpacity: [0.6, 0.92],
      starSize: [0.85, 2.1],
      glow: 1.6,
    },
    zodiac: {
      background: "#0b1020",
      starColor: "#d7e9ff",
      starOpacity: [0.55, 0.95],
      starSize: [0.8, 2.2],
      glow: 2.2,
    },
  };

  const textStyles: Record<StyleKey, { fontWeight: number; letterSpacing: string; color: string }> = {
    minimalNoir: { fontWeight: 400, letterSpacing: "0.01em", color: "#e5e7eb" },
    celestialInk: { fontWeight: 500, letterSpacing: "0.04em", color: "#dbeafe" },
    classicStarMap: { fontWeight: 600, letterSpacing: "0.02em", color: "#f2eadc" },
    vintage: { fontWeight: 500, letterSpacing: "0.03em", color: "#f4e7d4" },
    zodiac: { fontWeight: 600, letterSpacing: "0.05em", color: "#f9c878" },
  };

  const planetStyles: Record<PlanetName, { color: string; radius: number }> = {
    Mercury: { color: "#cbd5e1", radius: 2.1 },
    Venus: { color: "#f8fafc", radius: 2.5 },
    Mars: { color: "#f97316", radius: 2.2 },
    Jupiter: { color: "#f5d0b5", radius: 2.8 },
    Saturn: { color: "#f5e6b3", radius: 2.6 },
  };

  const fontOptions: Record<FontKey, { label: string; stack: string }> = {
    modernSans: { label: "Modern Sans", stack: "\"Helvetica Neue\", Arial, sans-serif" },
    classicSerif: { label: "Classic Serif", stack: "Georgia, \"Times New Roman\", serif" },
    elegantSerif: { label: "Elegant Serif", stack: "\"Palatino Linotype\", \"Book Antiqua\", Palatino, serif" },
    minimalGrotesk: { label: "Minimal Grotesk", stack: "\"Gill Sans\", \"Trebuchet MS\", sans-serif" },
    playfulScript: { label: "Playful Script", stack: "\"Brush Script MT\", \"Comic Sans MS\", cursive" },
  };

  const circleMaskDataUri =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="white"/></svg>',
    );
  const shapeMaskPaths: Partial<Record<ShapeKey, string>> = {
    circle: circleMaskDataUri,
    heart: "/masks/heart.svg",
    star: "/masks/star.svg",
    cutDiamond: "/masks/cutDiamond.svg",
    diamondRing: "/masks/diamondRing.svg",
    angelWings: "/masks/angelWings.svg",
    hexagon: "/masks/hexagon.svg",
    square: "/masks/square.svg",
  };

  const maskSize = "82%";

  const getShapeMaskStyle = (shape: ShapeKey): CSSProperties & { WebkitMaskImage?: string } => {
    if (shape === "none") return {};
    const path = shapeMaskPaths[shape] ?? circleMaskDataUri;
    const url = `url(${path})`;
    return {
      maskImage: url,
      WebkitMaskImage: url,
      maskRepeat: "no-repeat",
      WebkitMaskRepeat: "no-repeat",
      maskPosition: "center",
      WebkitMaskPosition: "center",
      maskSize,
      WebkitMaskSize: maskSize,
      maskMode: "alpha",
    };
  };

  const textColorPresets = [
    { label: "White", value: "#f8fafc" },
    { label: "Warm gray", value: "#e7dfd7" },
    { label: "Soft gold", value: "#f3d8a3" },
    { label: "Moonlit blue", value: "#dbeafe" },
  ];

  const presetBoxes = OCCASION_PRESETS;

  useEffect(() => {
    if (customizationInitialized) return;
    initializeCustomization(presetBoxes.wedding.map((box) => ({ ...box })));
  }, [customizationInitialized, initializeCustomization, presetBoxes]);

  useEffect(() => {
    if (mode !== "custom") return;
    setTextBoxes((current) => {
      const filtered = current.filter(
        (box) =>
          box.role ||
          (!box.text.includes("[Date]") && !box.text.includes("[Location]")),
      );
      return filtered.length === current.length ? current : filtered;
    });
  }, [mode, textBoxes, setTextBoxes]);

  const [dragging, setDragging] = useState<{
    id: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  } | null>(null);

  const scaleX = previewSize.width / canvasWidth || 1;
  const scaleY = previewSize.height / canvasHeight || 1;
  const safeInset = canvasWidth * 0.12;
  const customInset = canvasWidth * 0.02;
  const snapThreshold = canvasWidth * 0.012;
  const locationPopoverRef = useRef<HTMLDivElement | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const lastSelectedLocation = useRef<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("preset");
  const presetStarsRef = useRef<StarPoint[] | null>(null);
  if (!presetStarsRef.current) {
    const seed = hashStringToSeed("preset-stars");
    const rng = createRng(seed);
    const count = 220;
    const center = canvasSize / 2;
    const radius = canvasSize * 0.46;
    const stars: StarPoint[] = [];
    for (let i = 0; i < count; i += 1) {
      const angle = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * radius;
      stars.push({
        x: center + Math.cos(angle) * r,
        y: center + Math.sin(angle) * r,
        magnitude: 1,
      });
    }
    presetStarsRef.current = stars;
  }
  const [starData, setStarData] = useState<VisibleSky>({
    stars: presetStarsRef.current,
    planets: [],
    moon: null,
    constellations: [],
  });
  const [renderParams, setRenderParams] = useState<{
    date: string;
    time?: string;
    coordinates: Coordinates;
  } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [showPrintTips, setShowPrintTips] = useState(false);
  const noiseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const pendingDragRef = useRef<{
    id: number;
    x: number;
    y: number;
    snapX: number | null;
    snapY: number | null;
  } | null>(null);
  const [snapGuides, setSnapGuides] = useState<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });
  const customLayoutInitializedRef = useRef(false);

  const selectedDate = formState.date
    ? new Date(`${formState.date}T00:00:00`)
    : null;
  const hasLocationInput = Boolean(formState.location.trim());
  const hasTime = Boolean(formState.time && formState.time.trim());
  const isReadyToReveal = Boolean(formState.date && (coordinates || hasLocationInput));
  const isLocationValid = Boolean(coordinates || hasLocationInput);
  const isActionEnabled = isReadyToReveal && !isGenerating;
  const isPresetMode = mode === "preset";
  const canExport = previewMode === "generated" && !isGenerating && !isExporting;

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  const percentToPx = (percent: number, size: number) => (percent / 100) * size;
  const pxToPercent = (px: number, size: number) => (px / size) * 100;

  const adjustColor = (hex: string, amount: number) => {
    const clean = hex.replace("#", "");
    const num = Number.parseInt(clean, 16);
    const r = clamp(((num >> 16) & 0xff) + amount * 255, 0, 255);
    const g = clamp(((num >> 8) & 0xff) + amount * 255, 0, 255);
    const b = clamp((num & 0xff) + amount * 255, 0, 255);
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  };

  const seededNoise = (x: number, y: number) => {
    const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return value - Math.floor(value);
  };

  const zodiacConstellations = [
    "aries",
    "taurus",
    "gemini",
    "cancer",
    "leo",
    "virgo",
    "libra",
    "scorpius",
    "sagittarius",
    "capricornus",
    "aquarius",
    "pisces",
  ];

  const getZodiacSign = (dateValue: Date) => {
    const month = dateValue.getUTCMonth() + 1;
    const day = dateValue.getUTCDate();
    // ranges in UTC
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "aries";
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "taurus";
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "gemini";
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "cancer";
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "leo";
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "virgo";
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "libra";
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "scorpius";
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "sagittarius";
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "capricornus";
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "aquarius";
    return "pisces";
  };

  const getStarAppearance = (star: StarPoint, style: StylePreset) => {
    const magnitude = Number.isFinite(star.magnitude) ? star.magnitude : 4;
    const normalized = clamp(1 - (magnitude + 1) / 7, 0, 1);
    const baseBrightness = Math.pow(normalized, 1.8);
    const noiseA = seededNoise(star.x, star.y);
    const noiseB = seededNoise(star.x + 19.7, star.y + 7.3);
    const brightnessJitter = (noiseA - 0.5) * 0.3;
    const brightness = clamp(baseBrightness * (1 + brightnessJitter), 0, 1);
    const size = style.starSize[0] + brightness * (style.starSize[1] - style.starSize[0]);
    const opacityBase =
      style.starOpacity[0] + brightness * (style.starOpacity[1] - style.starOpacity[0]);
    const opacityScale = star.opacity ?? 1;
    const opacity = clamp(opacityBase * (0.85 + noiseA * 0.3) * opacityScale, 0.08, 1);
    const radiusJitter = (noiseB - 0.5) * 0.16;
    const radius = Math.max(0.4, size * (0.92 + radiusJitter));
    const blur = noiseB > 0.95 ? radius * 1.2 : 0;
    const halo =
      brightness > 0.9 && noiseA > 0.6
        ? { radius: radius * 6, opacity: 0.06 * brightness }
        : null;
    return { radius, opacity, brightness, blur, halo };
  };

  const formatTimeDisplay = (value: string) => {
    if (!value) return "";
    const [hourRaw, minuteRaw] = value.split(":").map(Number);
    if (!Number.isFinite(hourRaw) || !Number.isFinite(minuteRaw)) return value;
    const hour24 = clamp(hourRaw, 0, 23);
    const minute = clamp(minuteRaw, 0, 59);
    const period = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    return `${hour12}:${minute.toString().padStart(2, "0")} ${period}`;
  };

  useEffect(() => {
    if (!exportSuccess) return;
    const timeout = window.setTimeout(() => {
      setExportSuccess(false);
      setShowPrintTips(false);
    }, 7000);
    return () => window.clearTimeout(timeout);
  }, [exportSuccess]);

  useEffect(() => {
    if (mode !== "custom" || customLayoutInitializedRef.current) return;
    customLayoutInitializedRef.current = true;
    setTextBoxes((current) => {
      if (current.length === 0) return current;
      const targetYPercent = 10;
      return current.map((box, index) => {
        if (box.role) return box;
        if (box.align !== "center") {
          return { ...box, y: targetYPercent };
        }
        const centeredX = index === 0 ? 17.5 : 22.5;
        return { ...box, x: centeredX, y: targetYPercent };
      });
    });
  }, [mode, setTextBoxes]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isLocationOpen &&
        locationPopoverRef.current &&
        !locationPopoverRef.current.contains(event.target as Node)
      ) {
        setIsLocationOpen(false);
      }
    };
    window.addEventListener("pointerdown", handleClickOutside);
    return () => window.removeEventListener("pointerdown", handleClickOutside);
  }, [isLocationOpen]);

  useEffect(() => {
    const query = formState.location.trim();
    if (!query || query.length < 2 || query === lastSelectedLocation.current) {
      setLocationSuggestions([]);
      setIsLocationLoading(false);
      return;
    }

    let isActive = true;
    setIsLocationLoading(true);
    setLocationError(null);
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: query,
          format: "json",
          addressdetails: "1",
          limit: "5",
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Location search failed");
        }
        const results: Array<{
          place_id: number;
          display_name: string;
          lat: string;
          lon: string;
          address?: {
            city?: string;
            town?: string;
            village?: string;
            state?: string;
            region?: string;
            county?: string;
            country?: string;
          };
        }> = await response.json();

        if (!isActive) return;

    const suggestions = results.map((item) => {
      const address = item.address || {};
      const locality = address.city || address.town || address.village || "";
      const region = address.state || address.region || address.county || "";
      const country = address.country || "";
      const parts = [locality, region, country].filter(Boolean);
          return {
            id: String(item.place_id),
            label: parts.length ? parts.join(", ") : item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
          };
        });
        setLocationSuggestions(suggestions);
        setIsLocationOpen(true);
      } catch {
        if (!isActive) return;
        setLocationError("No locations found.");
        setLocationSuggestions([]);
      } finally {
        if (isActive) {
          setIsLocationLoading(false);
        }
      }
    }, 300);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [formState.location]);

  const formatDisplayDate = (dateValue: Date | null) => {
    if (!dateValue) return "Select date";
    return dateValue.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const parseLetterSpacing = (value: string, fontSize: number) => {
    const numeric = Number.parseFloat(value);
    if (Number.isNaN(numeric)) return 0;
    return numeric * fontSize;
  };

  const measureTextWidth = (
    ctx: CanvasRenderingContext2D,
    text: string,
    letterSpacing: number,
  ) => {
    const metrics = ctx.measureText(text);
    return metrics.width + Math.max(0, text.length - 1) * letterSpacing;
  };

  const wrapText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    letterSpacing: number,
  ) => {
    const lines: string[] = [];
    const paragraphs = text.split("\n");
    for (const paragraph of paragraphs) {
      const words = paragraph.split(" ").filter(Boolean);
      let line = "";
      for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (measureTextWidth(ctx, next, letterSpacing) <= maxWidth || !line) {
          line = next;
        } else {
          lines.push(line);
          line = word;
        }
      }
      if (line) lines.push(line);
    }
    return lines.length ? lines : [text];
  };

  const drawTextWithSpacing = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    align: CanvasTextAlign,
    letterSpacing: number,
  ) => {
    if (!letterSpacing) {
      ctx.textAlign = align;
      ctx.fillText(text, x, y);
      return;
    }
    const totalWidth = measureTextWidth(ctx, text, letterSpacing);
    let startX = x;
    if (align === "center") startX = x - totalWidth / 2;
    if (align === "right") startX = x - totalWidth;
    let cursor = startX;
    for (const char of text) {
      ctx.fillText(char, cursor, y);
      cursor += ctx.measureText(char).width + letterSpacing;
    }
  };

  const drawMoonIcon = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    phase: number,
  ) => {
    const phaseAngle = phase * Math.PI * 2;
    const illumination = 0.5 * (1 - Math.cos(phaseAngle));
    const offset = illumination * 2 * radius;
    const direction = phase <= 0.5 ? -1 : 1;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#d1d5db";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(x + direction * offset, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const exportStarMap = async () => {
    if (!canExport) return;
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(false);
    setShowPrintTips(false);
    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
      const exportSize = 3000;
      const scale = exportSize / canvasSize;
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = exportSize;
      exportCanvas.height = exportSize;
      const ctx = exportCanvas.getContext("2d");
      if (!ctx) {
        setExportError("We couldn’t prepare your sky just yet.");
        setIsExporting(false);
        setExportSuccess(false);
        return;
      }

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, exportSize, exportSize);

      const mapCanvas = document.createElement("canvas");
      mapCanvas.width = exportSize;
      mapCanvas.height = exportSize;
      const mapCtx = mapCanvas.getContext("2d");
      if (!mapCtx) {
        setExportError("We couldn’t prepare your sky just yet.");
        setIsExporting(false);
        setExportSuccess(false);
        return;
      }

      const style = stylePresets[styleId];
      const gradient = mapCtx.createRadialGradient(
        exportSize / 2,
        exportSize / 2,
        exportSize * 0.1,
        exportSize / 2,
        exportSize / 2,
        exportSize * 0.6,
      );
      gradient.addColorStop(0, adjustColor(style.background, 0.06));
      gradient.addColorStop(1, adjustColor(style.background, -0.08));
      mapCtx.fillStyle = gradient;
      mapCtx.fillRect(0, 0, exportSize, exportSize);

      if (noiseCanvasRef.current) {
        const pattern = mapCtx.createPattern(noiseCanvasRef.current, "repeat");
        if (pattern) {
          mapCtx.save();
          mapCtx.globalAlpha = 0.08;
          mapCtx.fillStyle = pattern;
          mapCtx.fillRect(0, 0, exportSize, exportSize);
          mapCtx.restore();
        }
      }

      const rotationRadians = (rotation * Math.PI) / 180;
      mapCtx.save();
      mapCtx.translate(exportSize / 2, exportSize / 2);
      mapCtx.scale(zoom, zoom);
      mapCtx.rotate(rotationRadians);
      mapCtx.translate(-exportSize / 2, -exportSize / 2);

      mapCtx.fillStyle = style.starColor;
      for (const star of starData.stars) {
        const { radius, opacity, blur, halo } = getStarAppearance(star, style);
        const starX = star.x * scale;
        const starY = star.y * scale;
        if (halo) {
          mapCtx.save();
          mapCtx.globalAlpha = halo.opacity;
          mapCtx.beginPath();
          mapCtx.arc(starX, starY, halo.radius * scale, 0, Math.PI * 2);
          mapCtx.fill();
          mapCtx.restore();
        }
        mapCtx.globalAlpha = opacity;
        mapCtx.shadowBlur = blur * scale;
        mapCtx.shadowColor = `rgba(255,255,255,${opacity * 0.6})`;
        mapCtx.beginPath();
        mapCtx.arc(starX, starY, radius * scale, 0, Math.PI * 2);
        mapCtx.fill();
      }
      mapCtx.shadowBlur = 0;
      mapCtx.globalAlpha = 1;

      if (showConstellations && starData.constellations.length > 0) {
        mapCtx.save();
        const zodiacSign = selectedDate ? getZodiacSign(selectedDate) : null;
        for (const constellation of starData.constellations) {
          const isZodiac = zodiacSign
            ? zodiacConstellations.includes(zodiacSign) &&
              constellation.name.toLowerCase() === zodiacSign.toLowerCase()
            : false;
          mapCtx.strokeStyle = isZodiac ? "rgba(249,200,120,0.7)" : "rgba(255,255,255,0.18)";
          mapCtx.lineWidth = (isZodiac ? 1.4 : 0.7) * scale / zoom;
          mapCtx.beginPath();
          for (const [startIndex, endIndex] of constellation.lines) {
            const start = starData.stars[startIndex];
            const end = starData.stars[endIndex];
            if (!start || !end) continue;
            mapCtx.moveTo(start.x * scale, start.y * scale);
            mapCtx.lineTo(end.x * scale, end.y * scale);
          }
          mapCtx.stroke();
        }
        mapCtx.restore();
      }

      for (const planet of starData.planets) {
        const planetStyle = planetStyles[planet.name];
        mapCtx.save();
        mapCtx.globalAlpha = 0.95;
        mapCtx.fillStyle = planetStyle.color;
        mapCtx.shadowBlur = 12 * scale;
        mapCtx.shadowColor = planetStyle.color;
        mapCtx.beginPath();
        mapCtx.arc(planet.x * scale, planet.y * scale, planetStyle.radius * scale * 1.6, 0, Math.PI * 2);
        mapCtx.fill();
        mapCtx.restore();
      }

      if (starData.moon) {
        drawMoonIcon(
          mapCtx,
          starData.moon.x * scale,
          starData.moon.y * scale,
          9 * scale,
          starData.moon.phase,
        );
      }

      mapCtx.restore();

      if (shapeId !== "none") {
        const maskPath = shapeMaskPaths[shapeId] ?? circleMaskDataUri;
        const maskScale = Number.parseFloat(maskSize) / 100;
        const maskPixel = exportSize * maskScale;
        const maskImage = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("mask load"));
          img.src = maskPath;
        }).catch(() => null);

        if (maskImage) {
          mapCtx.globalCompositeOperation = "destination-in";
          mapCtx.drawImage(
            maskImage,
            (exportSize - maskPixel) / 2,
            (exportSize - maskPixel) / 2,
            maskPixel,
            maskPixel,
          );
          mapCtx.globalCompositeOperation = "source-over";
        } else {
          const fallback = new Image();
          fallback.src = circleMaskDataUri;
          await new Promise((resolve) => {
            fallback.onload = resolve;
            fallback.onerror = resolve;
          });
          mapCtx.globalCompositeOperation = "destination-in";
          mapCtx.drawImage(
            fallback,
            (exportSize - maskPixel) / 2,
            (exportSize - maskPixel) / 2,
            maskPixel,
            maskPixel,
          );
          mapCtx.globalCompositeOperation = "source-over";
        }
      }

      ctx.drawImage(mapCanvas, 0, 0);

      const vignette = ctx.createRadialGradient(
        exportSize / 2,
        exportSize / 2,
        exportSize * 0.35,
        exportSize / 2,
        exportSize / 2,
        exportSize * 0.55,
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.35)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, exportSize, exportSize);

      const dimTextRegion = (centerX: number, centerY: number, radius: number) => {
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, "rgba(0,0,0,0.22)");
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
      };

      const drawPresetText = () => {
        const title = textBoxes[0]?.text?.trim() || "Under these stars";
        const subtitleParts = [
          selectedDate ? formatDisplayDate(selectedDate) : "Choose a date",
          displayLocation.trim() || formState.location.trim() || "Choose a location",
        ];
        const subtitle = subtitleParts.join(" • ");

        const titleFontSize = 24 * scale;
        const subtitleFontSize = 14 * scale;
        ctx.textBaseline = "top";
        ctx.shadowColor = "rgba(0,0,0,0.4)";
        ctx.shadowBlur = 2 * scale;
        ctx.shadowOffsetY = 1 * scale;

        dimTextRegion(exportSize / 2, exportSize * 0.16, exportSize * 0.22);
        dimTextRegion(exportSize / 2, exportSize * 0.82, exportSize * 0.2);

        ctx.fillStyle = textStyles[styleId].color;
        ctx.font = `600 ${titleFontSize}px ${fontOptions.modernSans.stack}`;
        const titleLetter = parseLetterSpacing("0.08em", titleFontSize);
        const titleLines = wrapText(ctx, title, exportSize * 0.6, titleLetter);
        const titleHeight = titleLines.length * titleFontSize * 1.25;
        const titleY = exportSize * 0.16 - titleHeight / 2;
        for (let i = 0; i < titleLines.length; i += 1) {
          drawTextWithSpacing(
            ctx,
            titleLines[i],
            exportSize / 2,
            titleY + i * titleFontSize * 1.25,
            "center",
            titleLetter,
          );
        }

        ctx.globalAlpha = 0.7;
        ctx.font = `500 ${subtitleFontSize}px ${fontOptions.modernSans.stack}`;
        const subLetter = parseLetterSpacing("0.04em", subtitleFontSize);
        const subtitleLines = wrapText(ctx, subtitle, exportSize * 0.56, subLetter);
        const subtitleHeight = subtitleLines.length * subtitleFontSize * 1.4;
        const subtitleY = exportSize * 0.82 - subtitleHeight / 2;
        for (let i = 0; i < subtitleLines.length; i += 1) {
          drawTextWithSpacing(
            ctx,
            subtitleLines[i],
            exportSize / 2,
            subtitleY + i * subtitleFontSize * 1.4,
            "center",
            subLetter,
          );
        }
        ctx.globalAlpha = 1;
      };

      const drawCustomText = () => {
        for (let i = 0; i < textBoxes.length; i += 1) {
          const box = textBoxes[i];
          const isPrimary = i === 0;
          const baseWeight = textStyles[styleId].fontWeight;
          const weightWithStyle = baseWeight + (box.bold ? 150 : 0);
          const fontWeight = isPrimary
            ? Math.max(weightWithStyle, 500)
            : Math.max(weightWithStyle - 50, 450);
          const opacity = isPrimary ? 0.95 : 0.8;
          const lineHeight = isPrimary ? 1.25 : 1.4;
          const fontSize = box.fontSize * scale;
          const maxWidth = exportSize * (
            box.role === "location"
              ? 0.72
              : box.role === "date" && hasTime
                ? 0.68
                : isPrimary
                  ? 0.65
                  : 0.55
          );
          const fontFamily = fontOptions[box.font ?? "modernSans"].stack;
          const fontStyle = box.italic ? "italic " : "";
          const letterSpacing = parseLetterSpacing(textStyles[styleId].letterSpacing, fontSize);

          ctx.font = `${fontStyle}${fontWeight} ${fontSize}px ${fontFamily}`;
          ctx.textBaseline = "top";

          const lines = wrapText(ctx, box.text || " ", maxWidth, letterSpacing);
          const lineHeightPx = fontSize * lineHeight;
          const blockHeight = lines.length * lineHeightPx;
          const textX = percentToPx(box.x, exportSize);
          const textY = percentToPx(box.y, exportSize);
          const align = box.align === "center" ? "center" : "left";
          const boxWidth = maxWidth;
          const blockWidth = Math.min(
            maxWidth,
            Math.max(...lines.map((line) => measureTextWidth(ctx, line, letterSpacing))),
          );
          const paddingX = 10 * scale;
          const paddingY = 6 * scale;
          const centerX = align === "center" ? textX + boxWidth / 2 : textX + blockWidth / 2;
          const centerY = textY + blockHeight / 2;
          const dimRadius = Math.max(blockWidth, blockHeight) * 0.6 + 12 * scale;

          dimTextRegion(centerX, centerY, dimRadius);

          ctx.save();
          ctx.globalAlpha = opacity;
          ctx.fillStyle = box.color ?? textStyles[styleId].color;
          ctx.shadowColor = "rgba(0,0,0,0.4)";
          ctx.shadowBlur = 2 * scale;
          ctx.shadowOffsetY = 1 * scale;

          for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
            const lineY = textY + paddingY + lineIndex * lineHeightPx;
            const lineX = align === "center" ? textX + boxWidth / 2 : textX + paddingX;
            drawTextWithSpacing(ctx, lines[lineIndex], lineX, lineY, align, letterSpacing);
          }
          ctx.restore();
        }
      };

      if (isPresetMode) {
        drawPresetText();
      } else {
        drawCustomText();
      }

      exportCanvas.toBlob((blob) => {
        if (!blob) {
          setExportError("We couldn’t prepare your sky just yet.");
          setIsExporting(false);
          setExportSuccess(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "star-map.png";
        link.click();
        URL.revokeObjectURL(url);
        setIsExporting(false);
        setExportSuccess(true);
      }, "image/png");
    } catch (error) {
      console.error("Export error:", error);
      setExportError("We couldn’t prepare your sky just yet.");
      setIsExporting(false);
      setExportSuccess(false);
    }
  };

  const resetEditor = () => {
    setFormState({ date: "", time: "", location: "" });
    setDisplayLocation("");
    setPendingSubmission(null);
    setCoordinates(null);
    lastSelectedLocation.current = "";
    setOccasion("wedding");
    setStyleId("minimalNoir");
    setShapeId("circle");
    setMode("preset");
    setZoom(1);
    setRotation(0);
    setShowConstellations(false);
    setTextBoxes(presetBoxes.wedding.map((box) => ({ ...box })));
    setHasEditedText(false);
    setLocationLineOptOut(false);
    setDateLineOptOut(false);
    customLayoutInitializedRef.current = false;
    setPreviewMode("preset");
    setStarData({
      stars: presetStarsRef.current,
      planets: [],
      moon: null,
      constellations: [],
    });
    setRenderParams(null);
    setIsGenerating(false);
    setIsLocationOpen(false);
    setLocationSuggestions([]);
    setLocationError(null);
    setExportError(null);
    setExportSuccess(false);
    setShowPrintTips(false);
  };

  const handleLocationInputChange = (nextValue: string) => {
    setFormState((prev) => ({
      ...prev,
      location: nextValue,
    }));
    if (nextValue !== lastSelectedLocation.current) {
      setCoordinates(null);
      lastSelectedLocation.current = "";
    }
  };

  const handleLocationFocus = () => {
    if (locationSuggestions.length > 0) {
      setIsLocationOpen(true);
    }
  };

  const handleSelectLocation = (suggestion: LocationSuggestion) => {
    lastSelectedLocation.current = suggestion.label;
    setFormState((prev) => ({ ...prev, location: suggestion.label }));
    setCoordinates({ lat: suggestion.lat, lon: suggestion.lon });
    setDisplayLocation(suggestion.label);
    setIsLocationOpen(false);
    setLocationSuggestions([]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPendingSubmission(formState);
    if (!formState.date) {
      return;
    }
    if (!coordinates && !formState.location.trim()) {
      return;
    }
    setIsGenerating(true);

    if (coordinates) {
      console.log("Using selected coordinates:", coordinates);
          setRenderParams({
            date: formState.date,
            time: hasTime ? formState.time : undefined,
            coordinates,
          });
          return;
    }
    if (formState.location.trim()) {
      console.log("Geocoding city:", formState.location);
      const coords = await geocodeCity(formState.location);
      console.log("Geocoding result:", coords);
      setCoordinates(coords ? { lat: coords.lat, lon: coords.lon, timezone: coords.timezone } : null);
      if (coords?.label) {
        setDisplayLocation(coords.label);
      } else {
        setDisplayLocation(formState.location.trim());
      }
      if (!coords) {
        setIsGenerating(false);
        setPreviewMode("preset");
        setStarData({
          stars: presetStarsRef.current,
          planets: [],
          moon: null,
          constellations: [],
        });
        return;
      }
      setRenderParams({
        date: formState.date,
        time: hasTime ? formState.time : undefined,
        coordinates: coords,
      });
    }
  };

  useEffect(() => {
    if (!renderParams) return;
    const { date: dateStr, time, coordinates: coords } = renderParams;
    let cancelled = false;
    let timer: number | null = null;
    const start = Date.now();

    const finish = (nextStars: VisibleSky | null) => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 2000 - elapsed);
      timer = window.setTimeout(() => {
        if (cancelled) return;
        if (nextStars) {
          setStarData(nextStars);
          setPreviewMode("generated");
        } else {
          setPreviewMode("preset");
          setStarData({
            stars: presetStarsRef.current,
            planets: [],
            moon: null,
          constellations: [],
        });
        }
        setIsGenerating(false);
      }, remaining);
    };

    try {
      if (!dateStr) {
        finish(null);
        return () => {
          cancelled = true;
          if (timer) window.clearTimeout(timer);
        };
      }

    const visibleStars = computeVisibleStars(
      { date: dateStr, time, lat: coords.lat, lon: coords.lon, showConstellations: true },
      canvasWidth,
      canvasHeight,
    );

      finish(visibleStars);
    } catch (error) {
      console.error("Error computing stars:", error);
      finish(null);
    }

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [renderParams, canvasHeight, canvasWidth]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const style = stylePresets[styleId];
    ctx.save();
    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      width * 0.1,
      width / 2,
      height / 2,
      width * 0.6,
    );
    gradient.addColorStop(0, adjustColor(style.background, 0.06));
    gradient.addColorStop(1, adjustColor(style.background, -0.08));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    if (!noiseCanvasRef.current) {
      const noiseCanvas = document.createElement("canvas");
      noiseCanvas.width = 160;
      noiseCanvas.height = 160;
      const noiseCtx = noiseCanvas.getContext("2d");
      if (noiseCtx) {
        const imageData = noiseCtx.createImageData(noiseCanvas.width, noiseCanvas.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          const shade = Math.floor(Math.random() * 255);
          imageData.data[i] = shade;
          imageData.data[i + 1] = shade;
          imageData.data[i + 2] = shade;
          imageData.data[i + 3] = 18;
        }
        noiseCtx.putImageData(imageData, 0, 0);
        noiseCanvasRef.current = noiseCanvas;
      }
    }
    if (noiseCanvasRef.current) {
      const pattern = ctx.createPattern(noiseCanvasRef.current, "repeat");
      if (pattern) {
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    }

    const rotationRadians = (rotation * Math.PI) / 180;
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(zoom, zoom);
    ctx.rotate(rotationRadians);
    ctx.translate(-width / 2, -height / 2);

    ctx.fillStyle = style.starColor;
    for (const star of starData.stars) {
      const { radius, opacity, blur, halo } = getStarAppearance(star, style);
      if (halo) {
        ctx.save();
        ctx.globalAlpha = halo.opacity;
        ctx.beginPath();
        ctx.arc(star.x, star.y, halo.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = opacity;
      ctx.shadowBlur = blur;
      ctx.shadowColor = `rgba(255,255,255,${opacity * 0.6})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    if (showConstellations && starData.constellations.length > 0) {
      ctx.save();
      const zodiacSign = selectedDate ? getZodiacSign(selectedDate) : null;
      for (const constellation of starData.constellations) {
        const isZodiac = zodiacSign
          ? zodiacConstellations.includes(zodiacSign) &&
            constellation.name.toLowerCase() === zodiacSign.toLowerCase()
          : false;
        ctx.strokeStyle = isZodiac ? "rgba(249, 200, 120, 0.7)" : "rgba(255,255,255,0.18)";
        ctx.lineWidth = isZodiac ? 1.2 / zoom : 0.7 / zoom;
        ctx.beginPath();
        for (const [startIndex, endIndex] of constellation.lines) {
          const start = starData.stars[startIndex];
          const end = starData.stars[endIndex];
          if (!start || !end) continue;
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    for (const planet of starData.planets) {
      const planetStyle = planetStyles[planet.name];
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = planetStyle.color;
      ctx.shadowBlur = 6;
      ctx.shadowColor = planetStyle.color;
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, planetStyle.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (starData.moon) {
      drawMoonIcon(ctx, starData.moon.x, starData.moon.y, 5.2, starData.moon.phase);
    }

    ctx.restore();

    ctx.save();
    const dimTextRegion = (centerX: number, centerY: number, radius: number) => {
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, "rgba(0,0,0,0.22)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
    };

    if (isPresetMode) {
      dimTextRegion(width / 2, height * 0.16, width * 0.22);
      dimTextRegion(width / 2, height * 0.82, width * 0.2);
    } else {
      for (let i = 0; i < textBoxes.length; i += 1) {
        const box = textBoxes[i];
        const isPrimary = i === 0;
        const fontSize = box.fontSize;
        const lineHeight = (isPrimary ? 1.25 : 1.4) * fontSize;
        const maxWidth = width * (
          box.role === "location"
            ? 0.72
            : box.role === "date" && hasTime
              ? 0.68
              : isPrimary
                ? 0.65
                : 0.55
        );
        const letterSpacing = parseLetterSpacing(textStyles[styleId].letterSpacing, fontSize);
        const fontFamily = fontOptions[box.font ?? "modernSans"].stack;
        const fontWeight = Math.max(textStyles[styleId].fontWeight + (box.bold ? 150 : 0), 450);
        const fontStyle = box.italic ? "italic " : "";
        ctx.font = `${fontStyle}${fontWeight} ${fontSize}px ${fontFamily}`;
        const lines = wrapText(ctx, box.text || " ", maxWidth, letterSpacing);
        const blockHeight = lines.length * lineHeight;
        const blockWidth = Math.min(
          maxWidth,
          Math.max(...lines.map((line) => measureTextWidth(ctx, line, letterSpacing))),
        );
        const centerX = box.align === "center"
          ? percentToPx(box.x, width) + maxWidth / 2
          : percentToPx(box.x, width) + blockWidth / 2;
        const centerY = percentToPx(box.y, height) + blockHeight / 2;
        const radius = Math.max(blockWidth, blockHeight) * 0.6 + 12;
        dimTextRegion(centerX, centerY, radius);
      }
    }
    ctx.restore();

    ctx.restore();
  }, [
    starData,
    styleId,
    shapeId,
    isPresetMode,
    textBoxes,
    selectedDate,
    formState.location,
    zoom,
    rotation,
    showConstellations,
    adjustColor,
    stylePresets,
    getStarAppearance,
    planetStyles,
    textStyles,
    fontOptions,
    hasTime,
    wrapText,
    zodiacConstellations,
  ]);

  useEffect(() => {
    const handleMouseMove = (event: PointerEvent) => {
      if (!dragging || !previewRef.current) return;

      const containerRect = previewRef.current.getBoundingClientRect();
      const { id, offsetX, offsetY, width, height } = dragging;

      const rawX = (event.clientX - containerRect.left) / scaleX - offsetX;
      const rawY = (event.clientY - containerRect.top) / scaleY - offsetY;

      const inset = isPresetMode ? safeInset : customInset;
      const minX = inset;
      const minY = inset;
      const maxX = Math.max(minX, canvasWidth - width - inset);
      const maxY = Math.max(minY, canvasHeight - height - inset);
      let nextX = Math.min(Math.max(rawX, minX), maxX);
      let nextY = Math.min(Math.max(rawY, minY), maxY);

      const snapTargetsX = [canvasWidth / 2, canvasWidth / 3, (canvasWidth / 3) * 2];
      const snapTargetsY = [canvasHeight / 2, canvasHeight / 3, (canvasHeight / 3) * 2];
      const centerX = nextX + width / 2;
      const centerY = nextY + height / 2;

      const findSnap = (value: number, targets: number[]) => {
        let closest: number | null = null;
        let closestDist = Number.POSITIVE_INFINITY;
        for (const target of targets) {
          const dist = Math.abs(value - target);
          if (dist < closestDist) {
            closestDist = dist;
            closest = target;
          }
        }
        return closest !== null && closestDist <= snapThreshold ? closest : null;
      };

      const snapX = findSnap(centerX, snapTargetsX);
      const snapY = findSnap(centerY, snapTargetsY);

      if (snapX !== null) {
        nextX = Math.min(Math.max(snapX - width / 2, minX), maxX);
      }
      if (snapY !== null) {
        nextY = Math.min(Math.max(snapY - height / 2, minY), maxY);
      }

      pendingDragRef.current = { id, x: nextX, y: nextY, snapX, snapY };
      if (dragFrameRef.current === null) {
        dragFrameRef.current = window.requestAnimationFrame(() => {
          const pending = pendingDragRef.current;
          if (!pending) {
            dragFrameRef.current = null;
            return;
          }
    setTextBoxes((current) =>
      current.map((box) =>
        box.id === pending.id
          ? {
              ...box,
              x: pxToPercent(pending.x, canvasWidth),
              y: pxToPercent(pending.y, canvasHeight),
            }
          : box,
      ),
    );
          setSnapGuides({ x: pending.snapX, y: pending.snapY });
          pendingDragRef.current = null;
          dragFrameRef.current = null;
        });
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
      setSnapGuides({ x: null, y: null });
      pendingDragRef.current = null;
      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = null;
      }
    };

    if (dragging) {
      window.addEventListener("pointermove", handleMouseMove);
      window.addEventListener("pointerup", handleMouseUp);
      window.addEventListener("pointercancel", handleMouseUp);
    }

    return () => {
      window.removeEventListener("pointermove", handleMouseMove);
      window.removeEventListener("pointerup", handleMouseUp);
      window.removeEventListener("pointercancel", handleMouseUp);
    };
  }, [
    canvasHeight,
    canvasWidth,
    customInset,
    dragging,
    isPresetMode,
    safeInset,
    scaleX,
    scaleY,
    snapThreshold,
    setTextBoxes,
    setSnapGuides,
  ]);

  const handleDragStart = (
    event: ReactPointerEvent<HTMLDivElement>,
    id: number,
  ) => {
    if (!previewRef.current) return;
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    const targetRect = event.currentTarget.getBoundingClientRect();
    const containerRect = previewRef.current.getBoundingClientRect();

    const offsetX = (event.clientX - targetRect.left) / scaleX;
    const offsetY = (event.clientY - targetRect.top) / scaleY;
    const boxMeta = textBoxes.find((b) => b.id === id);
    const isAnchored = boxMeta?.role === "date" || boxMeta?.role === "location";
    const width = targetRect.width / scaleX;
    const height = targetRect.height / scaleY;
    const halfWidth = isAnchored ? 0 : width / 2;
    const halfHeight = isAnchored ? 0 : height / 2;

    setDragging({
      id,
      offsetX,
      offsetY,
      width,
      height,
    });

    const rawX = (event.clientX - containerRect.left) / scaleX - offsetX;
    const rawY = (event.clientY - containerRect.top) / scaleY - offsetY;
    const inset = isPresetMode ? safeInset : 0;
    const minX = inset - halfWidth;
    const minY = inset - halfHeight;
    const maxX = Math.max(minX, canvasWidth - width - inset + halfWidth);
    const maxY = Math.max(minY, canvasHeight - height - inset + halfHeight);
    const clampedX = Math.min(Math.max(rawX, minX), maxX);
    const clampedY = Math.min(Math.max(rawY, minY), maxY);
    setTextBoxes((current) =>
      current.map((box) => {
        if (box.id !== id) return box;
        const updated = {
          ...box,
          x: pxToPercent(clampedX, canvasWidth),
          y: pxToPercent(clampedY, canvasHeight),
        };
        if (box.role === "location" || box.role === "date") {
          updated.isAuto = false;
        }
        return updated;
      }),
    );
    setHasEditedText(true);
  };

  useEffect(() => {
    if (!previewRef.current) return;

    const element = previewRef.current;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      setPreviewSize({ width: rect.width, height: rect.height });
    };

    measure();
    const observer = new ResizeObserver(() => measure());
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const handleOccasionChange = (value: Occasion) => {
    setOccasion(value);
    if (hasEditedText) return;
    setTextBoxes(OCCASION_PRESETS[value].map((box) => ({ ...box })));
  };

  useEffect(() => {
    if (mode !== "custom" || hasEditedText) return;
    setTextBoxes(OCCASION_PRESETS[occasion].map((box) => ({ ...box })));
  }, [mode, occasion, hasEditedText, setTextBoxes]);

  useEffect(() => {
    if (mode !== "custom" || locationLineOptOut) return;
    const locationText = (displayLocation || formState.location).trim();
    if (!locationText) return;

    setTextBoxes((current) => {
      const locationIndex = current.findIndex((box) => box.role === "location");
      if (locationIndex >= 0) {
        const existing = current[locationIndex];
        if (existing.isAuto) {
          const targetX = 2;
          const targetY = 94;
          const targetAlign: TextBox["align"] = "left";
          if (
            existing.text !== locationText ||
            existing.x !== targetX ||
            existing.y !== targetY ||
            existing.align !== targetAlign
          ) {
            const updated = {
              ...existing,
              text: locationText,
              x: targetX,
              y: targetY,
              align: targetAlign,
              fontSize: 10,
            };
            return current.map((box, index) => (index === locationIndex ? updated : box));
          }
        }
        return current;
      }

      if (current.length >= 5) return current;
      const nextId =
        current.length === 0 ? 1 : Math.max(...current.map((box) => box.id)) + 1;
      const locationBox: TextBox = {
        id: nextId,
        text: locationText,
        x: 2,
        y: 94,
        fontSize: 10,
        align: "left",
        color: textStyles[styleId].color,
        font: "modernSans",
        role: "location",
        isAuto: true,
      };

      const next = [...current];
      const insertAt = Math.min(1, next.length);
      next.splice(insertAt, 0, locationBox);
      return next;
    });
  }, [
    canvasHeight,
    canvasWidth,
    formState.location,
    locationLineOptOut,
    mode,
    styleId,
    setTextBoxes,
    textStyles,
  ]);

  useEffect(() => {
    if (mode !== "custom" || dateLineOptOut) return;
    if (!formState.date) return;
    const dateText = selectedDate
      ? hasTime
        ? `${formatDisplayDate(selectedDate)} • ${formatTimeDisplay(formState.time)}`
        : formatDisplayDate(selectedDate)
      : "";
    if (!dateText) return;

    setTextBoxes((current) => {
      const dateIndex = current.findIndex((box) => box.role === "date");
      if (dateIndex >= 0) {
        const existing = current[dateIndex];
        if (existing.isAuto && existing.text !== dateText) {
          const targetX = 2;
          const targetY = 2;
          const updated = {
            ...existing,
            text: dateText,
            x: targetX,
            y: targetY,
            align: "left",
            fontSize: 10,
          };
          return current.map((box, index) => (index === dateIndex ? updated : box));
        }
        return current;
      }

      if (current.length >= 5) return current;
      const nextId =
        current.length === 0 ? 1 : Math.max(...current.map((box) => box.id)) + 1;
      const dateBox: TextBox = {
        id: nextId,
        text: dateText,
        x: 2,
        y: 2,
        fontSize: 10,
        align: "left",
        color: textStyles[styleId].color,
        font: "modernSans",
        role: "date",
        isAuto: true,
      };

      const next = [...current];
      const locationIndex = next.findIndex((box) => box.role === "location");
      const insertAt = locationIndex >= 0 ? Math.max(0, locationIndex) : 1;
      next.splice(insertAt, 0, dateBox);
      return next;
    });
  }, [
    canvasHeight,
    canvasWidth,
    dateLineOptOut,
    formState.date,
    formState.time,
    hasTime,
    mode,
    selectedDate,
    styleId,
    setTextBoxes,
    textStyles,
    formatTimeDisplay,
  ]);

  const updateTextBox = (
    id: number,
    patch: Partial<Omit<TextBox, "id">>,
  ) => {
    let textChanged = false;
    setTextBoxes((current) =>
      current.map((box) => {
        if (box.id === id) {
          const nextBox = { ...box, ...patch };
          if (
            (box.role === "location" || box.role === "date") &&
            box.isAuto &&
            patch.text !== undefined &&
            patch.text !== box.text
          ) {
            nextBox.isAuto = false;
          }
          if (
            (patch.text !== undefined && patch.text !== box.text) ||
            (patch.color !== undefined && patch.color !== box.color) ||
            (patch.fontSize !== undefined && patch.fontSize !== box.fontSize) ||
            (patch.font !== undefined && patch.font !== box.font)
          ) {
            textChanged = true;
          }
          return nextBox;
        }
        return box;
      }),
    );
    if (textChanged) {
      setHasEditedText(true);
    }
  };

  const addTextBox = () => {
    if (textBoxes.length >= 5) return;
    const nextId =
      textBoxes.length === 0 ? 1 : Math.max(...textBoxes.map((b) => b.id)) + 1;
    setTextBoxes((current) => [
      ...current,
      {
        id: nextId,
        text: "New text",
        x: 20 + current.length * 6,
        y: 20 + current.length * 10,
        fontSize: 18,
        align: "left",
        color: textStyles[styleId].color,
        font: "modernSans",
      },
    ]);
    setHasEditedText(true);
  };

  const removeTextBox = (id: number) => {
    setTextBoxes((current) => {
      const target = current.find((box) => box.id === id);
      if (target?.role === "location") {
        setLocationLineOptOut(true);
      } else if (target?.role === "date") {
        setDateLineOptOut(true);
      }
      return current.filter((box) => box.id !== id);
    });
    setHasEditedText(true);
  };
  return (
    <div className="flex min-h-screen justify-center overflow-x-hidden bg-zinc-50 font-sans text-black leading-relaxed dark:bg-black dark:text-zinc-50">
      <main className="flex w-full max-w-5xl flex-col items-center gap-12 px-4 py-12 sm:px-8 lg:px-10">
        <HeroSection />

        <HowItWorksSection />

        <GiftIntroSection />

        <div className="w-full space-y-6 rounded-3xl border border-zinc-200 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                Step 1 · Choose their moment
              </p>
              <p className="text-base text-zinc-700 dark:text-zinc-300">
                Tell us when and where this memory lives.
              </p>
            </div>
            <div className="hidden h-px flex-1 rounded-full bg-gradient-to-r from-transparent via-zinc-300 to-transparent dark:via-zinc-700 sm:block" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
            <MomentForm
              formState={formState}
              coordinates={coordinates}
              locationSuggestions={locationSuggestions}
              isLocationOpen={isLocationOpen}
              isLocationLoading={isLocationLoading}
              locationError={locationError}
              isLocationValid={isLocationValid}
              isActionEnabled={isActionEnabled}
              isGenerating={isGenerating}
              previewMode={previewMode}
              isReadyToReveal={isReadyToReveal}
              locationPopoverRef={locationPopoverRef}
              onDateChange={(next) =>
                setFormState((prev) => ({
                  ...prev,
                  date: next.date ?? "",
                  time: next.time ?? "",
                }))
              }
              onLocationChange={handleLocationInputChange}
              onLocationFocus={handleLocationFocus}
              onSelectLocation={handleSelectLocation}
              onSubmit={handleSubmit}
            />
            <PreviewSection
              isPresetMode={isPresetMode}
              onModeChange={setMode}
              occasion={occasion}
              onOccasionChange={handleOccasionChange}
              styleId={styleId}
              onStyleChange={setStyleId}
              shapeId={shapeId}
              onShapeChange={setShapeId}
              textBoxes={textBoxes}
              selectedDate={selectedDate}
              formState={formState}
              textStyles={textStyles}
              fontOptions={fontOptions}
              textColorPresets={textColorPresets}
              previewMode={previewMode}
              isGenerating={isGenerating}
              zoom={zoom}
              rotation={rotation}
              showConstellations={showConstellations}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onToggleConstellations={setShowConstellations}
              previewRef={previewRef}
              canvasRef={canvasRef}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              getShapeMaskStyle={getShapeMaskStyle}
              scaleX={scaleX}
              scaleY={scaleY}
              hasTime={hasTime}
              dragging={dragging}
              snapGuides={snapGuides}
              onDragStart={handleDragStart}
              formatDisplayDate={formatDisplayDate}
              onUpdateTextBox={updateTextBox}
              onAddTextBox={addTextBox}
              onRemoveTextBox={removeTextBox}
              maxTextBoxes={5}
              onExport={exportStarMap}
              canExport={canExport}
              isExporting={isExporting}
              exportError={exportError}
              exportSuccess={exportSuccess}
              showPrintTips={showPrintTips}
              onTogglePrintTips={() => setShowPrintTips((prev) => !prev)}
              onResetEditor={resetEditor}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
