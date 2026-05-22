export default function Loading() {
  return (
    <div className="flex flex-col gap-6 w-full animate-pulse pb-8">
      <div className="h-4 w-32 bg-border-main rounded-lg"/>
      <div className="flex flex-col gap-2">
        <div className="h-8 w-40 bg-border-main rounded-xl"/>
        <div className="h-4 w-56 bg-border-main rounded-lg"/>
      </div>
      {/* Filter tabs */}
      <div className="flex gap-2">
        {[1,2,3].map(i => (
          <div key={i} className="h-9 w-24 bg-border-main rounded-full"/>
        ))}
      </div>
      {/* Treatment cards */}
      <div className="flex flex-col gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="card-base p-5 flex items-center gap-4">
            <div className="w-11 h-11 bg-border-main rounded-[12px] shrink-0"/>
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-4 w-36 bg-border-main rounded"/>
              <div className="h-3 w-24 bg-border-main rounded"/>
            </div>
            <div className="h-6 w-20 bg-border-main rounded-full shrink-0"/>
          </div>
        ))}
      </div>
    </div>
  )
}
