"use client";

import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  CSSProperties,
  useEffect,
  useRef,
  useState,
} from "react";
import { geocodeCity } from "@/lib/geocode";
import { computeVisibleStars, StarPoint } from "@/lib/astronomy";

type FormState = {
  date: string;
  location: string;
};

type LocationSuggestion = {
  id: string;
  label: string;
  lat: number;
  lon: number;
};

type TextBox = {
  id: number;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  align: "left" | "center";
  color?: string;
  font?: FontKey;
};

type Occasion = "birth" | "wedding" | "anniversary" | "memorial" | "other";
type StyleKey = "minimalNoir" | "celestialInk" | "classicStarMap";
type ShapeKey = "none" | "circle" | "heart" | "star" | "cutDiamond" | "diamondRing" | "angelWings";
type FontKey = "modernSans" | "classicSerif" | "elegantSerif" | "minimalGrotesk";
type ModeKey = "preset" | "custom";
type PreviewMode = "preset" | "generated";

type StylePreset = {
  background: string;
  starColor: string;
  starOpacity: [number, number];
  starSize: [number, number];
  glow: number;
};

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
    location: "",
  });
  const [, setPendingSubmission] = useState<FormState | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number; timezone?: string } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [occasion, setOccasion] = useState<Occasion>("wedding");
  const [styleId, setStyleId] = useState<StyleKey>("minimalNoir");
  const [shapeId, setShapeId] = useState<ShapeKey>("circle");
  const [mode, setMode] = useState<ModeKey>("preset");
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
  };

  const textStyles: Record<StyleKey, { fontWeight: number; letterSpacing: string; color: string }> = {
    minimalNoir: { fontWeight: 400, letterSpacing: "0.01em", color: "#e5e7eb" },
    celestialInk: { fontWeight: 500, letterSpacing: "0.04em", color: "#dbeafe" },
    classicStarMap: { fontWeight: 600, letterSpacing: "0.02em", color: "#f2eadc" },
  };

  const fontOptions: Record<FontKey, { label: string; stack: string }> = {
    modernSans: { label: "Modern Sans", stack: "\"Helvetica Neue\", Arial, sans-serif" },
    classicSerif: { label: "Classic Serif", stack: "Georgia, \"Times New Roman\", serif" },
    elegantSerif: { label: "Elegant Serif", stack: "\"Palatino Linotype\", \"Book Antiqua\", Palatino, serif" },
    minimalGrotesk: { label: "Minimal Grotesk", stack: "\"Gill Sans\", \"Trebuchet MS\", sans-serif" },
  };

  const circleMaskDataUri =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="white"/></svg>',
    );
  const shapeMaskPaths: Partial<Record<ShapeKey, string>> = {
    circle: circleMaskDataUri,
    heart: "/masks/HEART.svg",
    star: "/masks/STAR.svg",
    cutDiamond: "/masks/CUTDIAMOND.svg",
    diamondRing: "/masks/diamonds.svg",
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

  const presetBoxes: Record<Occasion, TextBox[]> = {
    birth: [
      {
        id: 1,
        text: "The night you arrived",
        x: Math.round(canvasWidth * 0.15),
        y: Math.round(canvasHeight * 0.15),
        fontSize: 22,
        align: "left",
        color: textStyles.minimalNoir.color,
        font: "modernSans",
      },
    ],
    wedding: [
      {
        id: 1,
        text: "Under these stars",
        x: Math.round(canvasWidth * 0.35),
        y: Math.round(canvasHeight * 0.45),
        fontSize: 24,
        align: "center",
        color: textStyles.minimalNoir.color,
        font: "modernSans",
      },
    ],
    anniversary: [
      {
        id: 1,
        text: "Where our story began",
        x: Math.round(canvasWidth * 0.2),
        y: Math.round(canvasHeight * 0.2),
        fontSize: 22,
        align: "left",
        color: textStyles.minimalNoir.color,
        font: "modernSans",
      },
    ],
    memorial: [
      {
        id: 1,
        text: "Forever in our hearts",
        x: Math.round(canvasWidth * 0.25),
        y: Math.round(canvasHeight * 0.7),
        fontSize: 22,
        align: "center",
        color: textStyles.minimalNoir.color,
        font: "modernSans",
      },
    ],
    other: [
      {
        id: 1,
        text: "",
        x: Math.round(canvasWidth * 0.1),
        y: Math.round(canvasHeight * 0.1),
        fontSize: 20,
        align: "left",
        color: textStyles.minimalNoir.color,
        font: "modernSans",
      },
    ],
  };

  const [textBoxes, setTextBoxes] = useState<TextBox[]>(presetBoxes.wedding);
  const [hasEditedText, setHasEditedText] = useState(false);
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
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(new Date());
  const datePopoverRef = useRef<HTMLDivElement | null>(null);
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
  const [starData, setStarData] = useState<StarPoint[]>(presetStarsRef.current);
  const [renderParams, setRenderParams] = useState<{
    date: string;
    coordinates: { lat: number; lon: number; timezone?: string };
  } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [showPrintTips, setShowPrintTips] = useState(false);
  const noiseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const pendingDragRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const [snapGuides, setSnapGuides] = useState<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });

  const selectedDate = formState.date
    ? new Date(`${formState.date}T00:00:00`)
    : null;
  const isReadyToReveal = Boolean(formState.date && coordinates);
  const isDateValid = Boolean(formState.date);
  const isLocationValid = Boolean(coordinates);
  const isActionEnabled = isReadyToReveal && !isGenerating;
  const isPresetMode = mode === "preset";
  const canExport = previewMode === "generated" && !isGenerating && !isExporting;

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

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
    const opacity = clamp(opacityBase * (0.85 + noiseA * 0.3), 0.08, 1);
    const radiusJitter = (noiseB - 0.5) * 0.16;
    const radius = Math.max(0.4, size * (0.92 + radiusJitter));
    const blur = noiseB > 0.95 ? radius * 1.2 : 0;
    const halo =
      brightness > 0.9 && noiseA > 0.6
        ? { radius: radius * 6, opacity: 0.06 * brightness }
        : null;
    return { radius, opacity, brightness, blur, halo };
  };

  const changeMonth = (delta: number) => {
    setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  useEffect(() => {
    if (!exportSuccess) return;
    const timeout = window.setTimeout(() => {
      setExportSuccess(false);
      setShowPrintTips(false);
    }, 7000);
    return () => window.clearTimeout(timeout);
  }, [exportSuccess]);

  const changeYear = (delta: number) => {
    setDisplayMonth((prev) => new Date(prev.getFullYear() + delta, prev.getMonth(), 1));
  };

  useEffect(() => {
    if (selectedDate) {
      setDisplayMonth(selectedDate);
    }
  }, [formState.date]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isDateOpen &&
        datePopoverRef.current &&
        !datePopoverRef.current.contains(event.target as Node)
      ) {
        setIsDateOpen(false);
      }
    };
    window.addEventListener("pointerdown", handleClickOutside);
    return () => window.removeEventListener("pointerdown", handleClickOutside);
  }, [isDateOpen]);

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
      } catch (error) {
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

  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ) => {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
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

      mapCtx.fillStyle = style.starColor;
      for (const star of starData) {
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
          formState.location.trim() || "Choose a location",
        ];
        const subtitle = subtitleParts.join(" • ");

        const titleFontSize = 24 * scale;
        const subtitleFontSize = 14 * scale;
        ctx.textBaseline = "top";
        ctx.shadowColor = "rgba(0,0,0,0.4)";
        ctx.shadowBlur = 2 * scale;
        ctx.shadowOffsetY = 1 * scale;

        dimTextRegion(exportSize / 2, exportSize * 0.42, exportSize * 0.24);
        dimTextRegion(exportSize / 2, exportSize * 0.58, exportSize * 0.2);

        ctx.fillStyle = textStyles[styleId].color;
        ctx.font = `600 ${titleFontSize}px ${fontOptions.modernSans.stack}`;
        const titleLetter = parseLetterSpacing("0.08em", titleFontSize);
        const titleLines = wrapText(ctx, title, exportSize * 0.6, titleLetter);
        const titleHeight = titleLines.length * titleFontSize * 1.25;
        const titleY = exportSize * 0.42 - titleHeight / 2;
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
        const subtitleY = exportSize * 0.58 - subtitleHeight / 2;
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
          const fontWeight = isPrimary ? Math.max(baseWeight, 500) : Math.max(baseWeight - 50, 450);
          const opacity = isPrimary ? 0.95 : 0.8;
          const lineHeight = isPrimary ? 1.25 : 1.4;
          const fontSize = box.fontSize * scale;
          const maxWidth = exportSize * (isPrimary ? 0.65 : 0.55);
          const fontFamily = fontOptions[box.font ?? "modernSans"].stack;
          const letterSpacing = parseLetterSpacing(textStyles[styleId].letterSpacing, fontSize);

          ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
          ctx.textBaseline = "top";

          const lines = wrapText(ctx, box.text || " ", maxWidth, letterSpacing);
          const lineHeightPx = fontSize * lineHeight;
          const blockHeight = lines.length * lineHeightPx;
          const textX = box.x * scale;
          const textY = box.y * scale;
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
    setFormState({ date: "", location: "" });
    setPendingSubmission(null);
    setCoordinates(null);
    lastSelectedLocation.current = "";
    setOccasion("wedding");
    setStyleId("minimalNoir");
    setShapeId("circle");
    setMode("preset");
    setTextBoxes(presetBoxes.wedding.map((box) => ({ ...box })));
    setHasEditedText(false);
    setPreviewMode("preset");
    setStarData(presetStarsRef.current);
    setRenderParams(null);
    setIsGenerating(false);
    setIsDateOpen(false);
    setIsLocationOpen(false);
    setLocationSuggestions([]);
    setLocationError(null);
    setDisplayMonth(new Date());
    setExportError(null);
    setExportSuccess(false);
    setShowPrintTips(false);
  };

  const buildCalendarGrid = (monthDate: Date) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = firstOfMonth.getDay(); // Sunday start
    const startDate = new Date(year, month, 1 - startOffset);
    const days: Date[] = [];
    for (let i = 0; i < 42; i += 1) {
      const cell = new Date(startDate);
      cell.setDate(startDate.getDate() + i);
      days.push(cell);
    }
    return days;
  };

  const handleSelectDate = (dateValue: Date) => {
    const iso = dateValue.toISOString().slice(0, 10);
    setFormState((prev) => ({ ...prev, date: iso }));
    setIsDateOpen(false);
  };

  const handleSelectLocation = (suggestion: LocationSuggestion) => {
    lastSelectedLocation.current = suggestion.label;
    setFormState((prev) => ({ ...prev, location: suggestion.label }));
    setCoordinates({ lat: suggestion.lat, lon: suggestion.lon });
    setIsLocationOpen(false);
    setLocationSuggestions([]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPendingSubmission(formState);
    if (!formState.date) {
      setIsDateOpen(true);
      return;
    }
    if (!coordinates && !formState.location.trim()) {
      return;
    }
    setIsGenerating(true);

    if (coordinates) {
      console.log("Using selected coordinates:", coordinates);
      setRenderParams({ date: formState.date, coordinates });
      return;
    }
    if (formState.location.trim()) {
      console.log("Geocoding city:", formState.location);
      const coords = await geocodeCity(formState.location);
      console.log("Geocoding result:", coords);
      setCoordinates(coords);
      if (!coords) {
        setIsGenerating(false);
        setPreviewMode("preset");
        setStarData(presetStarsRef.current);
        return;
      }
      setRenderParams({ date: formState.date, coordinates: coords });
    }
  };

  useEffect(() => {
    if (!renderParams) return;
    const { date: dateStr, coordinates: coords } = renderParams;
    let cancelled = false;
    let timer: number | null = null;
    const start = Date.now();

    const finish = (nextStars: StarPoint[] | null) => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 2000 - elapsed);
      timer = window.setTimeout(() => {
        if (cancelled) return;
        if (nextStars) {
          setStarData(nextStars);
          setPreviewMode("generated");
        } else {
          setPreviewMode("preset");
          setStarData(presetStarsRef.current);
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

      // Create date at 11:59 PM local time for the location
      let date: Date;

      if (coords.timezone) {
        const midnightUTC = new Date(`${dateStr}T00:00:00Z`);
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: coords.timezone,
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        const localTimeAtMidnightUTC = formatter.format(midnightUTC);
        const [localHour, localMin, localSec] = localTimeAtMidnightUTC.split(":").map(Number);
        const hoursToAdd = 23 - localHour;
        const minutesToAdd = 59 - localMin;
        const secondsToAdd = 59 - localSec;

        date = new Date(midnightUTC);
        date.setUTCHours(date.getUTCHours() + hoursToAdd);
        date.setUTCMinutes(date.getUTCMinutes() + minutesToAdd);
        date.setUTCSeconds(date.getUTCSeconds() + secondsToAdd);
      } else {
        const lonHours = coords.lon / 15;
        const dateTimeStr = `${dateStr}T23:59:59`;
        const localDate = new Date(dateTimeStr);
        const utcOffsetHours = -lonHours;
        const utcOffsetMs = utcOffsetHours * 60 * 60 * 1000;
        date = new Date(localDate.getTime() - utcOffsetMs);
      }

      if (isNaN(date.getTime())) {
        finish(null);
        return () => {
          cancelled = true;
          if (timer) window.clearTimeout(timer);
        };
      }

      const visibleStars = computeVisibleStars(
        date,
        coords.lat,
        coords.lon,
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

    ctx.fillStyle = style.starColor;
    for (const star of starData) {
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

    ctx.save();
    const dimTextRegion = (centerX: number, centerY: number, radius: number) => {
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, "rgba(0,0,0,0.22)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
    };

    if (isPresetMode) {
      dimTextRegion(width / 2, height * 0.42, width * 0.24);
      dimTextRegion(width / 2, height * 0.58, width * 0.2);
    } else {
      for (let i = 0; i < textBoxes.length; i += 1) {
        const box = textBoxes[i];
        const isPrimary = i === 0;
        const fontSize = box.fontSize;
        const lineHeight = (isPrimary ? 1.25 : 1.4) * fontSize;
        const maxWidth = width * (isPrimary ? 0.65 : 0.55);
        const letterSpacing = parseLetterSpacing(textStyles[styleId].letterSpacing, fontSize);
        const fontFamily = fontOptions[box.font ?? "modernSans"].stack;
        ctx.font = `${Math.max(textStyles[styleId].fontWeight, 450)} ${fontSize}px ${fontFamily}`;
        const lines = wrapText(ctx, box.text || " ", maxWidth, letterSpacing);
        const blockHeight = lines.length * lineHeight;
        const blockWidth = Math.min(
          maxWidth,
          Math.max(...lines.map((line) => measureTextWidth(ctx, line, letterSpacing))),
        );
        const centerX = box.align === "center" ? box.x + maxWidth / 2 : box.x + blockWidth / 2;
        const centerY = box.y + blockHeight / 2;
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
  ]);

  useEffect(() => {
    const handleMouseMove = (event: PointerEvent) => {
      if (!dragging || !previewRef.current) return;

      const containerRect = previewRef.current.getBoundingClientRect();
      const { id, offsetX, offsetY, width, height } = dragging;

      const rawX = (event.clientX - containerRect.left) / scaleX - offsetX;
      const rawY = (event.clientY - containerRect.top) / scaleY - offsetY;

      const minX = safeInset;
      const minY = safeInset;
      const maxX = Math.max(minX, canvasWidth - width - safeInset);
      const maxY = Math.max(minY, canvasHeight - height - safeInset);
      const nextX = Math.min(Math.max(rawX, minX), maxX);
      const nextY = Math.min(Math.max(rawY, minY), maxY);

      setTextBoxes((current) =>
        current.map((box) =>
          box.id === id ? { ...box, x: nextX, y: nextY } : box,
        ),
      );
    };

    const handleMouseUp = () => setDragging(null);

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
  }, [canvasHeight, canvasWidth, dragging, scaleX, scaleY]);

  const handleDragStart = (
    event: ReactPointerEvent<HTMLDivElement>,
    id: number,
  ) => {
    if (!previewRef.current) return;
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.preventDefault();

    const targetRect = event.currentTarget.getBoundingClientRect();
    const containerRect = previewRef.current.getBoundingClientRect();

    const offsetX = (event.clientX - targetRect.left) / scaleX;
    const offsetY = (event.clientY - targetRect.top) / scaleY;

    setDragging({
      id,
      offsetX,
      offsetY,
      width: targetRect.width / scaleX,
      height: targetRect.height / scaleY,
    });

    const rawX = (event.clientX - containerRect.left) / scaleX - offsetX;
    const rawY = (event.clientY - containerRect.top) / scaleY - offsetY;
    const minX = safeInset;
    const minY = safeInset;
    const maxX = Math.max(minX, canvasWidth - (targetRect.width / scaleX) - safeInset);
    const maxY = Math.max(minY, canvasHeight - (targetRect.height / scaleY) - safeInset);
    const clampedX = Math.min(Math.max(rawX, minX), maxX);
    const clampedY = Math.min(Math.max(rawY, minY), maxY);
    setTextBoxes((current) =>
      current.map((box) =>
        box.id === id ? { ...box, x: clampedX, y: clampedY } : box,
      ),
    );
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
    setTextBoxes(presetBoxes[value].map((box) => ({ ...box })));
  };

  const updateTextBox = (
    id: number,
    patch: Partial<Omit<TextBox, "id">>,
  ) => {
    let textChanged = false;
    setTextBoxes((current) =>
      current.map((box) => {
        if (box.id === id) {
          if (
            (patch.text !== undefined && patch.text !== box.text) ||
            (patch.color !== undefined && patch.color !== box.color) ||
            (patch.fontSize !== undefined && patch.fontSize !== box.fontSize) ||
            (patch.font !== undefined && patch.font !== box.font)
          ) {
            textChanged = true;
          }
          return { ...box, ...patch };
        }
        return box;
      }),
    );
    if (textChanged) {
      setHasEditedText(true);
    }
  };

  const addTextBox = () => {
    if (textBoxes.length >= 3) return;
    const nextId =
      textBoxes.length === 0 ? 1 : Math.max(...textBoxes.map((b) => b.id)) + 1;
    setTextBoxes((current) => [
      ...current,
      {
        id: nextId,
        text: "New text",
        x: 120 + current.length * 24,
        y: 120 + current.length * 24,
        fontSize: 18,
        align: "left",
        color: textStyles[styleId].color,
        font: "modernSans",
      },
    ]);
    setHasEditedText(true);
  };

  const removeTextBox = (id: number) => {
    setTextBoxes((current) => current.filter((box) => box.id !== id));
    setHasEditedText(true);
  };
  return (
    <div className="flex min-h-screen justify-center overflow-x-hidden bg-zinc-50 font-sans text-black leading-relaxed dark:bg-black dark:text-zinc-50">
      <main className="flex w-full max-w-5xl flex-col items-center gap-12 px-4 py-12 sm:px-8 lg:px-10">
        <section className="w-full space-y-6 rounded-3xl border border-zinc-200 bg-white/80 p-8 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              Custom star map keepsake
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
              Capture a moment under the night sky
            </h1>
            <p className="max-w-2xl text-base text-zinc-600 dark:text-zinc-300">
              Create a custom star map from a meaningful date and location, then reveal a night sky that feels like a personalized gift.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {["First dance", "New arrival", "Forever night"].map((label) => (
              <div
                key={label}
                className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-4 text-white shadow-sm dark:border-zinc-800"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-300">
                  {label}
                </p>
                <div className="mt-6 h-24 rounded-xl border border-white/10 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.6),transparent_40%),radial-gradient(circle_at_70%_60%,rgba(255,255,255,0.4),transparent_45%)]" />
                <p className="mt-4 text-xs text-zinc-300">
                  Custom star map • Night sky keepsake
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="w-full space-y-4 rounded-3xl border border-zinc-200 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            How it works
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              "Choose a date to anchor your custom star map.",
              "Choose a location so the night sky matches your memory.",
              "Reveal your night sky and keep the moment close.",
            ].map((step, index) => (
              <div
                key={step}
                className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
                  Step {index + 1}
                </p>
                <p className="mt-2 text-base text-zinc-700 dark:text-zinc-200">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </section>

        <header className="space-y-4 rounded-3xl border border-zinc-200 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              Gift their night sky
            </p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Bottle a moment under the stars
            </h2>
          </div>
          <p className="max-w-2xl text-base text-zinc-600 dark:text-zinc-300">
            Choose a date and place and we paint the exact night sky—ready to share as a calm, magical keepsake.
          </p>
        </header>

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
            <form
              className="w-full space-y-6 rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              onSubmit={handleSubmit}
            >
              <div className="relative space-y-2" ref={datePopoverRef}>
                <label
                  htmlFor="date"
                  className="block text-base font-semibold text-zinc-800 dark:text-zinc-100"
                >
                  Date of the moment
                </label>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Pick the exact night you want to honor.
                </p>
                {!formState.date ? (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    Pick a date to begin.
                  </p>
                ) : null}
                <button
                  type="button"
                  id="date"
                  aria-haspopup="dialog"
                  aria-expanded={isDateOpen}
                  onClick={() => setIsDateOpen((prev) => !prev)}
                  className={`flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-base shadow-sm transition-all focus:shadow-sm dark:bg-zinc-800 dark:text-zinc-50 ${
                    isDateValid
                      ? "border-emerald-200 ring-1 ring-emerald-100 hover:border-emerald-300 dark:border-emerald-700/60 dark:ring-emerald-900/40"
                      : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                  } focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:focus:border-zinc-500 dark:focus:ring-zinc-800`}
                >
                  <span>{formatDisplayDate(selectedDate)}</span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">▾</span>
                </button>
                {isDateOpen ? (
                  <div className="absolute z-30 mt-2 w-80 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => changeYear(-1)}
                          className="rounded-md border border-zinc-200 px-2 py-1 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                          aria-label="Previous year"
                        >
                          «
                        </button>
                        <button
                          type="button"
                          onClick={() => changeMonth(-1)}
                          className="rounded-md border border-zinc-200 px-2 py-1 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                          aria-label="Previous month"
                        >
                          ←
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        {displayMonth.toLocaleDateString(undefined, {
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => changeMonth(1)}
                          className="rounded-md border border-zinc-200 px-2 py-1 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                          aria-label="Next month"
                        >
                          →
                        </button>
                        <button
                          type="button"
                          onClick={() => changeYear(1)}
                          className="rounded-md border border-zinc-200 px-2 py-1 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                          aria-label="Next year"
                        >
                          »
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                        <span key={d}>{d}</span>
                      ))}
                    </div>
                    <div className="mt-2 grid grid-cols-7 gap-2">
                      {buildCalendarGrid(displayMonth).map((day) => {
                        const isCurrentMonth = day.getMonth() === displayMonth.getMonth();
                        const isSelected =
                          selectedDate &&
                          day.getFullYear() === selectedDate.getFullYear() &&
                          day.getMonth() === selectedDate.getMonth() &&
                          day.getDate() === selectedDate.getDate();
                        return (
                          <button
                            key={day.toISOString()}
                            type="button"
                            onClick={() => handleSelectDate(day)}
                            className={[
                              "h-10 rounded-lg text-sm font-medium transition",
                              isSelected
                                ? "bg-black text-white shadow-sm dark:bg-white dark:text-black"
                                : isCurrentMonth
                                  ? "bg-white text-zinc-800 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                                  : "bg-white text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-600 dark:hover:bg-zinc-800",
                              "border border-zinc-200 dark:border-zinc-700",
                            ].join(" ")}
                          >
                            {day.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="relative space-y-2" ref={locationPopoverRef}>
                <label
                  htmlFor="location"
                  className="block text-base font-semibold text-zinc-800 dark:text-zinc-100"
                >
                  Place in the world
                </label>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Type the city or special spot where the memory happened.
                </p>
                {!coordinates ? (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    Choose a place on Earth.
                  </p>
                ) : null}
                <input
                  id="location"
                  name="location"
                  type="text"
                  placeholder="City, region, country"
                  value={formState.location}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setFormState((prev) => ({
                      ...prev,
                      location: nextValue,
                    }));
                    if (nextValue !== lastSelectedLocation.current) {
                      setCoordinates(null);
                      lastSelectedLocation.current = "";
                    }
                  }}
                  onFocus={() => {
                    if (locationSuggestions.length > 0) {
                      setIsLocationOpen(true);
                    }
                  }}
                  className={`w-full rounded-xl border bg-white px-4 py-3 text-base shadow-sm outline-none transition-all focus:shadow-sm dark:bg-zinc-800 dark:text-zinc-50 ${
                    isLocationValid
                      ? "border-emerald-200 ring-1 ring-emerald-100 hover:border-emerald-300 dark:border-emerald-700/60 dark:ring-emerald-900/40"
                      : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                  } focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:focus:border-zinc-500 dark:focus:ring-zinc-800`}
                  autoComplete="off"
                  required
                />
                {isLocationOpen && formState.location.trim().length >= 2 ? (
                  <div className="absolute z-30 mt-2 w-full rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                    {isLocationLoading ? (
                      <div className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                        Searching...
                      </div>
                    ) : locationSuggestions.length > 0 ? (
                      <div className="space-y-1">
                        {locationSuggestions.map((suggestion) => (
                          <button
                            key={suggestion.id}
                            type="button"
                            onClick={() => handleSelectLocation(suggestion)}
                            className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:outline-zinc-500"
                          >
                            {suggestion.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                        {locationError || "No matches found."}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  When you&apos;re ready, reveal the sky for their moment.
                </p>
                <button
                  type="submit"
                  disabled={!isActionEnabled}
                  aria-disabled={!isActionEnabled}
                  className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-black via-zinc-900 to-black px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-black/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0 dark:from-white dark:via-zinc-100 dark:to-white dark:text-black dark:shadow-white/20 dark:hover:shadow-white/30 sm:w-auto"
                >
                  {isGenerating
                    ? "Aligning the stars..."
                    : previewMode === "generated"
                      ? "Update sky"
                      : isReadyToReveal
                        ? "Ready to reveal"
                        : "Reveal their night sky"}
                </button>
              </div>
            </form>

            <section className="flex-1 min-w-0 space-y-4 rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                    Step 2 · Preview their sky
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    See the keepsake and nudge the words until it feels just right.
                  </p>
                </div>
                <div className="hidden h-px flex-1 rounded-full bg-gradient-to-r from-transparent via-zinc-300 to-transparent dark:via-zinc-700 sm:block" />
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                    Preview
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    We map the sky for that date and place. Your print will mirror this view.
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Each star is placed from real positions for that night—quietly accurate and true.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                  <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-1 py-1 text-xs font-semibold text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    <button
                      type="button"
                      onClick={() => setMode("preset")}
                      className={`rounded-full px-3 py-1 transition ${
                        isPresetMode
                          ? "bg-black text-white shadow-sm dark:bg-white dark:text-black"
                          : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                      }`}
                    >
                      Preset
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("custom")}
                      className={`rounded-full px-3 py-1 transition ${
                        !isPresetMode
                          ? "bg-black text-white shadow-sm dark:bg-white dark:text-black"
                          : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                  <label className="flex items-center gap-2" htmlFor="occasion">
                    Occasion
                    <select
                      id="occasion"
                      value={occasion}
                      onChange={(event) =>
                        handleOccasionChange(event.target.value as Occasion)
                      }
                      className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
                    >
                      <option value="birth">Birth</option>
                      <option value="wedding">Wedding</option>
                      <option value="anniversary">Anniversary</option>
                      <option value="memorial">Memorial</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2" htmlFor="style">
                    Look
                    <select
                      id="style"
                      value={styleId}
                      onChange={(event) =>
                        setStyleId(event.target.value as StyleKey)
                      }
                      className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
                    >
                      <option value="minimalNoir">Minimal Noir</option>
                      <option value="celestialInk">Celestial Ink</option>
                      <option value="classicStarMap">Classic Star Map</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2" htmlFor="shape">
                    Shape
                    <select
                      id="shape"
                      value={shapeId}
                      onChange={(event) => setShapeId(event.target.value as ShapeKey)}
                      className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
                    >
                      <option value="none">No filter</option>
                      <option value="circle">Circle</option>
                      <option value="heart">Heart</option>
                      <option value="star">Star</option>
                      <option value="cutDiamond">Cut diamond</option>
                      <option value="diamondRing">Diamond</option>
                      <option value="angelWings">Angel wings</option>
                    </select>
                  </label>
                </div>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Preset keeps things simple. Custom gives you full control.
              </p>
              <div className="min-w-0 rounded-[28px] border border-zinc-200 bg-white/80 p-5 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.6)] dark:border-zinc-800 dark:bg-zinc-900/70">
                <div className="rounded-[22px] border border-zinc-200/70 bg-gradient-to-br from-zinc-50 via-white to-zinc-100 p-4 shadow-inner dark:border-zinc-800/80 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
                <div
                  ref={previewRef}
                  className={`relative w-full overflow-hidden rounded-lg border border-zinc-200 bg-black shadow-xl ring-1 ring-black/5 transition-opacity duration-300 dark:border-zinc-800 dark:ring-white/10 ${
                    isGenerating ? "opacity-70" : "opacity-100"
                  }`}
                  style={{ aspectRatio: `${canvasWidth} / ${canvasHeight}` }}
                >
                  <div className="pointer-events-none absolute inset-0" style={getShapeMaskStyle(shapeId)}>
                    <canvas
                      ref={canvasRef}
                      width={canvasWidth}
                      height={canvasHeight}
                      className="absolute inset-0 z-0 h-full w-full"
                      aria-label="Star map preview"
                    />
                  </div>
                  <div className="absolute inset-0 z-20">
                    {isPresetMode ? (
                      (() => {
                        const title = textBoxes[0]?.text?.trim() || "Under these stars";
                        const subtitleParts = [
                          selectedDate ? formatDisplayDate(selectedDate) : "Choose a date",
                          formState.location.trim() || "Choose a location",
                        ];
                        const subtitle = subtitleParts.join(" • ");
                        return (
                          <>
                            <div
                              className="absolute left-1/2 top-[42%] max-w-[60%] -translate-x-1/2 -translate-y-1/2 text-center"
                              style={{
                                fontFamily: fontOptions.modernSans.stack,
                                fontWeight: 600,
                                letterSpacing: "0.08em",
                                color: textStyles[styleId].color,
                                lineHeight: 1.25,
                          textShadow: "0 1px 4px rgba(0,0,0,0.4)",
                              }}
                            >
                              <p className="text-lg">{title}</p>
                            </div>
                            <div
                              className="absolute left-1/2 top-[58%] max-w-[56%] -translate-x-1/2 -translate-y-1/2 text-center"
                              style={{
                                fontFamily: fontOptions.modernSans.stack,
                                fontWeight: 500,
                                letterSpacing: "0.04em",
                                color: textStyles[styleId].color,
                                opacity: 0.7,
                                lineHeight: 1.4,
                                textShadow: "0 1px 4px rgba(0,0,0,0.4)",
                              }}
                            >
                              <p className="text-sm">{subtitle}</p>
                            </div>
                          </>
                        );
                      })()
                    ) : (
                      textBoxes.map((box, index) => {
                        const isPrimary = index === 0;
                        const baseWeight = textStyles[styleId].fontWeight;
                        const primaryWeight = Math.max(baseWeight, 500);
                        const secondaryWeight = Math.max(baseWeight - 50, 450);
                        const overlayWeight = isPrimary ? primaryWeight : secondaryWeight;
                        const overlayOpacity = isPrimary ? 0.95 : 0.8;
                        const overlayMaxWidth = isPrimary ? "65%" : "55%";
                        const overlayFontFamily = fontOptions[box.font ?? "modernSans"].stack;
                        return (
                          <div
                            key={box.id}
                            className="absolute select-none rounded-md bg-black/30 px-2 py-1 text-white touch-none cursor-grab active:cursor-grabbing"
                            style={{
                              left: `${box.x * scaleX}px`,
                              top: `${box.y * scaleY}px`,
                              fontSize: `${box.fontSize}px`,
                              textAlign: box.align,
                              fontWeight: overlayWeight,
                              letterSpacing: textStyles[styleId].letterSpacing,
                              color: box.color ?? textStyles[styleId].color,
                              fontFamily: overlayFontFamily,
                              lineHeight: isPrimary ? 1.25 : 1.4,
                              opacity: overlayOpacity,
                              maxWidth: overlayMaxWidth,
                              whiteSpace: "pre-wrap",
                              wordBreak: "keep-all",
                              textShadow: "0 1px 4px rgba(0,0,0,0.4)",
                            }}
                            onPointerDown={(event) => handleDragStart(event, box.id)}
                          >
                            {box.text || " "}
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="pointer-events-none absolute inset-0 z-10">
                    <div className="absolute inset-0 rounded-lg bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_60%,rgba(0,0,0,0.35)_100%)]" />
                  </div>
                  {previewMode === "preset" ? (
                    <div className="pointer-events-none absolute left-4 top-4 z-30 rounded-full bg-black/60 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/80">
                      Preset preview
                    </div>
                  ) : null}
                  {isGenerating ? (
                    <div className="absolute inset-0 z-30 flex items-center justify-center">
                      <p className="rounded-full bg-black/60 px-4 py-2 text-sm text-white/90 transition-opacity duration-300 animate-pulse">
                        Aligning the stars...
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
              </div>
              {isPresetMode ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
                    Preset text
                  </p>
                  <div className="mt-3 space-y-2">
                    <label className="block text-xs font-medium uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
                      Message
                      <input
                        type="text"
                        value={textBoxes[0]?.text || ""}
                        onChange={(event) => updateTextBox(textBoxes[0]?.id ?? 1, { text: event.target.value })}
                        placeholder="Under these stars"
                        className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
                      />
                    </label>
                    <p>
                      <span className="text-zinc-500">Date:</span>{" "}
                      {selectedDate ? formatDisplayDate(selectedDate) : "Choose a date"}
                    </p>
                    <p>
                      <span className="text-zinc-500">Location:</span>{" "}
                      {formState.location.trim() || "Choose a location"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      Your words on the print
                    </p>
                    <button
                      type="button"
                      onClick={addTextBox}
                      disabled={textBoxes.length >= 3}
                      className="rounded-full border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                      Add a line ({textBoxes.length}/3)
                    </button>
                  </div>
                  <div className="space-y-3">
                    {textBoxes.map((box) => (
                      <div
                        key={box.id}
                        className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                            Line {box.id}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeTextBox(box.id)}
                            className="text-sm font-semibold text-red-500 transition hover:text-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 dark:text-red-300 dark:hover:text-red-200"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <input
                            type="text"
                            value={box.text}
                            onChange={(event) =>
                              updateTextBox(box.id, { text: event.target.value })
                            }
                            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
                            placeholder="Write a note or names"
                          />
                        <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
                          <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                            Text size
                            <input
                              type="number"
                              min={10}
                              max={48}
                              value={box.fontSize}
                              onChange={(event) =>
                                updateTextBox(box.id, {
                                  fontSize:
                                    Number(event.target.value) || box.fontSize,
                                })
                              }
                              className="w-16 rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
                            />
                          </label>
                          <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                            Font
                            <select
                              value={box.font ?? "modernSans"}
                              onChange={(event) =>
                                updateTextBox(box.id, { font: event.target.value as FontKey })
                              }
                              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
                            >
                              {Object.entries(fontOptions).map(([key, option]) => (
                                <option key={key} value={key}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                            Color
                          </span>
                          {textColorPresets.map((preset) => {
                            const isActive = box.color
                              ? box.color === preset.value
                              : preset.value === textStyles[styleId].color;
                            return (
                              <button
                                key={preset.value}
                                type="button"
                                onClick={() => updateTextBox(box.id, { color: preset.value })}
                                className={`flex h-8 w-8 items-center justify-center rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                                  isActive
                                    ? "border-zinc-800 ring-2 ring-zinc-200 dark:border-white dark:ring-zinc-700"
                                    : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
                                }`}
                                aria-label={`Set color to ${preset.label}`}
                                style={{ backgroundColor: preset.value }}
                              />
                            );
                          })}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Drag the words right on the preview—keep them inside the frame.
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {previewMode === "generated" ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={exportStarMap}
                    disabled={!canExport}
                    className={`inline-flex w-full items-center justify-center rounded-full border border-zinc-200/80 bg-white/90 px-5 py-3 text-sm font-semibold text-zinc-900 shadow-[0_14px_30px_-24px_rgba(24,24,27,0.6)] ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_36px_-24px_rgba(24,24,27,0.7)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none dark:border-zinc-700/80 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-white/10 dark:hover:bg-zinc-800 ${
                      isExporting ? "opacity-75 animate-pulse" : "opacity-100"
                    }`}
                  >
                    {isExporting ? "Preparing your night sky..." : "Download star map"}
                  </button>
                  {exportError ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {exportError}
                    </p>
                  ) : null}
                  <div
                    className={`overflow-hidden transition-[max-height,opacity] duration-500 ${
                      exportSuccess ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    }`}
                    aria-hidden={!exportSuccess}
                  >
                    <div className="mt-3 rounded-2xl border border-white/70 bg-white/70 p-4 text-sm text-zinc-700 shadow-[0_18px_40px_-32px_rgba(0,0,0,0.6)] backdrop-blur-sm dark:border-zinc-700/60 dark:bg-zinc-900/60 dark:text-zinc-100">
                      <p className="font-medium">Your star map is ready.</p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Saved to your device.
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={resetEditor}
                          className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          Create another
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPrintTips((prev) => !prev)}
                          className="text-xs font-semibold text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                        >
                          Print tips
                        </button>
                      </div>
                      {showPrintTips ? (
                        <div className="mt-3 rounded-xl border border-white/70 bg-white/60 p-3 text-xs text-zinc-600 shadow-sm dark:border-zinc-700/60 dark:bg-zinc-900/60 dark:text-zinc-300">
                          <p>Choose a soft matte paper with generous breathing room.</p>
                          <p className="mt-1">Deep black inks look best on thicker stock.</p>
                          <p className="mt-1">Let the print rest before framing.</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
