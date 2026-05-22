export default function Loading() {
  return (
    <div className="flex flex-col gap-8 w-full animate-pulse pb-8">
      <div className="flex flex-col gap-2">
        <div className="h-8 w-44 bg-border-main rounded-xl"/>
        <div className="h-4 w-64 bg-border-main rounded-lg"/>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {[1,2,3].map(i => (
          <div key={i} className="card-base p-6 flex flex-col gap-4">
            <div className="h-5 w-28 bg-border-main rounded-lg"/>
            <div className="w-full h-40 bg-border-main rounded-[12px]"/>
            <div className="h-3 w-full bg-border-main rounded"/>
            <div className="h-3 w-2/3 bg-border-main rounded"/>
          </div>
        ))}
      </div>
    </div>
  )
}
