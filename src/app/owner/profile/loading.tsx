export default function Loading() {
  return (
    <div className="flex flex-col gap-8 pb-20 w-full mx-auto animate-pulse">
      {/* Back link */}
      <div className="h-4 w-36 bg-border-main rounded-lg"/>

      {/* Header card */}
      <div className="card-base overflow-hidden">
        <div className="h-24 bg-border-main"/>
        <div className="px-6 pt-12 pb-6 flex flex-col items-center -mt-12">
          <div className="w-24 h-24 bg-border-main rounded-full ring-[6px] ring-white mb-4"/>
          <div className="h-7 w-48 bg-border-main rounded-xl"/>
          <div className="h-4 w-40 bg-border-main rounded-lg mt-2"/>
          <div className="h-8 w-36 bg-border-main rounded-full mt-4"/>
          {/* Progress bar */}
          <div className="w-full max-w-sm mt-6 flex flex-col gap-2">
            <div className="flex justify-between">
              <div className="h-3 w-36 bg-border-main rounded"/>
              <div className="h-3 w-16 bg-border-main rounded"/>
            </div>
            <div className="h-2.5 w-full bg-border-main rounded-full"/>
          </div>
        </div>
      </div>

      {/* Subscription */}
      <div className="flex flex-col gap-3">
        <div className="h-3 w-36 bg-border-main rounded ml-2"/>
        <div className="card-base p-6 border-l-4 border-l-border-main flex flex-col gap-4">
          <div className="flex justify-between">
            <div className="flex flex-col gap-2">
              <div className="h-6 w-28 bg-border-main rounded-lg"/>
              <div className="h-4 w-48 bg-border-main rounded"/>
            </div>
            <div className="h-6 w-28 bg-border-main rounded-full"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-5 w-28 bg-border-main rounded"/>
            ))}
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-36 bg-border-main rounded-btn"/>
            <div className="h-10 w-28 bg-border-main rounded-btn"/>
          </div>
        </div>
      </div>

      {/* Pets */}
      <div className="flex flex-col gap-3">
        <div className="h-3 w-28 bg-border-main rounded ml-2"/>
        {[1,2].map(i => (
          <div key={i} className="card-base p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-border-main shrink-0"/>
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-4 w-24 bg-border-main rounded"/>
              <div className="h-3 w-36 bg-border-main rounded"/>
            </div>
          </div>
        ))}
      </div>

      {/* Settings */}
      <div className="flex flex-col gap-3">
        <div className="h-3 w-32 bg-border-main rounded ml-2"/>
        <div className="card-base divide-y divide-border-main">
          {[1,2,3,4].map(i => (
            <div key={i} className="p-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-border-main rounded-full"/>
              <div className="h-4 w-44 bg-border-main rounded"/>
            </div>
          ))}
        </div>
      </div>

      {/* Data & Support */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1,2].map(section => (
          <div key={section} className="flex flex-col gap-3">
            <div className="h-3 w-28 bg-border-main rounded ml-2"/>
            <div className="card-base divide-y divide-border-main">
              {[1,2,3].map(i => (
                <div key={i} className="p-4 h-12 bg-border-main/30"/>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Logout */}
      <div className="h-14 bg-border-main rounded-card"/>
    </div>
  )
}
