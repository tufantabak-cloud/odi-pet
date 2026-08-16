export default function Loading() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto animate-pulse pb-8">
      {/* Wizard Header & Stepper Skeleton */}
      <div className="w-full flex flex-col gap-2.5 mb-2 mt-2 px-1">
        <div className="flex items-center justify-between">
          <div className="h-4 w-40 bg-slate-200 rounded-full" />
          <div className="h-4 w-24 bg-slate-200 rounded-full" />
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div className="bg-slate-200 h-full w-1/6 rounded-full" />
        </div>
        <div className="hidden sm:flex items-center justify-between gap-2 pt-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 bg-slate-100 rounded-full flex-1 border border-slate-200/60" />
          ))}
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="card-base p-6 sm:p-8 flex flex-col gap-6 rounded-3xl border border-slate-200/80 bg-white">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <div className="h-5 w-48 bg-slate-200 rounded-lg" />
            <div className="h-3.5 w-64 bg-slate-100 rounded-md" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex flex-col gap-2">
            <div className="h-4 w-16 bg-slate-200 rounded" />
            <div className="h-12 w-full bg-slate-100 rounded-2xl" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-4 w-16 bg-slate-200 rounded" />
            <div className="h-12 w-full bg-slate-100 rounded-2xl" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex flex-col gap-2">
            <div className="h-4 w-20 bg-slate-200 rounded" />
            <div className="h-12 w-full bg-slate-100 rounded-2xl" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="h-12 w-full bg-slate-100 rounded-2xl" />
          </div>
        </div>

        <div className="h-14 w-full bg-slate-100 rounded-2xl" />

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <div className="h-12 w-44 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
