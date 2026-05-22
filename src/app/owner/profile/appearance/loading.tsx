export default function Loading() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto animate-pulse pb-8">
      <div className="h-4 w-32 bg-border-main rounded-lg"/>
      <div className="h-8 w-56 bg-border-main rounded-xl"/>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="card-base p-6 flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-border-main rounded-[16px]"/>
            <div className="h-4 w-20 bg-border-main rounded"/>
          </div>
        ))}
      </div>
    </div>
  )
}
