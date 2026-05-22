export default function Loading() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto animate-pulse pb-8">
      <div className="h-4 w-32 bg-border-main rounded-lg"/>
      <div className="h-8 w-56 bg-border-main rounded-xl"/>
      <div className="card-base p-6 flex flex-col gap-5">
        {[1,2,3,4].map(i => (
          <div key={i} className="flex items-center justify-between p-4 border border-border-main rounded-[12px]">
            <div className="flex flex-col gap-1.5">
              <div className="h-4 w-44 bg-border-main rounded"/>
              <div className="h-3 w-28 bg-border-main rounded"/>
            </div>
            <div className="w-12 h-6 bg-border-main rounded-full"/>
          </div>
        ))}
      </div>
    </div>
  )
}
