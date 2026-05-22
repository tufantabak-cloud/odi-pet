export default function Loading() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto animate-pulse pb-8">
      <div className="h-8 w-52 bg-border-main rounded-xl"/>
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-3">
        {[1,2,3].map(i => (
          <div key={i} className="w-3 h-3 bg-border-main rounded-full"/>
        ))}
      </div>
      <div className="card-base p-6 sm:p-8 flex flex-col gap-6 items-center">
        {/* Photo upload */}
        <div className="w-28 h-28 bg-border-main rounded-full"/>
        {/* Form fields */}
        {[1,2,3,4].map(i => (
          <div key={i} className="w-full flex flex-col gap-2">
            <div className="h-3 w-24 bg-border-main rounded"/>
            <div className="h-12 w-full bg-border-main rounded-input"/>
          </div>
        ))}
        <div className="h-12 w-full bg-border-main rounded-btn mt-2"/>
      </div>
    </div>
  )
}
