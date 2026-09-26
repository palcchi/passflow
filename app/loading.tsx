export default function Loading() {
  return <main className="min-h-screen bg-background" aria-busy="true" aria-label="Loading"><div className="mx-auto max-w-7xl px-5 py-8 sm:px-8"><div className="h-11 w-32 animate-pulse rounded-md bg-muted"/><div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><div className="h-52 animate-pulse rounded-xl bg-muted"/><div className="h-52 animate-pulse rounded-xl bg-muted"/><div className="h-52 animate-pulse rounded-xl bg-muted"/></div></div></main>;
}
