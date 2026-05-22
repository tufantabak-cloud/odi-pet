export default function Loading() {
  return (
    <div className="flex flex-col gap-6 w-full animate-pulse pb-8">
      <div className="h-4 w-32 bg-border-main rounded-lg"/>
      <div className="flex flex-col gap-2">
        <div className="h-8 w-44 bg-border-main rounded-xl"/>
        <div className="h-4 w-64 bg-border-main rounded-lg"/>
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="card-base p-5 flex flex-col gap-2 items-center">
            <div className="h-3 w-16 bg-border-main rounded"/>
            <div className="h-8 w-12 bg-border-main rounded-lg"/>
          </div>
        ))}
      </div>
      {/* Nutrition log */}
      <div className="card-base p-6 flex flex-col gap-4">
        <div className="h-5 w-36 bg-border-main rounded-lg"/>
        {[1,2,3,4].map(i => (
          <div key={i} className="flex items-center gap-4 p-3 border border-border-main rounded-[12px]">
            <div className="w-10 h-10 bg-border-main rounded-[10px] shrink-0"/>
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="h-4 w-28 bg-border-main rounded"/>
              <div className="h-3 w-40 bg-border-main rounded"/>
            </div>
            <div className="h-3 w-12 bg-border-main rounded"/>
          </div>
        ))}
      </div>
    </div>
  )
}
