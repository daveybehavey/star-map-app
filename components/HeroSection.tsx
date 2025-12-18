"use client";

export default function HeroSection() {
  return (
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
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-300">{label}</p>
            <div className="mt-6 h-24 rounded-xl border border-white/10 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.6),transparent_40%),radial-gradient(circle_at_70%_60%,rgba(255,255,255,0.4),transparent_45%)]" />
            <p className="mt-4 text-xs text-zinc-300">
              Custom star map • Night sky keepsake
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
