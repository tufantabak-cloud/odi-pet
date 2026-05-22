export default function Loading() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-bg-main">
      <div className="w-full max-w-[420px] card-base p-8 sm:p-10 animate-pulse">
        <div className="flex flex-col items-center mb-10">
          <div className="w-24 h-24 bg-border-main rounded-[24px] mb-6"/>
          <div className="h-8 w-44 bg-border-main rounded-xl"/>
          <div className="h-4 w-28 bg-border-main rounded-lg mt-3"/>
        </div>
        {/* Social buttons */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 h-12 bg-border-main rounded-[14px]"/>
          <div className="flex-1 h-12 bg-border-main rounded-[14px]"/>
        </div>
        {/* Divider */}
        <div className="flex items-center gap-4 my-4">
          <div className="flex-1 h-px bg-border-main"/>
          <div className="h-3 w-8 bg-border-main rounded"/>
          <div className="flex-1 h-px bg-border-main"/>
        </div>
        {/* Inputs */}
        <div className="flex flex-col gap-5 mt-4">
          <div className="flex flex-col gap-2">
            <div className="h-3 w-12 bg-border-main rounded"/>
            <div className="h-12 w-full bg-border-main rounded-input"/>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-3 w-16 bg-border-main rounded"/>
            <div className="h-12 w-full bg-border-main rounded-input"/>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-3 w-24 bg-border-main rounded"/>
            <div className="h-12 w-full bg-border-main rounded-input"/>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-3 w-12 bg-border-main rounded"/>
            <div className="h-12 w-full bg-border-main rounded-input"/>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-3 w-24 bg-border-main rounded"/>
            <div className="h-12 w-full bg-border-main rounded-input"/>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-border-main rounded"/>
            <div className="h-3 w-48 bg-border-main rounded"/>
          </div>
          <div className="h-14 w-full bg-border-main rounded-btn mt-2"/>
          <div className="h-4 w-48 bg-border-main rounded mx-auto mt-4"/>
        </div>
      </div>
    </div>
  )
}
