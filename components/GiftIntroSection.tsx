"use client";

export default function GiftIntroSection() {
  return (
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
  );
}
