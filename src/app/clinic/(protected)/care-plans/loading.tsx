export default function Loading() {
  return (
    <div className="flex flex-col gap-6 w-full animate-pulse pb-8">
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 bg-border-main rounded-xl"/>
        <div className="h-10 w-28 bg-border-main rounded-btn"/>
      </div>
      <div className="flex flex-col gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="card-base p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="h-5 w-40 bg-border-main rounded-lg"/>
              <div className="h-6 w-16 bg-border-main rounded-full"/>
            </div>
            <div className="h-3 w-32 bg-border-main rounded"/>
            <div className="h-2 w-full bg-border-main rounded-full"/>
          </div>
        ))}
      </div>
    </div>
  )
}
