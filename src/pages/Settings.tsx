// Settings: daily limits, backup (export/import) and reset.
import { useRef, useState } from 'react'
import { store, useProgress } from '../progress/progress'
import { useT } from '../i18n'
import { pushOverwrite, useAccount } from '../cloud/cloud'

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
  const t = useT()
  const account = useAccount()
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
    setMessage({ ok: true, text: t.backupDownloaded })
  }

  async function importProgress(file: File | undefined) {
    if (!file) return
    if (!confirm(t.confirmImport)) return
    try {
      store.importJson(await file.text())
      pushOverwrite()
      setMessage({ ok: true, text: t.imported })
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message })
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  function resetProgress() {
    if (!confirm(t.confirmReset)) return
    store.reset()
    pushOverwrite()
    setMessage({ ok: true, text: t.wasReset })
  }

  return (
    <section className="settings">
      <div className="page-head">
        <button className="pill" onClick={onBack}>{t.back}</button>
        <h1 className="page-title">{t.settings}</h1>
      </div>

      <div className="panel card-surface">
        <h3>{t.dailyLimits}</h3>
        <p className="muted">{t.dailyLimitsHint}</p>
        <NumberField label={t.newPerDay} value={settings.newPerDay} min={0} max={500} onChange={(n) => store.updateSettings({ newPerDay: n })} />
        <NumberField label={t.reviewsPerDay} value={settings.reviewsPerDay} min={0} max={1000} onChange={(n) => store.updateSettings({ reviewsPerDay: n })} />
      </div>

      <div className="panel card-surface">
        <h3>{t.backup}</h3>
        {account.status === 'signedIn'
          ? <p>{t.backupSynced}</p>
          : <p>{t.backupText1}<b>{t.backupOnly}</b>{t.backupText2}</p>}
        <div className="row">
          <button className="btn" onClick={exportProgress}>{t.exportProgress}</button>
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>{t.importProgress}</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => importProgress(e.target.files?.[0])} />
        </div>
        {message && <p className={'msg ' + (message.ok ? 'ok' : 'err')} role="status">{message.text}</p>}
      </div>

      <div className="panel card-surface">
        <h3>{t.reset}</h3>
        <button className="btn danger" onClick={resetProgress}>{t.resetAll}</button>
      </div>
    </section>
  )
}
