export default function AdviserLoading() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center p-6" aria-hidden="true">
      <div className="flex flex-col items-center gap-4">
        <i className="fas fa-spinner fa-spin text-2xl text-blue-600" />
        <p className="text-sm font-bold text-slate-500">Loading Workspace...</p>
      </div>
    </div>
  );
}
