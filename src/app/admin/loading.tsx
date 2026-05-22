export default function Loading() {
  return (
    <div className="flex flex-col gap-8 w-full animate-pulse pb-8">
      <div className="flex flex-col gap-2">
        <div className="h-8 w-40 bg-border-main rounded-xl"/>
        <div className="h-4 w-56 bg-border-main rounded-lg"/>
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[1,2,3,4].map(i => (
          <div key={i} className="card-base p-5 flex flex-col gap-3">
            <div className="h-3 w-16 bg-border-main rounded"/>
            <div className="h-9 w-12 bg-border-main rounded"/>
          </div>
        ))}
      </div>
      {/* Chart area */}
      <div className="card-base p-6 h-64 flex items-center justify-center">
        <div className="w-full h-full bg-border-main rounded-[12px]"/>
      </div>
      {/* Activity list */}
      <div className="card-base p-6 flex flex-col gap-4">
        <div className="h-5 w-32 bg-border-main rounded-lg"/>
        {[1,2,3,4].map(i => (
          <div key={i} className="flex items-center gap-4 p-4 border border-border-main rounded-[16px]">
            <div className="w-10 h-10 bg-border-main rounded-full shrink-0"/>
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-4 w-1/2 bg-border-main rounded"/>
              <div className="h-3 w-1/3 bg-border-main rounded"/>
            </div>
            <div className="h-3 w-16 bg-border-main rounded"/>
          </div>
        ))}
      </div>
    </div>
  )
}
