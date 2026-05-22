export default function Loading() {
  return (
    <div className="flex flex-col gap-6 w-full animate-pulse pb-8">
      <div className="h-8 w-36 bg-border-main rounded-xl"/>
      <div className="flex flex-col gap-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="card-base p-4 flex items-start gap-4">
            <div className="w-10 h-10 bg-border-main rounded-full shrink-0"/>
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-4 w-2/3 bg-border-main rounded"/>
              <div className="h-3 w-full bg-border-main rounded"/>
              <div className="h-3 w-20 bg-border-main rounded"/>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
