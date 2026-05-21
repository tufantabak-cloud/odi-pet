export default function Loading() {
  return (
    <div className="flex flex-col gap-8 pb-4 w-full animate-pulse">
      {/* Greeting skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-9 w-64 bg-border-main rounded-xl"/>
        <div className="h-5 w-48 bg-border-main rounded-lg mt-1"/>
      </div>

      {/* Pet Slider skeleton */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 w-32 bg-border-main rounded-lg"/>
          <div className="h-8 w-28 bg-border-main rounded-xl"/>
        </div>
        <div className="flex gap-4 overflow-hidden pb-3">
          {[1,2,3].map(i => (
            <div key={i} className="shrink-0 w-[200px] sm:w-[220px] aspect-square bg-border-main rounded-[24px]"/>
          ))}
        </div>
      </div>

      {/* Timeline skeleton */}
      <div className="card-base p-6 sm:p-8 flex flex-col gap-5">
        <div className="h-6 w-48 bg-border-main rounded-lg"/>
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-4 p-4 border border-border-main rounded-[16px]">
              <div className="w-[52px] h-[52px] bg-border-main rounded-[12px] shrink-0"/>
              <div className="flex flex-col gap-2 flex-1">
                <div className="h-4 w-1/2 bg-border-main rounded"/>
                <div className="h-3 w-1/3 bg-border-main rounded"/>
              </div>
              <div className="w-20 h-6 bg-border-main rounded-full shrink-0"/>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
