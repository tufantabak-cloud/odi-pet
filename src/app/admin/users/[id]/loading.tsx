export default function Loading() {
  return (
    <div className="flex flex-col gap-6 w-full animate-pulse pb-8">
      <div className="h-4 w-28 bg-border-main rounded-lg"/>
      {/* User header */}
      <div className="card-base p-6 flex items-center gap-5">
        <div className="w-16 h-16 bg-border-main rounded-full shrink-0"/>
        <div className="flex flex-col gap-2 flex-1">
          <div className="h-6 w-40 bg-border-main rounded-lg"/>
          <div className="h-4 w-48 bg-border-main rounded"/>
        </div>
        <div className="h-7 w-20 bg-border-main rounded-full"/>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="card-base p-5 flex flex-col gap-2 items-center">
            <div className="h-3 w-16 bg-border-main rounded"/>
            <div className="h-8 w-12 bg-border-main rounded"/>
          </div>
        ))}
      </div>
      {/* Activity */}
      <div className="card-base p-6 flex flex-col gap-4">
        <div className="h-5 w-28 bg-border-main rounded-lg"/>
        {[1,2,3,4].map(i => (
          <div key={i} className="flex items-center gap-3 p-3 border border-border-main rounded-[12px]">
            <div className="w-8 h-8 bg-border-main rounded-full shrink-0"/>
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="h-4 w-2/3 bg-border-main rounded"/>
              <div className="h-3 w-20 bg-border-main rounded"/>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
