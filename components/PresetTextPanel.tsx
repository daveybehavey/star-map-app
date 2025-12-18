"use client";

import { FormState, TextBox } from "@/lib/types";

type PresetTextPanelProps = {
  textBoxes: TextBox[];
  selectedDate: Date | null;
  formState: FormState;
  formatDisplayDate: (dateValue: Date | null) => string;
  onUpdateText: (id: number, updates: Partial<TextBox>) => void;
};

export default function PresetTextPanel({
  textBoxes,
  selectedDate,
  formState,
  formatDisplayDate,
  onUpdateText,
}: PresetTextPanelProps) {
  return (
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
            onChange={(event) =>
              onUpdateText(textBoxes[0]?.id ?? 1, { text: event.target.value })
            }
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
  );
}
