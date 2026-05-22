export default function Loading() {
  return (
    <div className="flex flex-col gap-8 w-full animate-pulse pb-8">
      <div className="h-8 w-32 bg-border-main rounded-xl"/>
      {[1,2,3,4].map(section => (
        <div key={section} className="flex flex-col gap-4">
          <div className="h-5 w-36 bg-border-main rounded-lg"/>
          <div className="card-base divide-y divide-border-main">
            {[1,2,3].map(i => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div className="h-4 w-48 bg-border-main rounded"/>
                <div className="w-12 h-6 bg-border-main rounded-full"/>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
