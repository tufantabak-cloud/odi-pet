export default function Loading() {
  return (
    <div className="flex flex-col gap-6 w-full animate-pulse pb-8">
      <div className="h-8 w-32 bg-border-main rounded-xl"/>
      <div className="card-base p-5 flex items-center gap-4">
        <div className="w-12 h-12 bg-border-main rounded-full shrink-0"/>
        <div className="flex flex-col gap-2 flex-1">
          <div className="h-4 w-36 bg-border-main rounded"/>
          <div className="h-3 w-24 bg-border-main rounded"/>
        </div>
        <div className="h-6 w-16 bg-border-main rounded-full"/>
      </div>
    </div>
  )
}
