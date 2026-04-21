export function ScrewDetail({ className = "" }: { className?: string }) {
  return (
    <div
      className={`absolute h-2.5 w-2.5 rounded-full ${className}`}
      style={{
        background:
          "radial-gradient(circle, rgba(0,0,0,0.2) 20%, rgba(0,0,0,0.08) 40%, transparent 60%)",
      }}
    />
  )
}

export function CornerScrews() {
  return (
    <>
      <ScrewDetail className="top-3 left-3" />
      <ScrewDetail className="top-3 right-3" />
      <ScrewDetail className="bottom-3 left-3" />
      <ScrewDetail className="bottom-3 right-3" />
    </>
  )
}
