export default function Loading() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto animate-pulse py-8">
      <div className="h-9 w-64 bg-border-main rounded-xl"/>
      <div className="flex flex-col gap-4">
        <div className="h-4 w-full bg-border-main rounded"/>
        <div className="h-4 w-5/6 bg-border-main rounded"/>
        <div className="h-4 w-full bg-border-main rounded"/>
        <div className="h-4 w-3/4 bg-border-main rounded"/>
        <div className="h-8 bg-transparent"/>
        <div className="h-4 w-full bg-border-main rounded"/>
        <div className="h-4 w-4/5 bg-border-main rounded"/>
        <div className="h-4 w-full bg-border-main rounded"/>
        <div className="h-4 w-2/3 bg-border-main rounded"/>
        <div className="h-8 bg-transparent"/>
        <div className="h-4 w-full bg-border-main rounded"/>
        <div className="h-4 w-5/6 bg-border-main rounded"/>
      </div>
    </div>
  )
}
