export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white">
      <div className="px-4 text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-500 shadow-lg">
            <span className="text-3xl font-bold text-white">M</span>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-primary-500">MiniAgent</h1>
        <p className="mt-1 text-accent-500 font-semibold">ພວກເຮົາຄືມິນິເອເຈນ</p>
        <p className="mt-4 text-gray-500">Phase 0 — Foundation scaffold complete</p>
        <p className="mt-1 text-sm text-gray-400">Customer web app coming in Phase 6</p>
      </div>
    </main>
  );
}
