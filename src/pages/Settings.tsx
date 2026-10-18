// Settings: daily limits, backup (export/import) and reset.
import { useRef, useState } from 'react'
import { store, useProgress } from '../progress/progress'

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="number" inputMode="numeric" min={min} max={max} value={value}
        onChange={(e) => { const n = Math.round(Number(e.target.value)); if (n >= min && n <= max) onChange(n) }} />
    </label>
  )
}

export default function Settings({ onBack }: { onBack: () => void }) {
  useProgress()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const { settings } = store

  function exportProgress() {
    const blob = new Blob([store.exportJson()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `country-capitals-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setMessage({ ok: true, text: 'Backup downloaded. Keep the file somewhere safe.' })
  }

  async function importProgress(file: File | undefined) {
    if (!file) return
    if (!confirm('Importing replaces ALL current progress on this device with the file. Continue?')) return
    try {
      store.importJson(await file.text())
      setMessage({ ok: true, text: 'Progress imported.' })
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message })
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  function resetProgress() {
    if (!confirm('Delete ALL progress on this device? This cannot be undone (export a backup first!).')) return
    store.reset()
    setMessage({ ok: true, text: 'All progress was reset.' })
  }

  return (
    <section className="settings">
      <div className="page-head">
        <button className="pill" onClick={onBack}>← Back</button>
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="panel card-surface">
        <h3>Daily limits</h3>
        <p className="muted">250 or more = no limit: a whole continent is played through in one go.</p>
        <NumberField label="New cards per day" value={settings.newPerDay} min={0} max={500} onChange={(n) => store.updateSettings({ newPerDay: n })} />
        <NumberField label="Maximum reviews per day" value={settings.reviewsPerDay} min={0} max={1000} onChange={(n) => store.updateSettings({ reviewsPerDay: n })} />
      </div>

      <div className="panel card-surface">
        <h3>Backup</h3>
        <p>
          Your progress is stored <b>only in this browser</b>. Clearing browser data deletes it, so export a backup now and then.
          Use export/import to move progress between phone and laptop.
        </p>
        <div className="row">
          <button className="btn" onClick={exportProgress}>Export progress</button>
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>Import progress…</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => importProgress(e.target.files?.[0])} />
        </div>
        {message && <p className={'msg ' + (message.ok ? 'ok' : 'err')} role="status">{message.text}</p>}
      </div>

      <div className="panel card-surface">
        <h3>Reset</h3>
        <button className="btn danger" onClick={resetProgress}>Reset all progress</button>
      </div>
    </section>
  )
}
