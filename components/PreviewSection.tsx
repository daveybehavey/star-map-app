"use client";

import { PointerEvent as ReactPointerEvent, RefObject, CSSProperties } from "react";
import {
  FormState,
  FontKey,
  ModeKey,
  Occasion,
  PreviewMode,
  ShapeKey,
  StyleKey,
  TextBox,
} from "@/lib/types";
import PreviewCanvas from "@/components/PreviewCanvas";
import PresetTextPanel from "@/components/PresetTextPanel";
import CustomTextPanel from "@/components/CustomTextPanel";

type TextColorPreset = {
  label: string;
  value: string;
};

type PreviewSectionProps = {
  isPresetMode: boolean;
  onModeChange: (mode: ModeKey) => void;
  occasion: Occasion;
  onOccasionChange: (occasion: Occasion) => void;
  styleId: StyleKey;
  onStyleChange: (style: StyleKey) => void;
  shapeId: ShapeKey;
  onShapeChange: (shape: ShapeKey) => void;
  textBoxes: TextBox[];
  selectedDate: Date | null;
  formState: FormState;
  textStyles: Record<StyleKey, { fontWeight: number; letterSpacing: string; color: string }>;
  fontOptions: Record<FontKey, { label: string; stack: string }>;
  textColorPresets: TextColorPreset[];
  previewMode: PreviewMode;
  isGenerating: boolean;
  zoom: number;
  rotation: number;
  showConstellations: boolean;
  onZoomChange: (value: number) => void;
  onRotationChange: (value: number) => void;
  onToggleConstellations: (value: boolean) => void;
  previewRef: RefObject<HTMLDivElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  canvasWidth: number;
  canvasHeight: number;
  getShapeMaskStyle: (shape: ShapeKey) => CSSProperties & { WebkitMaskImage?: string };
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
  onUpdateTextBox: (id: number, updates: Partial<TextBox>) => void;
  onAddTextBox: () => void;
  onRemoveTextBox: (id: number) => void;
  maxTextBoxes: number;
  onExport: () => void;
  canExport: boolean;
  isExporting: boolean;
  exportError: string | null;
  exportSuccess: boolean;
  showPrintTips: boolean;
  onTogglePrintTips: () => void;
  onResetEditor: () => void;
};

