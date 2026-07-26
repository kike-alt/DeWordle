export function ComingSoon({ feature }: { feature: string }) {
  return (
    <section className="w-full max-w-4xl mx-auto px-4 py-24 text-primary-50 flex flex-col items-center gap-4">
      <h1 className="text-2xl font-semibold tracking-tight capitalize">{feature}</h1>
      <p className="text-sm text-primary-300">This feature is not yet available.</p>
    </section>
  );
}
