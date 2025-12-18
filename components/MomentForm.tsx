"use client";

import { FormEvent, RefObject } from "react";
import DateTimePicker from "@/components/DateTimePicker";
import { Coordinates, FormState, LocationSuggestion, PreviewMode } from "@/lib/types";

type DateTimeValue = {
  date?: string;
  time?: string;
};

type MomentFormProps = {
  formState: FormState;
  coordinates: Coordinates | null;
  locationSuggestions: LocationSuggestion[];
  isLocationOpen: boolean;
  isLocationLoading: boolean;
  locationError: string | null;
  isLocationValid: boolean;
  isActionEnabled: boolean;
  isGenerating: boolean;
  previewMode: PreviewMode;
  isReadyToReveal: boolean;
  locationPopoverRef: RefObject<HTMLDivElement>;
  onDateChange: (next: DateTimeValue) => void;
  onLocationChange: (value: string) => void;
  onLocationFocus: () => void;
  onSelectLocation: (suggestion: LocationSuggestion) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function MomentForm({
  formState,
  coordinates,
  locationSuggestions,
  isLocationOpen,
  isLocationLoading,
  locationError,
  isLocationValid,
  isActionEnabled,
  isGenerating,
  previewMode,
  isReadyToReveal,
  locationPopoverRef,
  onDateChange,
  onLocationChange,
  onLocationFocus,
  onSelectLocation,
  onSubmit,
}: MomentFormProps) {
  return (
    <form
      className="w-full space-y-6 rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      onSubmit={onSubmit}
    >
      <div className="space-y-3">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Pick the exact night you want to honor.
        </p>
        <DateTimePicker
          value={{
            date: formState.date || undefined,
            time: formState.time || undefined,
          }}
          onChange={onDateChange}
        />
        {!formState.date ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Pick a date to begin.</p>
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
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Choose a place on Earth.</p>
        ) : null}
        <input
          id="location"
          name="location"
          type="text"
          placeholder="City, region, country"
          value={formState.location}
          onChange={(event) => onLocationChange(event.target.value)}
          onFocus={onLocationFocus}
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
                    onClick={() => onSelectLocation(suggestion)}
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
  );
}
