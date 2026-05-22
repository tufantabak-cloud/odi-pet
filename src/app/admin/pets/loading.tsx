export default function Loading() {
  return (
    <div className="flex flex-col gap-6 w-full animate-pulse pb-8">
      <div className="h-8 w-40 bg-border-main rounded-xl"/>
      <div className="flex gap-3">
        <div className="flex-1 h-11 bg-border-main rounded-input"/>
        <div className="h-11 w-24 bg-border-main rounded-btn"/>
      </div>
      <div className="card-base overflow-hidden">
        <div className="bg-border-main/50 h-12"/>
        {[1,2,3,4,5].map(i => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-border-main">
            <div className="w-10 h-10 bg-border-main rounded-full shrink-0"/>
            <div className="h-4 w-1/5 bg-border-main rounded"/>
            <div className="h-4 w-1/6 bg-border-main rounded"/>
            <div className="h-4 w-1/6 bg-border-main rounded"/>
            <div className="h-4 w-1/6 bg-border-main rounded"/>
            <div className="h-6 w-16 bg-border-main rounded-full ml-auto"/>
          </div>
        ))}
      </div>
    </div>
  )
}