export default function PreviewSection({
  isPresetMode,
  onModeChange,
  occasion,
  onOccasionChange,
  styleId,
  onStyleChange,
  shapeId,
  onShapeChange,
  textBoxes,
  selectedDate,
  formState,
  textStyles,
  fontOptions,
  textColorPresets,
  previewMode,
  isGenerating,
  zoom,
  rotation,
  showConstellations,
  onZoomChange,
  onRotationChange,
  onToggleConstellations,
  previewRef,
  canvasRef,
  canvasWidth,
  canvasHeight,
  getShapeMaskStyle,
  scaleX,
  scaleY,
  hasTime,
  dragging,
  snapGuides,
  onDragStart,
  formatDisplayDate,
  onUpdateTextBox,
  onAddTextBox,
  onRemoveTextBox,
  maxTextBoxes,
  onExport,
  canExport,
  isExporting,
  exportError,
  exportSuccess,
  showPrintTips,
  onTogglePrintTips,
  onResetEditor,
}: PreviewSectionProps) {
  return (
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
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Preview</p>
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
              onClick={() => onModeChange("preset")}
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
              onClick={() => onModeChange("custom")}
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
              onChange={(event) => onOccasionChange(event.target.value as Occasion)}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
            >
              <option value="wedding">Wedding</option>
              <option value="anniversary">Anniversary</option>
              <option value="birthday">Birthday</option>
              <option value="newArrival">New arrival</option>
              <option value="firstDance">First dance</option>
              <option value="memorial">Memorial</option>
              <option value="proposal">Proposal</option>
              <option value="graduation">Graduation</option>
              <option value="pet">Pet</option>
              <option value="foreverNight">Forever night</option>
            </select>
          </label>
          <label className="flex items-center gap-2" htmlFor="style">
            Look
            <select
              id="style"
              value={styleId}
              onChange={(event) => onStyleChange(event.target.value as StyleKey)}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
            >
              <option value="minimalNoir">Minimal Noir</option>
              <option value="celestialInk">Celestial Ink</option>
              <option value="classicStarMap">Classic Star Map</option>
              <option value="vintage">Vintage</option>
              <option value="zodiac">Zodiac</option>
            </select>
          </label>
          <label className="flex items-center gap-2" htmlFor="shape">
            Shape
            <select
              id="shape"
              value={shapeId}
              onChange={(event) => onShapeChange(event.target.value as ShapeKey)}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
            >
              <option value="none">No filter</option>
              <option value="circle">Circle</option>
              <option value="heart">Heart</option>
              <option value="star">Star</option>
              <option value="cutDiamond">Cut diamond</option>
              <option value="diamondRing">Diamond</option>
              <option value="angelWings">Angel wings</option>
              <option value="hexagon">Hexagon</option>
              <option value="square">Square</option>
            </select>
          </label>
        </div>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Preset keeps things simple. Custom gives you full control.
      </p>
      <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-white/80 p-4 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300 sm:grid-cols-3">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
            Zoom
          </span>
          <input
            type="range"
            min={0.85}
            max={1.35}
            step={0.01}
            value={zoom}
            onChange={(event) => onZoomChange(Number(event.target.value))}
            className="w-full accent-black dark:accent-white"
          />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {zoom.toFixed(2)}x
          </span>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
            Rotate
          </span>
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={rotation}
            onChange={(event) => onRotationChange(Number(event.target.value))}
            className="w-full accent-black dark:accent-white"
          />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {Math.round(rotation)}°
          </span>
        </label>
        <label className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
            Constellations
          </span>
          <span className="flex items-center gap-3 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={showConstellations}
              onChange={(event) => onToggleConstellations(event.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-black focus:ring-0 dark:border-zinc-600 dark:text-white"
            />
            Show lines
          </span>
        </label>
      </div>
      <PreviewCanvas
        previewRef={previewRef}
        canvasRef={canvasRef}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        shapeId={shapeId}
        getShapeMaskStyle={getShapeMaskStyle}
        isGenerating={isGenerating}
        previewMode={previewMode}
        isPresetMode={isPresetMode}
        textBoxes={textBoxes}
        selectedDate={selectedDate}
        formState={formState}
        textStyles={textStyles}
        fontOptions={fontOptions}
        styleId={styleId}
        scaleX={scaleX}
        scaleY={scaleY}
        hasTime={hasTime}
        dragging={dragging}
        snapGuides={snapGuides}
        onDragStart={onDragStart}
        formatDisplayDate={formatDisplayDate}
      />
      {isPresetMode ? (
        <PresetTextPanel
          textBoxes={textBoxes}
          selectedDate={selectedDate}
          formState={formState}
          formatDisplayDate={formatDisplayDate}
          onUpdateText={onUpdateTextBox}
        />
      ) : (
        <CustomTextPanel
          textBoxes={textBoxes}
          maxTextBoxes={maxTextBoxes}
          styleId={styleId}
          textStyles={textStyles}
          fontOptions={fontOptions}
          textColorPresets={textColorPresets}
          onAddTextBox={onAddTextBox}
          onRemoveTextBox={onRemoveTextBox}
          onUpdateTextBox={onUpdateTextBox}
        />
      )}
      {previewMode === "generated" ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={onExport}
            disabled={!canExport}
            className={`inline-flex w-full items-center justify-center rounded-full border border-zinc-200/80 bg-white/90 px-5 py-3 text-sm font-semibold text-zinc-900 shadow-[0_14px_30px_-24px_rgba(24,24,27,0.6)] ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_36px_-24px_rgba(24,24,27,0.7)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none dark:border-zinc-700/80 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-white/10 dark:hover:bg-zinc-800 ${
              isExporting ? "opacity-75 animate-pulse" : "opacity-100"
            }`}
          >
            {isExporting ? "Preparing your night sky..." : "Download star map"}
          </button>
          {exportError ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{exportError}</p>
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
                  onClick={onResetEditor}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Create another
                </button>
                <button
                  type="button"
                  onClick={onTogglePrintTips}
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
  );
}
