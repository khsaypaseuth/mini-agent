export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500">
            <span className="text-2xl font-bold text-white">M</span>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-primary-500">MiniAgent Admin</h1>
        <p className="mt-2 text-gray-500">Phase 0 — Foundation scaffold complete</p>
        <p className="mt-1 text-sm text-gray-400">Admin dashboard coming in Phase 4</p>
      </div>
    </main>
  );
}
