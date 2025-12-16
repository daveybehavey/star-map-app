"use client";

import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { geocodeCity } from "@/lib/geocode";
import { computeVisibleStars } from "@/lib/astronomy";

type FormState = {
  date: string;
  location: string;
};

type TextBox = {
  id: number;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  align: "left" | "center";
};

type Occasion = "birth" | "wedding" | "anniversary" | "memorial" | "other";
type StyleKey = "minimalNoir" | "celestialInk" | "classicStarMap";

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
  const canvasWidth = 960;
  const canvasHeight = 540;
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

  const presetBoxes: Record<Occasion, TextBox[]> = {
    birth: [
      {
        id: 1,
        text: "The night you arrived",
        x: Math.round(canvasWidth * 0.15),
        y: Math.round(canvasHeight * 0.15),
        fontSize: 22,
        align: "left",
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
      },
    ],
  };

  const [textBoxes, setTextBoxes] = useState<TextBox[]>(presetBoxes.wedding);
  const [dragging, setDragging] = useState<{
    id: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  } | null>(null);

  const scaleX = previewSize.width / canvasWidth || 1;
  const scaleY = previewSize.height / canvasHeight || 1;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPendingSubmission(formState);
    
    if (formState.location.trim()) {
      console.log("Geocoding city:", formState.location);
      const coords = await geocodeCity(formState.location);
      console.log("Geocoding result:", coords);
      setCoordinates(coords);
    } else {
      console.log("No location provided");
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const style = stylePresets[styleId];
    ctx.fillStyle = style.background;
    ctx.fillRect(0, 0, width, height);

    // Only draw stars if we have date, location, and coordinates
    if (!formState.date || !coordinates) {
      console.log("Missing data - date:", formState.date, "coordinates:", coordinates);
      return;
    }

    try {
      // Parse the date string (YYYY-MM-DD format)
      const dateStr = formState.date;
      if (!dateStr) {
        console.error("No date provided");
        return;
      }
      
      // Create date at 11:59 PM local time for the location
      let date: Date;
      
      if (coordinates.timezone) {
        // Use the timezone from geocoding
        // Create a date at midnight UTC for the given date
        const midnightUTC = new Date(`${dateStr}T00:00:00Z`);
        
        // Get what time it is in the target timezone at midnight UTC
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: coordinates.timezone,
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        
        const localTimeAtMidnightUTC = formatter.format(midnightUTC);
        const [localHour, localMin, localSec] = localTimeAtMidnightUTC.split(':').map(Number);
        
        // Calculate how many hours to add to get to 23:59:59 local time
        const hoursToAdd = 23 - localHour;
        const minutesToAdd = 59 - localMin;
        const secondsToAdd = 59 - localSec;
        
        // Add the time to get to 23:59:59 in local timezone
        date = new Date(midnightUTC);
        date.setUTCHours(date.getUTCHours() + hoursToAdd);
        date.setUTCMinutes(date.getUTCMinutes() + minutesToAdd);
        date.setUTCSeconds(date.getUTCSeconds() + secondsToAdd);
      } else {
        // Fallback: estimate timezone from longitude
        // Longitude / 15 gives approximate timezone offset in hours
        const lonHours = coordinates.lon / 15;
        const dateTimeStr = `${dateStr}T23:59:59`;
        const localDate = new Date(dateTimeStr);
        
        // Adjust for longitude-based timezone (UTC offset)
        // UTC offset = -longitude/15 (negative because we're behind UTC if positive longitude)
        const utcOffsetHours = -lonHours;
        const utcOffsetMs = utcOffsetHours * 60 * 60 * 1000;
        date = new Date(localDate.getTime() - utcOffsetMs);
      }
      
      if (isNaN(date.getTime())) {
        console.error("Invalid date:", formState.date);
        return;
      }
      
      console.log("Computing stars for:", {
        date: date.toISOString(),
        localTime: coordinates.timezone 
          ? new Date(date.getTime()).toLocaleString('en-US', { timeZone: coordinates.timezone })
          : 'estimated from longitude',
        timezone: coordinates.timezone || `estimated (lon: ${coordinates.lon})`,
        lat: coordinates.lat,
        lon: coordinates.lon,
        width,
        height
      });
      
      const visibleStars = computeVisibleStars(
        date,
        coordinates.lat,
        coordinates.lon,
        width,
        height
      );

      // Draw stars as simple dots
      ctx.fillStyle = "#ffffff";
      for (const star of visibleStars) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    } catch (error) {
      console.error("Error computing stars:", error);
    }
  }, [formState.date, coordinates, styleId]);

  useEffect(() => {
    const handleMouseMove = (event: PointerEvent) => {
      if (!dragging || !previewRef.current) return;

      const containerRect = previewRef.current.getBoundingClientRect();
      const { id, offsetX, offsetY, width, height } = dragging;

      const rawX = (event.clientX - containerRect.left) / scaleX - offsetX;
      const rawY = (event.clientY - containerRect.top) / scaleY - offsetY;

      const maxX = canvasWidth - width;
      const maxY = canvasHeight - height;
      const nextX = Math.min(Math.max(rawX, 0), Math.max(maxX, 0));
      const nextY = Math.min(Math.max(rawY, 0), Math.max(maxY, 0));

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
    setTextBoxes((current) =>
      current.map((box) =>
        box.id === id ? { ...box, x: rawX, y: rawY } : box,
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
    setTextBoxes(presetBoxes[value].map((box) => ({ ...box })));
  };

  const updateTextBox = (
    id: number,
    patch: Partial<Omit<TextBox, "id">>,
  ) => {
    setTextBoxes((current) =>
      current.map((box) => (box.id === id ? { ...box, ...patch } : box)),
    );
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
      },
    ]);
  };

  return (
    <div className="flex min-h-screen justify-center bg-zinc-50 font-sans text-black dark:bg-black dark:text-zinc-50">
      <main className="flex w-full max-w-5xl flex-col gap-10 px-4 py-12 sm:px-8 lg:px-10">
        <header className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium tracking-tight text-zinc-500 dark:text-zinc-400">
              Star map maker
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Create a personalized star map
            </h1>
          </div>
          <p className="max-w-2xl text-base text-zinc-600 dark:text-zinc-400">
            Start by choosing the date and location to seed your sky. Then add occasion and style, and place your text where you want it.
          </p>
        </header>

        <div className="flex flex-col gap-8 lg:flex-row">
          <form
            className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:w-[420px]"
            onSubmit={handleSubmit}
          >
            <div className="space-y-2">
              <label
                htmlFor="date"
                className="block text-sm font-semibold text-zinc-800 dark:text-zinc-100"
              >
                Date
              </label>
              <input
                id="date"
                name="date"
                type="date"
                value={formState.date}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, date: event.target.value }))
                }
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base shadow-sm outline-none transition hover:border-zinc-300 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:border-zinc-600 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="location"
                className="block text-sm font-semibold text-zinc-800 dark:text-zinc-100"
              >
                Location
              </label>
              <input
                id="location"
                name="location"
                type="text"
                placeholder="City, Country or coordinates"
                value={formState.location}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    location: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base shadow-sm outline-none transition hover:border-zinc-300 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:border-zinc-600 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
                autoComplete="off"
                required
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No preview yet—this captures your inputs for the next step.
              </p>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:bg-white dark:text-black dark:hover:bg-zinc-200 dark:focus-visible:outline-white"
              >
                Generate preview
              </button>
            </div>
          </form>

          <section className="flex-1 space-y-3 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                  Preview
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Stars are randomly placed from the current date and location.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
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
                  Style
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
              </div>
            </div>
            <div
              ref={previewRef}
              className="relative w-full overflow-hidden rounded-xl border border-zinc-200 bg-black dark:border-zinc-800"
              style={{ aspectRatio: `${canvasWidth} / ${canvasHeight}` }}
            >
              <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className="absolute inset-0 z-0 h-full w-full"
                aria-label="Star map preview"
              />
              <div className="absolute inset-0 z-10">
                {textBoxes.map((box) => (
                  <div
                    key={box.id}
                    className="absolute cursor-grab select-none rounded-md bg-black/30 px-2 py-1 text-white touch-none active:cursor-grabbing"
                    style={{
                      left: `${box.x * scaleX}px`,
                      top: `${box.y * scaleY}px`,
                      fontSize: `${box.fontSize}px`,
                      textAlign: box.align,
                      maxWidth: "80%",
                    }}
                    onPointerDown={(event) => handleDragStart(event, box.id)}
                  >
                    {box.text || " "}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                  Text overlays
                </p>
                <button
                  type="button"
                  onClick={addTextBox}
                  disabled={textBoxes.length >= 3}
                  className="rounded-full border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  Add text ({textBoxes.length}/3)
                </button>
              </div>
              <div className="space-y-3">
                {textBoxes.map((box) => (
                  <div
                    key={box.id}
                    className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        value={box.text}
                        onChange={(event) =>
                          updateTextBox(box.id, { text: event.target.value })
                        }
                        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
                        placeholder="Label text"
                      />
                      <div className="flex items-center gap-3 sm:ml-auto">
                        <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                          Size
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
                          Align
                          <select
                            value={box.align}
                            onChange={(event) =>
                              updateTextBox(box.id, {
                                align: event.target.value as TextBox["align"],
                              })
                            }
                            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
                          >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                          </select>
                        </label>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Drag the text directly on the preview. Positions stay within the frame.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
