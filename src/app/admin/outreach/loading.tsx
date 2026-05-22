export default function Loading() {
  return (
    <div className="flex flex-col gap-6 w-full animate-pulse pb-8">
      <div className="h-8 w-36 bg-border-main rounded-xl"/>
      {/* Campaign stats */}
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="card-base p-5 flex flex-col gap-2 items-center">
            <div className="h-3 w-20 bg-border-main rounded"/>
            <div className="h-8 w-12 bg-border-main rounded"/>
          </div>
        ))}
      </div>
      {/* Campaign list */}
      <div className="flex flex-col gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="card-base p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-border-main rounded-[10px] shrink-0"/>
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-4 w-40 bg-border-main rounded"/>
              <div className="h-3 w-24 bg-border-main rounded"/>
            </div>
            <div className="h-6 w-20 bg-border-main rounded-full shrink-0"/>
          </div>
        ))}
      </div>
    </div>
  )
}
