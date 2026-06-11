import React, { useEffect, useRef, useState } from 'react'

export function CountdownTimer({ deadline, onExpire }: { deadline: number; onExpire?: () => void }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, deadline - Date.now()))
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    if (remaining <= 0) return
    const id = setInterval(() => {
      const r = Math.max(0, deadline - Date.now())
      setRemaining(r)
      if (r <= 0) { clearInterval(id); onExpireRef.current?.() }
    }, 1000)
    return () => clearInterval(id)
  }, [deadline])

  if (remaining <= 0) return <span className="text-xs font-semibold text-red-500">Expired</span>
  const mins = Math.floor(remaining / 60_000)
  const secs = Math.floor((remaining % 60_000) / 1000)
  return (
    <span className={`text-xs font-mono font-semibold tabular-nums ${remaining < 60_000 ? 'text-red-500' : 'text-amber-600'}`}>
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </span>
  )
}
