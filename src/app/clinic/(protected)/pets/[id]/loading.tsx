export default function Loading() {
  return (
    <div className="flex flex-col gap-6 w-full animate-pulse pb-8">
      <div className="h-4 w-28 bg-border-main rounded-lg"/>
      {/* Pet header */}
      <div className="card-base p-6 flex items-center gap-5">
        <div className="w-16 h-16 bg-border-main rounded-full shrink-0"/>
        <div className="flex flex-col gap-2 flex-1">
          <div className="h-6 w-32 bg-border-main rounded-lg"/>
          <div className="h-4 w-48 bg-border-main rounded"/>
        </div>
      </div>
      {/* Medical history */}
      <div className="flex flex-col gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="card-base p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-border-main rounded-lg shrink-0"/>
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-4 w-36 bg-border-main rounded"/>
              <div className="h-3 w-24 bg-border-main rounded"/>
            </div>
            <div className="h-6 w-16 bg-border-main rounded-full"/>
          </div>
        ))}
      </div>
    </div>
  )
}
