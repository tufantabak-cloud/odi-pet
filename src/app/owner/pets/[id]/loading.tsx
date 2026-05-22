export default function Loading() {
  return (
    <div className="flex flex-col gap-6 w-full animate-pulse pb-8">
      {/* Back link */}
      <div className="h-4 w-32 bg-border-main rounded-lg"/>

      {/* Pet header */}
      <div className="card-base p-6 flex flex-col sm:flex-row items-center gap-5">
        <div className="w-20 h-20 bg-border-main rounded-full shrink-0"/>
        <div className="flex flex-col gap-2 flex-1 items-center sm:items-start">
          <div className="h-7 w-36 bg-border-main rounded-xl"/>
          <div className="h-4 w-48 bg-border-main rounded-lg"/>
          <div className="h-4 w-24 bg-border-main rounded-lg"/>
        </div>
        <div className="w-16 h-16 bg-border-main rounded-full shrink-0"/>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 overflow-hidden">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-10 w-24 bg-border-main rounded-xl shrink-0"/>
        ))}
      </div>

      {/* Content cards */}
      <div className="card-base p-6 flex flex-col gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="flex items-center gap-4 p-4 border border-border-main rounded-[16px]">
            <div className="w-12 h-12 bg-border-main rounded-[12px] shrink-0"/>
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-4 w-1/2 bg-border-main rounded"/>
              <div className="h-3 w-1/3 bg-border-main rounded"/>
            </div>
            <div className="w-20 h-7 bg-border-main rounded-full shrink-0"/>
          </div>
        ))}
      </div>
    </div>
  )
}
