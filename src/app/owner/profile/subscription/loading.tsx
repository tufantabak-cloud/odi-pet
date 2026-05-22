export default function Loading() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto animate-pulse pb-8">
      <div className="h-4 w-32 bg-border-main rounded-lg"/>
      <div className="flex flex-col gap-2">
        <div className="h-8 w-44 bg-border-main rounded-xl"/>
        <div className="h-4 w-64 bg-border-main rounded-lg"/>
      </div>
      {/* Current plan */}
      <div className="card-base p-6 border-l-4 border-l-border-main flex flex-col gap-4">
        <div className="h-6 w-32 bg-border-main rounded-lg"/>
        <div className="flex flex-col gap-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-4 w-48 bg-border-main rounded"/>
          ))}
        </div>
        <div className="h-8 w-24 bg-border-main rounded-lg"/>
      </div>
      {/* Plan comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1,2].map(i => (
          <div key={i} className="card-base p-6 flex flex-col gap-4">
            <div className="h-6 w-24 bg-border-main rounded-lg"/>
            <div className="h-8 w-20 bg-border-main rounded"/>
            {[1,2,3,4].map(j => (
              <div key={j} className="h-4 w-40 bg-border-main rounded"/>
            ))}
            <div className="h-11 w-full bg-border-main rounded-btn mt-2"/>
          </div>
        ))}
      </div>
    </div>
  )
}
