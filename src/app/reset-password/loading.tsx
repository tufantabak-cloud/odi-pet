export default function Loading() {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center p-4 bg-bg-main">
      <div className="w-full max-w-[420px] card-base p-8 sm:p-10 animate-pulse">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-border-main rounded-card mb-5"/>
          <div className="h-7 w-48 bg-border-main rounded-xl"/>
          <div className="h-4 w-64 bg-border-main rounded-lg mt-3"/>
        </div>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="h-3 w-24 bg-border-main rounded"/>
            <div className="h-12 w-full bg-border-main rounded-input"/>
          </div>
          <div className="h-14 w-full bg-border-main rounded-btn"/>
          <div className="h-4 w-36 bg-border-main rounded mx-auto mt-2"/>
        </div>
      </div>
    </div>
  )
}
