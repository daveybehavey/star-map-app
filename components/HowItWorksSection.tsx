"use client";

export default function HowItWorksSection() {
  return (
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
            <p className="mt-2 text-base text-zinc-700 dark:text-zinc-200">{step}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
