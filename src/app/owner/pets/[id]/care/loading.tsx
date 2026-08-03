export default function Loading() {
  return (
    <div className="flex flex-col gap-6 w-full animate-pulse pb-8">
      <div className="h-4 w-32 bg-border-main rounded-lg"/>
      <div className="flex flex-col gap-2">
        <div className="h-8 w-56 bg-border-main rounded-xl"/>
        <div className="h-4 w-72 bg-border-main rounded-lg"/>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1,2,3].map(i => (
          <div key={i} className="card-base p-6 flex flex-col gap-4">
            <div className="w-12 h-12 bg-border-main rounded-input"/>
            <div className="h-5 w-32 bg-border-main rounded-lg"/>
            <div className="flex flex-col gap-2">
              <div className="h-3 w-full bg-border-main rounded"/>
              <div className="h-3 w-3/4 bg-border-main rounded"/>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
