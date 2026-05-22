export default function Loading() {
  return (
    <div className="flex flex-col h-[calc(100dvh-6rem)] max-h-[860px] w-full mx-auto animate-pulse">
      {/* Header */}
      <div className="border-b border-border-main pb-4 mb-4 shrink-0 flex items-start gap-4">
        <div className="w-10 h-10 bg-border-main rounded-full shrink-0"/>
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-border-main rounded-xl"/>
            <div className="h-7 w-20 bg-border-main rounded-xl"/>
          </div>
          <div className="h-4 w-56 bg-border-main rounded-lg"/>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-3 w-20 bg-border-main rounded"/>
            <div className="h-8 w-36 bg-border-main rounded-input"/>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex justify-start">
          <div className="w-7 h-7 bg-border-main rounded-full mr-2"/>
          <div className="max-w-[85%] bg-border-main rounded-[18px] rounded-bl-[4px] p-4 h-20"/>
        </div>
      </div>

      {/* Quick prompts */}
      <div className="pt-4 border-t border-border-main mt-4 shrink-0 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-8 w-36 bg-border-main rounded-full"/>
          ))}
        </div>
        {/* Input */}
        <div className="flex gap-3">
          <div className="flex-1 h-12 bg-border-main rounded-input"/>
          <div className="w-14 h-12 bg-border-main rounded-btn shrink-0"/>
        </div>
        <div className="h-3 w-64 bg-border-main rounded mx-auto"/>
      </div>
    </div>
  )
}
