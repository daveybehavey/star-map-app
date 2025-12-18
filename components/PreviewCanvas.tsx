"use client";

import { PointerEvent as ReactPointerEvent, RefObject, CSSProperties } from "react";
import { FormState, FontKey, PreviewMode, ShapeKey, StyleKey, TextBox } from "@/lib/types";

type PreviewCanvasProps = {
  previewRef: RefObject<HTMLDivElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  canvasWidth: number;
  canvasHeight: number;
  shapeId: ShapeKey;
  getShapeMaskStyle: (shape: ShapeKey) => CSSProperties & { WebkitMaskImage?: string };
  isGenerating: boolean;
  previewMode: PreviewMode;
  isPresetMode: boolean;
  textBoxes: TextBox[];
  selectedDate: Date | null;
  formState: FormState;
  textStyles: Record<StyleKey, { fontWeight: number; letterSpacing: string; color: string }>;
  fontOptions: Record<FontKey, { label: string; stack: string }>;
  styleId: StyleKey;
  scaleX: number;
  scaleY: number;
  hasTime: boolean;
  dragging: {
    id: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  } | null;
  snapGuides: { x: number | null; y: number | null };
  onDragStart: (event: ReactPointerEvent<HTMLDivElement>, id: number) => void;
  formatDisplayDate: (dateValue: Date | null) => string;
};

export default function PreviewCanvas({
  previewRef,
  canvasRef,
  canvasWidth,
  canvasHeight,
  shapeId,
  getShapeMaskStyle,
  isGenerating,
  previewMode,
  isPresetMode,
  textBoxes,
  selectedDate,
  formState,
  textStyles,
  fontOptions,
  styleId,
  scaleX,
  scaleY,
  hasTime,
  dragging,
  snapGuides,
  onDragStart,
  formatDisplayDate,
}: PreviewCanvasProps) {
  const filledBoxes =
    isPresetMode && textBoxes.length
      ? textBoxes.map((box) => {
          const formattedDate = selectedDate ? formatDisplayDate(selectedDate) : "Date";
          const locationText = formState.location.trim() || "Location";
          let nextText = box.text;
          if (nextText.includes("[Date]")) {
            nextText = nextText.replace("[Date]", formattedDate);
          }
          if (nextText.includes("[Location]")) {
            nextText = nextText.replace("[Location]", locationText);
          }
          return { ...box, text: nextText };
        })
      : textBoxes;

  const renderedBoxes = filledBoxes.filter(
    (box) => !(box.text.includes("[Date]") || box.text.includes("[Location]")),
  );

  return (
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
                const title = renderedBoxes[0]?.text?.trim() || "Under these stars";
                const subtitle = renderedBoxes[1]?.text?.trim() || "";
                return (
                  <>
                    <div
                      className="absolute left-1/2 top-[16%] max-w-[60%] -translate-x-1/2 -translate-y-1/2 text-center"
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
                      className="absolute left-1/2 top-[82%] max-w-[56%] -translate-x-1/2 -translate-y-1/2 text-center"
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
              renderedBoxes.map((box, index) => {
                const isPrimary = index === 0;
                const isDragging = dragging?.id === box.id;
                const baseWeight = textStyles[styleId].fontWeight;
                const primaryWeight = Math.max(baseWeight, 500);
                const secondaryWeight = Math.max(baseWeight - 50, 450);
                const overlayWeight = isPrimary ? primaryWeight : secondaryWeight;
                const overlayOpacity = isPrimary ? 0.95 : 0.8;
                const overlayMaxWidth =
                  box.role === "location"
                    ? "72%"
                    : box.role === "date" && hasTime
                      ? "68%"
                      : isPrimary
                        ? "65%"
                        : "55%";
                const overlayFontFamily = fontOptions[box.font ?? "modernSans"].stack;
                const overlayFontStyle = box.italic ? "italic" : "normal";
                const overlayFontWeight = overlayWeight + (box.bold ? 150 : 0);
                const leftPx = (box.x / 100) * canvasWidth;
                const topPx = (box.y / 100) * canvasHeight;
                const isDateOrLocation = box.role === "date" || box.role === "location";
                return (
                  <div
                    key={box.id}
                    className={`absolute box-border select-none rounded-md bg-black/25 px-2 py-1 text-white touch-none cursor-grab transition-shadow duration-200 active:cursor-grabbing ${
                      isDragging
                        ? "ring-2 ring-white/60 shadow-lg shadow-black/40"
                        : "ring-1 ring-white/10"
                    }`}
                    style={{
                      left: `${leftPx * scaleX}px`,
                      top: `${topPx * scaleY}px`,
                      transform: isDateOrLocation ? "translate(0, 0)" : "translate(-50%, -50%)",
                      fontSize: `${box.fontSize}px`,
                      textAlign: box.align,
                      fontWeight: overlayFontWeight,
                      fontStyle: overlayFontStyle,
                      letterSpacing: textStyles[styleId].letterSpacing,
                      color: box.color ?? textStyles[styleId].color,
                      fontFamily: overlayFontFamily,
                      lineHeight: isPrimary ? 1.25 : 1.4,
                      opacity: overlayOpacity,
                      maxWidth: overlayMaxWidth,
                      width: undefined,
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                      textShadow: "0 1px 4px rgba(0,0,0,0.4)",
                      padding: isDateOrLocation ? "4px 6px" : undefined,
                    }}
                    onPointerDown={(event) => onDragStart(event, box.id)}
                  >
                    {box.text || " "}
                  </div>
                );
              })
            )}
          </div>
          <div className="pointer-events-none absolute inset-0 z-15">
            {snapGuides.x !== null ? (
              <div
                className="absolute top-3 bottom-3 w-px bg-white/50 shadow-[0_0_10px_rgba(255,255,255,0.35)]"
                style={{ left: `${snapGuides.x * scaleX}px` }}
              />
            ) : null}
            {snapGuides.y !== null ? (
              <div
                className="absolute left-3 right-3 h-px bg-white/50 shadow-[0_0_10px_rgba(255,255,255,0.35)]"
                style={{ top: `${snapGuides.y * scaleY}px` }}
              />
            ) : null}
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
  );
}
