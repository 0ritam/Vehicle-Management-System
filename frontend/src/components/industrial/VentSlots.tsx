export function VentSlots({ count = 3 }: { count?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-6 w-1 rounded-full"
          style={{
            backgroundColor: "var(--muted)",
            boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)",
          }}
        />
      ))}
    </div>
  )
}
