export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="max-w-3xl text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.45em] text-red-300/80">
          Local private cinema
        </p>
        <h1 className="text-5xl font-black tracking-tight text-white sm:text-7xl">
          RandomeriaFlix
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          Foundation is ready. Next we will add the password gate, viewer/admin sessions,
          and the Randomeria + Bonus profile picker.
        </p>
        <div className="mx-auto mt-10 h-1 w-40 rounded-full bg-red-500 shadow-[0_0_28px_rgba(229,9,63,0.8)]" />
      </section>
    </main>
  );
}
