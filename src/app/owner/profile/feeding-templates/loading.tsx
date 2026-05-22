export default function Loading() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto animate-pulse pb-8">
      <div className="h-4 w-32 bg-border-main rounded-lg"/>
      <div className="h-8 w-60 bg-border-main rounded-xl"/>
      <div className="flex flex-col gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="card-base p-5 flex flex-col gap-3">
            <div className="h-5 w-36 bg-border-main rounded-lg"/>
            <div className="flex flex-col gap-2">
              <div className="h-3 w-full bg-border-main rounded"/>
              <div className="h-3 w-3/4 bg-border-main rounded"/>
            </div>
            <div className="h-8 w-20 bg-border-main rounded-btn self-end"/>
          </div>
        ))}
      </div>
    </div>
  )
}
