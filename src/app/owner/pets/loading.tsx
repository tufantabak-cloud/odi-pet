export default function Loading() {
  return (
    <div className="flex flex-col gap-6 w-full animate-pulse">
      <div className="flex flex-col gap-3 pb-4 border-b border-border-main">
        <div className="h-8 w-48 bg-border-main rounded-[10px]"/>
        <div className="h-4 w-28 bg-border-main rounded-[8px]"/>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="card-base p-6 flex flex-col gap-3">
            <div className="flex gap-4 items-center border-b border-border-main pb-4">
              <div className="w-14 h-14 bg-border-main rounded-[16px] shrink-0"/>
              <div className="flex flex-col gap-2 flex-1">
                <div className="h-4 w-20 bg-border-main rounded"/>
                <div className="h-3 w-14 bg-border-main rounded"/>
              </div>
            </div>
            <div className="h-6 w-16 bg-border-main rounded-full"/>
          </div>
        ))}
      </div>
    </div>
  )
}
