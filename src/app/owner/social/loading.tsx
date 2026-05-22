export default function Loading() {
  return (
    <div className="flex flex-col gap-6 w-full animate-pulse pb-8">
      <div className="h-8 w-36 bg-border-main rounded-xl"/>
      <div className="flex flex-col gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="card-base p-5 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-border-main rounded-full shrink-0"/>
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="h-4 w-28 bg-border-main rounded"/>
                <div className="h-3 w-16 bg-border-main rounded"/>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="h-3 w-full bg-border-main rounded"/>
              <div className="h-3 w-4/5 bg-border-main rounded"/>
            </div>
            <div className="flex items-center gap-4 pt-2 border-t border-border-main">
              <div className="h-4 w-12 bg-border-main rounded"/>
              <div className="h-4 w-12 bg-border-main rounded"/>
              <div className="h-4 w-12 bg-border-main rounded"/>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
