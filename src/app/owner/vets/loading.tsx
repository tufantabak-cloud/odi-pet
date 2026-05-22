export default function Loading() {
  return (
    <div className="flex flex-col gap-6 w-full animate-pulse pb-8">
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 bg-border-main rounded-xl"/>
        <div className="h-10 w-52 bg-border-main rounded-input"/>
      </div>
      <div className="flex flex-col gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="card-base p-5 flex items-center gap-4">
            <div className="w-14 h-14 bg-border-main rounded-[16px] shrink-0"/>
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-5 w-36 bg-border-main rounded-lg"/>
              <div className="h-3 w-24 bg-border-main rounded"/>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex gap-1">
                {[1,2,3,4,5].map(j => (
                  <div key={j} className="w-3 h-3 bg-border-main rounded"/>
                ))}
              </div>
              <div className="h-3 w-16 bg-border-main rounded"/>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
