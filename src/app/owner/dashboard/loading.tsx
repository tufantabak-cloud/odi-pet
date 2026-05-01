export default function Loading() {
  return (
    <div className="flex flex-col gap-8 w-full animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col gap-3 pb-4 border-b border-border-main">
        <div className="h-8 w-56 bg-border-main rounded-[10px]"/>
        <div className="h-4 w-36 bg-border-main rounded-[8px]"/>
      </div>

      {/* Card skeletons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[1,2,3,4].map(i => (
          <div key={i} className="card-base p-6 flex flex-col gap-3">
            <div className="h-3 w-20 bg-border-main rounded"/>
            <div className="h-10 w-16 bg-border-main rounded"/>
          </div>
        ))}
      </div>

      {/* List skeletons */}
      <div className="card-base p-6 flex flex-col gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="flex gap-4 p-4 border border-border-main rounded-[16px]">
            <div className="w-14 h-14 bg-border-main rounded-[14px] shrink-0"/>
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-4 w-1/2 bg-border-main rounded"/>
              <div className="h-3 w-1/3 bg-border-main rounded"/>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
