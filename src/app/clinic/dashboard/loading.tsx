export default function Loading() {
  return (
    <div className="flex flex-col gap-8 w-full animate-pulse">
      <div className="flex flex-col gap-3 pb-4 border-b border-border-main">
        <div className="h-8 w-52 bg-border-main rounded-[10px]"/>
        <div className="h-4 w-32 bg-border-main rounded-[8px]"/>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[1,2,3,4].map(i => (
          <div key={i} className="card-base p-5 flex flex-col gap-3">
            <div className="h-3 w-16 bg-border-main rounded"/>
            <div className="h-9 w-12 bg-border-main rounded"/>
          </div>
        ))}
      </div>
      <div className="card-base p-6 flex flex-col gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="flex items-center gap-5 p-4 border border-border-main rounded-[16px]">
            <div className="w-16 h-14 bg-border-main rounded-[12px] shrink-0"/>
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-4 w-1/2 bg-border-main rounded"/>
              <div className="h-3 w-1/3 bg-border-main rounded"/>
            </div>
            <div className="h-7 w-20 bg-border-main rounded-full shrink-0"/>
          </div>
        ))}
      </div>
    </div>
  )
}
