import React, { useEffect, useMemo, useRef, useState } from 'react'

const fmt2 = (n: number) => n.toLocaleString(undefined)
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

function parseYMD(s: string | null) {
  const m = /^\d{4}-\d{2}-\d{2}$/.exec(s || '')
  if (!m) return null
  const [y, mo, d] = (s as string).split('-').map(Number)
  const dt = new Date(y, mo - 1, d)
  return Number.isNaN(dt.getTime()) ? null : dt
}

function diffInDays(a: Date, b: Date) { return (b.getTime() - a.getTime()) / 86400000 }
function diffInWeeks(a: Date, b: Date) { return diffInDays(a, b) / 7 }
function ageInYears(birth: Date, now = new Date()) { return (now.getTime() - birth.getTime()) / (365.2425 * 24 * 3600 * 1000) }

function startOfWeek(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = (d.getDay() + 6) % 7 // Mon=0
  d.setDate(d.getDate() - day)
  return d
}
function endOfWeek(date: Date) { const s = startOfWeek(date); const e = new Date(s); e.setDate(e.getDate() + 6); return e }

function useNow(tickMs = 1000) {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setNow(new Date()), tickMs); return () => clearInterval(id) }, [tickMs])
  return now
}

function useUrlState(defaultBirth: Date, defaultExpectancy: number) {
  const [state, setState] = useState(() => {
    const sp = new URLSearchParams(window.location.search)
    const b = parseYMD(sp.get('b')) || defaultBirth
    const e = Number(sp.get('e'))
    const expectancy = Number.isFinite(e) ? clamp(Math.round(e), 40, 120) : defaultExpectancy
    return { birth: b, expectancy }
  })

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const b = state.birth
    const e = String(state.expectancy)
    sp.set('b', `${b.getFullYear()}-${String(b.getMonth()+1).padStart(2,'0')}-${String(b.getDate()).padStart(2,'0')}`)
    sp.set('e', e)
    const url = `${window.location.pathname}?${sp.toString()}`
    window.history.replaceState(null, '', url)
  }, [state.birth, state.expectancy])

  return [state, setState] as const
}

function StatCard({ label, value, sub }: { label: string, value: React.ReactNode, sub?: string }) {
  return (
    <div className="rounded-2xl border bg-white/60 dark:bg-neutral-900/60 backdrop-blur p-4 shadow-sm">
      <div className="text-sm text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold leading-tight">{value}</div>
      {sub && <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{sub}</div>}
    </div>
  )
}

function ProgressBar({ pct }: { pct: number }) {
  const pctClamped = clamp(pct, 0, 100)
  return (
    <div className="w-full h-3 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
      <div className="h-full bg-black/80 dark:bg-white/90" style={{ width: `${pctClamped}%` }} aria-label={`Progress ${pctClamped.toFixed(2)}%`} />
    </div>
  )
}

function Tooltip({ x, y, children }: { x: number, y: number, children: React.ReactNode }) {
  return (
    <div className="pointer-events-none fixed z-50 max-w-xs rounded-xl border bg-white dark:bg-neutral-900 text-xs p-2 shadow-lg" style={{ left: x + 12, top: y + 12 }} role="tooltip">
      {children}
    </div>
  )
}

