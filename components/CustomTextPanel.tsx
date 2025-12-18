"use client";

import { useState } from "react";
import { FontKey, StyleKey, TextBox } from "@/lib/types";

type TextColorPreset = {
  label: string;
  value: string;
};

type CustomTextPanelProps = {
  textBoxes: TextBox[];
  maxTextBoxes: number;
  styleId: StyleKey;
  textStyles: Record<StyleKey, { fontWeight: number; letterSpacing: string; color: string }>;
  fontOptions: Record<FontKey, { label: string; stack: string }>;
  textColorPresets: TextColorPreset[];
  onAddTextBox: () => void;
  onRemoveTextBox: (id: number) => void;
  onUpdateTextBox: (id: number, updates: Partial<TextBox>) => void;
};

export default function CustomTextPanel({
  textBoxes,
  maxTextBoxes,
  styleId,
  textStyles,
  fontOptions,
  textColorPresets,
  onAddTextBox,
  onRemoveTextBox,
  onUpdateTextBox,
}: CustomTextPanelProps) {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  const isCollapsed = (id: number) => collapsed[id] !== false;
  const toggleCollapsed = (id: number) => {
    const nextState = !isCollapsed(id);
    setCollapsed((prev) => ({ ...prev, [id]: nextState }));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          Your words on the print
        </p>
        <button
          type="button"
          onClick={onAddTextBox}
          disabled={textBoxes.length >= maxTextBoxes}
          className="rounded-full border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Add a line ({textBoxes.length}/{maxTextBoxes})
        </button>
      </div>
      <div className="space-y-3">
        {textBoxes.map((box, index) => {
          const displayIndex = index + 1;
          return (
          <div
            key={box.id}
            className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                  Line {displayIndex}
                </p>
                <button
                  type="button"
                  onClick={() => toggleCollapsed(box.id)}
                  className="rounded-full border border-zinc-300 px-2 py-1 text-xs text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  aria-label={collapsed[box.id] ? "Expand line options" : "Collapse line options"}
                >
                  {isCollapsed(box.id) ? "▼" : "▲"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => onRemoveTextBox(box.id)}
                className="text-sm font-semibold text-red-500 transition hover:text-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 dark:text-red-300 dark:hover:text-red-200"
              >
                Remove
              </button>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="text"
                value={box.text}
                onChange={(event) => onUpdateTextBox(box.id, { text: event.target.value })}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
                placeholder="Write a note or names"
              />
              {!isCollapsed(box.id) ? (
                <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
                  <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                    Text size
                    <input
                      type="number"
                      min={10}
                      max={48}
                      value={box.fontSize}
                      onChange={(event) =>
                        onUpdateTextBox(box.id, {
                          fontSize: Number(event.target.value) || box.fontSize,
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
                        onUpdateTextBox(box.id, { font: event.target.value as FontKey })
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
                  <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <button
                      type="button"
                      onClick={() => onUpdateTextBox(box.id, { bold: !box.bold })}
                      className={`rounded-md px-2 py-1 font-semibold transition ${
                        box.bold
                          ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-50"
                          : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500"
                      }`}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateTextBox(box.id, { italic: !box.italic })}
                      className={`rounded-md px-2 py-1 italic transition ${
                        box.italic
                          ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-50"
                          : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500"
                      }`}
                    >
                      I
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onUpdateTextBox(box.id, { align: "left" })}
                        className={`rounded-md px-2 py-1 transition ${
                          box.align === "left"
                            ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-50"
                            : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500"
                        }`}
                        aria-label="Align left"
                      >
                        L
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateTextBox(box.id, { align: "center" })}
                        className={`rounded-md px-2 py-1 transition ${
                          box.align === "center"
                            ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-50"
                            : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500"
                        }`}
                        aria-label="Align center"
                      >
                        C
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            {!isCollapsed(box.id) ? (
              <>
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
                        onClick={() => onUpdateTextBox(box.id, { color: preset.value })}
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
              </>
            ) : null}
          </div>
          );
        })}
      </div>
    </div>
  );
}
