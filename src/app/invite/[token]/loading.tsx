export default function Loading() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-bg-main">
      <div className="w-full max-w-[480px] card-base p-8 sm:p-10 animate-pulse">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-border-main rounded-[20px] mb-5"/>
          <div className="h-7 w-40 bg-border-main rounded-xl"/>
          <div className="h-4 w-64 bg-border-main rounded-lg mt-3"/>
        </div>
        {/* Invitation details */}
        <div className="card-base p-6 flex flex-col gap-3 mb-6 border-l-4 border-l-border-main">
          <div className="h-4 w-32 bg-border-main rounded"/>
          <div className="h-3 w-48 bg-border-main rounded"/>
          <div className="h-3 w-36 bg-border-main rounded"/>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 h-12 bg-border-main rounded-btn"/>
          <div className="flex-1 h-12 bg-border-main rounded-btn"/>
        </div>
      </div>
    </div>
  )
}