export default function Page() {
  const now = useNow(1000)
  const defaultBirth = new Date(new Date().getFullYear() - 20, 0, 1)
  const [state, setState] = useUrlState(defaultBirth, 85)
  const { birth, expectancy } = state

  const rows = expectancy
  const cols = 52
  const livedWeeks = Math.max(0, Math.floor(diffInWeeks(birth, now)))
  const totalWeeks = Math.round(expectancy * cols)
  const remainingWeeks = Math.max(0, totalWeeks - livedWeeks)
  const pctLived = (livedWeeks / totalWeeks) * 100
  const currentWeekIndex = livedWeeks

  const hoverRef = useRef<{ x: number, y: number, show: boolean, content: React.ReactNode | null}>({ x:0, y:0, show:false, content:null })
  const [, setHoverTick] = useState(0)

  const weeksData = useMemo(() => {
    const arr: { i: number, start: Date, end: Date, status: 'past'|'current'|'future' }[] = []
    const firstWeekStart = startOfWeek(birth)
    for (let i = 0; i < totalWeeks; i++) {
      const start = new Date(firstWeekStart)
      start.setDate(start.getDate() + i * 7)
      const end = endOfWeek(start)
      let status: 'past'|'current'|'future' = 'future'
      if (i < currentWeekIndex) status = 'past'
      else if (i === currentWeekIndex) status = 'current'
      arr.push({ i, start, end, status })
    }
    return arr
  }, [birth, totalWeeks, currentWeekIndex])

  const years = useMemo(() => {
    const res: number[] = []
    for (let r = 0; r < rows; r++) res.push(birth.getFullYear() + r)
    return res
  }, [birth, rows])

  const ageYearsExact = ageInYears(birth, now)
  const ageYearsInt = Math.floor(ageYearsExact)
  const ageDays = Math.floor(diffInDays(birth, now))
  const ageHours = Math.floor((now.getTime() - birth.getTime()) / 3600000)

  function onCellMouseMove(e: React.MouseEvent<HTMLButtonElement>, w: any) {
    hoverRef.current = {
      x: e.clientX,
      y: e.clientY,
      show: true,
      content: (
        <div>
          <div className="font-medium">Week {w.i + 1}</div>
          <div className="text-neutral-600 dark:text-neutral-300">{w.start.toDateString()} <span className="px-1">→</span> {w.end.toDateString()}</div>
          <div className="mt-1 text-[11px] uppercase tracking-wide">{w.status}</div>
        </div>
      )
    }
    setHoverTick((t) => t + 1)
  }
  function onCellLeave() { hoverRef.current.show = false; setHoverTick((t) => t + 1) }

  // dark mode toggle
  const [dark, setDark] = useState(() => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => { const root = document.documentElement; if (dark) root.classList.add('dark'); else root.classList.remove('dark') }, [dark])

  const [birthInput, setBirthInput] = useState(() => {
    const y = birth.getFullYear(); const m = String(birth.getMonth()+1).padStart(2, '0'); const d = String(birth.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  })
  useEffect(() => {
    setBirthInput(() => {
      const y = birth.getFullYear(); const m = String(birth.getMonth()+1).padStart(2, '0'); const d = String(birth.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    })
  }, [birth])

  function applyBirthInput() {
    const parsed = parseYMD(birthInput)
    if (parsed) setState((s) => ({ ...s, birth: parsed }))
  }
  function setExpectancyVal(e: number) { setState((s) => ({ ...s, expectancy: clamp(Math.round(e), 40, 120) })) }
  const quicks = [75, 80, 85, 90, 100]

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
        <div className="flex items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Life Calendar</h1>
            <p className="text-neutral-600 dark:text-neutral-300 mt-1 max-w-prose">A week-by-week view of your life — past, present, and (probable) future. Set your birthdate and expected lifespan.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"
              onClick={() => setDark((d) => !d)}
              aria-label="Toggle dark mode"
            >
              {dark ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border bg-white/60 dark:bg-neutral-900/60 backdrop-blur p-4">
            <div className="text-sm font-medium">Birthdate</div>
            <div className="mt-2 flex gap-2">
              <input type="date" value={birthInput} onChange={(e) => setBirthInput(e.target.value)} className="w-full rounded-xl border bg-white/70 dark:bg-neutral-900/70 px-3 py-2 outline-none focus:ring-2 focus:ring-black/30 dark:focus:ring-white/30" />
              <button className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={applyBirthInput}>Apply</button>
            </div>
            <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">Tip: URL updates to keep your settings.</div>
          </div>

          <div className="rounded-2xl border bg-white/60 dark:bg-neutral-900/60 backdrop-blur p-4">
            <div className="text-sm font-medium">Life Expectancy (years)</div>
            <div className="mt-2 flex items-center gap-3">
              <input type="number" min={40} max={120} step={1} value={expectancy} onChange={(e) => setExpectancyVal(Number(e.target.value))} className="w-28 rounded-xl border bg-white/70 dark:bg-neutral-900/70 px-3 py-2 outline-none focus:ring-2 focus:ring-black/30 dark:focus:ring-white/30" />
              <div className="flex flex-wrap gap-2">
                {quicks.map((q) => (
                  <button key={q} onClick={() => setExpectancyVal(q)} className={`rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 ${q===expectancy? 'bg-neutral-100 dark:bg-neutral-800':''}`}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">Grid uses 52 columns (weeks) per year.</div>
          </div>

          <div className="rounded-2xl border bg-white/60 dark:bg-neutral-900/60 backdrop-blur p-4 grid grid-cols-2 gap-3">
            <StatCard label="Age (years)" value={ageYearsExact.toFixed(6)} sub={`${ageYearsInt} full years`} />
            <StatCard label="Age (days)" value={fmt2(ageDays)} sub={`${fmt2(ageHours)} hours`} />
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-2 text-sm">
                <div>Life progress</div>
                <div className="tabular-nums">{pctLived.toFixed(2)}%</div>
              </div>
              <ProgressBar pct={pctLived} />
              <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                {fmt2(livedWeeks)} weeks lived • {fmt2(remainingWeeks)} weeks left (approx)
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 text-sm items-center">
          <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-sm bg-neutral-900 dark:bg-neutral-100" /> Past</div>
          <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-sm bg-neutral-400 dark:bg-neutral-500" /> Current week</div>
          <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-sm bg-neutral-200 dark:bg-neutral-800" /> Future</div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[760px] rounded-2xl border bg-white/60 dark:bg-neutral-900/60 backdrop-blur p-4">
            <div className="grid grid-cols-[auto,1fr] gap-3">
              <div className="flex flex-col gap-[6px] pt-[2px]">
                {years.map((y, idx) => (
                  <div key={y} className="h-3 text-[10px] text-neutral-500 dark:text-neutral-400 tabular-nums">{(idx%2===0)? y: ''}</div>
                ))}
              </div>

              <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(10px, 1fr))`, rowGap: 6, columnGap: 6 }} role="grid" aria-label="Life weeks grid">
                {weeksData.map((w) => {
                  let cls = 'h-3 rounded-[3px] outline-none'
                  if (w.status === 'past') cls += ' bg-neutral-900 dark:bg-neutral-100'
                  else if (w.status === 'current') cls += ' bg-neutral-400 dark:bg-neutral-500 animate-pulse'
                  else cls += ' bg-neutral-200 dark:bg-neutral-800'
                  return (
                    <button
                      key={w.i}
                      className={cls}
                      onMouseMove={(e) => onCellMouseMove(e, w)}
                      onMouseLeave={onCellLeave}
                      onMouseEnter={(e) => onCellMouseMove(e, w)}
                      onBlur={onCellLeave}
                      title={`Week ${w.i+1}: ${w.start.toDateString()} → ${w.end.toDateString()}`}
                      aria-label={`Week ${w.i+1} ${w.status}`}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-xs text-neutral-500 dark:text-neutral-400 max-w-prose">
          Weeks are approximated with 52 columns/year. Calculations use local time and average year length (365.2425 days). Hover a square to see its date range. Use the URL params <code>?b=YYYY-MM-DD&e=85</code> to share.
        </div>
      </div>

      {hoverRef.current.show && (
        <Tooltip x={hoverRef.current.x} y={hoverRef.current.y}>
          {hoverRef.current.content}
        </Tooltip>
      )}
    </div>
  )
}