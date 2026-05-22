export default function Loading() {
  return (
    <div className="flex flex-col gap-6 w-full animate-pulse pb-8">
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 bg-border-main rounded-xl"/>
        <div className="h-10 w-28 bg-border-main rounded-btn"/>
      </div>
      <div className="h-11 w-full bg-border-main rounded-input"/>
      {/* Table */}
      <div className="card-base overflow-hidden">
        <div className="bg-border-main/50 h-12"/>
        {[1,2,3,4,5].map(i => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-border-main">
            <div className="w-8 h-8 bg-border-main rounded-full shrink-0"/>
            <div className="h-4 w-1/5 bg-border-main rounded"/>
            <div className="h-4 w-1/4 bg-border-main rounded"/>
            <div className="h-4 w-1/6 bg-border-main rounded"/>
            <div className="h-6 w-16 bg-border-main rounded-full"/>
            <div className="h-6 w-20 bg-border-main rounded-full ml-auto"/>
          </div>
        ))}
      </div>
    </div>
  )
}
