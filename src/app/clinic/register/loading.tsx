export default function Loading() {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center p-4 bg-bg-main">
      <div className="w-full max-w-[480px] card-base p-8 sm:p-10 animate-pulse">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-border-main rounded-sheet mb-5"/>
          <div className="h-7 w-48 bg-border-main rounded-xl"/>
          <div className="h-4 w-72 bg-border-main rounded-lg mt-3"/>
        </div>
        <div className="flex flex-col gap-5">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex flex-col gap-2">
              <div className="h-3 w-24 bg-border-main rounded"/>
              <div className="h-12 w-full bg-border-main rounded-input"/>
            </div>
          ))}
          <div className="h-14 w-full bg-border-main rounded-btn mt-2"/>
        </div>
      </div>
    </div>
  )
}
