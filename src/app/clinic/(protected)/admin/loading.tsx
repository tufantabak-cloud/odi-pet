export default function Loading() {
  return (
    <div className="flex flex-col gap-6 w-full animate-pulse pb-8">
      <div className="h-8 w-40 bg-border-main rounded-xl"/>
      {/* Staff list */}
      <div className="card-base divide-y divide-border-main">
        {[1,2,3].map(i => (
          <div key={i} className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-border-main rounded-full shrink-0"/>
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="h-4 w-32 bg-border-main rounded"/>
              <div className="h-3 w-20 bg-border-main rounded"/>
            </div>
            <div className="h-6 w-16 bg-border-main rounded-full"/>
          </div>
        ))}
      </div>
      {/* Settings */}
      <div className="h-5 w-24 bg-border-main rounded-lg"/>
      <div className="card-base divide-y divide-border-main">
        {[1,2,3].map(i => (
          <div key={i} className="p-4 flex items-center justify-between">
            <div className="h-4 w-40 bg-border-main rounded"/>
            <div className="w-12 h-6 bg-border-main rounded-full"/>
          </div>
        ))}
      </div>
    </div>
  )
}
