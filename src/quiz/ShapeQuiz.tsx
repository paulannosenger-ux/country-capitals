// Map quiz, "Silhouette" mode (the hard one): only the outline of a country on a plain background, name it.
// The shape is drawn north-up and true to size and form (equal-area projection centred on the country), from the
// detailed 1:10m Natural Earth borders (loaded only for this mode). Far-away small pieces (French Guiana, Hawaii)
// are left out, so the shape is the one you know.
// After a right answer: flag, capital and where the country lies on a small map. A wrong answer must be written out.
import { useEffect, useMemo, useRef, useState } from 'react'
import { geoAzimuthalEqualArea, geoCentroid, geoDistance, geoPath, geoArea } from 'd3-geo'
import { feature } from 'topojson-client'
import WorldMap, { countryOfFeature } from '../map/WorldMap'
import { capitalsOf, countries, countryById, countryName, flagUrl, otherName } from '../data/countries'
import { useLang, useT } from '../i18n'
import { checkCountryName, type AnswerResult } from '../study/matcher'
import { pickNextOpen, type QStatus, type Round } from './quizState'

const VW = 600, VH = 420, PAD = 28
const noop = () => {}

/** Country id -> its polygons (GeoJSON MultiPolygon), from the 1:10m borders. Loaded once. */
let shapes: Promise<Map<string, any>> | null = null
function loadShapes() {
  shapes ??= import('world-atlas/countries-10m.json').then((m) => {
    const topo = (m.default ?? m) as any
    const out = new Map<string, number[][][][]>()
    for (const f of (feature(topo, topo.objects.countries) as any).features) {
      const id = countryOfFeature(f)
      if (!id || !f.geometry) continue
      const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
      out.set(id, [...(out.get(id) ?? []), ...polys]) // Cyprus + N. Cyprus, Somalia + Somaliland
    }
    return new Map([...out].map(([id, polys]) => [id, { type: 'MultiPolygon', coordinates: polys }]))
  })
  return shapes
}

/** Only the pieces near the main one (or big ones): France without French Guiana, the USA without Hawaii. */
function mainPieces(geo: any): any {
  const pieces = geo.coordinates.map((coordinates: any) => ({ type: 'Polygon', coordinates }))
  const areas = pieces.map((p: any) => geoArea(p))
  const main = pieces[areas.indexOf(Math.max(...areas))]
  const c = geoCentroid(main)
  const kept = pieces.filter((p: any, i: number) => areas[i] >= Math.max(...areas) * 0.2 || geoDistance(geoCentroid(p), c) < 0.4) // 0.4 rad ≈ 2500 km
  return { type: 'MultiPolygon', coordinates: kept.map((p: any) => p.coordinates) }
}

/** SVG path of the country's outline, north up, filling the box. */
function silhouette(geo: any): string {
  const shape = mainPieces(geo)
  const [lon, lat] = geoCentroid(shape)
  const projection = geoAzimuthalEqualArea().rotate([-lon, -lat]).fitExtent([[PAD, PAD], [VW - PAD, VH - PAD]], shape)
  return geoPath(projection)(shape) ?? ''
}

type Phase = 'ask' | 'right' | 'wrong'

interface Props {
  ids: string[]
  round: Round
  setStatus: (id: string, status: QStatus) => void
}

export default function ShapeQuiz({ ids, round, setStatus }: Props) {
  const t = useT()
  const lang = useLang()
  const [geo, setGeo] = useState<Map<string, any> | null>(null)
  const [current, setCurrent] = useState<string | null>(() => pickNextOpen(round, ids, null))
  const [phase, setPhase] = useState<Phase>('ask')
  const [input, setInput] = useState('')
  const [result, setResult] = useState<AnswerResult['kind'] | null>(null)
  const [was, setWas] = useState('')
  const [tip, setTip] = useState(false)
  const [copyMsg, setCopyMsg] = useState('')
  const [nudge, setNudge] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadShapes().then(setGeo) }, [])
  useEffect(() => { if (phase !== 'right') inputRef.current?.focus() }, [phase, current, geo])

  const c = current ? countryById.get(current)! : null
  const d = useMemo(() => (c && geo?.get(c.id) ? silhouette(geo.get(c.id)) : null), [c, geo])

  function next() {
    setCurrent(pickNextOpen(round, ids, current))
    setPhase('ask'); setInput(''); setResult(null); setWas(''); setTip(false); setCopyMsg('')
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!c) return
    if (phase === 'right') return next()
    const r = checkCountryName(input, c, countries)
    if (phase === 'ask') {
      setResult(r.kind)
      if (r.kind === 'wrong') {
        setWas(input.trim()); setInput(''); setPhase('wrong'); setNudge((n) => n + 1)
        setStatus(c.id, 'missed')
      } else {
        setPhase('right')
        setStatus(c.id, tip || round[c.id] === 'missed' ? 'helped' : 'solved')
      }
      return
    }
    // wrong: write the name out once
    if (r.kind === 'correct') return next()
    setCopyMsg(t.notSame(countryName(c, lang)))
    setNudge((n) => n + 1)
  }

  // Enter on the result: next country
  useEffect(() => {
    if (phase !== 'right') return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); next() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!c) return null // round finished: MapQuiz shows the result card
  return (
    <div className="shape-wrap">
      <article className={'shape-card card-surface' + (nudge ? (nudge % 2 ? ' nudge-a' : ' nudge-b') : '')}>
        <p className="eyebrow">{t.shapeQuestion}</p>
        <div className={'shape-box' + (phase === 'right' ? ' right' : phase === 'wrong' ? ' wrong' : '')}>
          {d ? <svg viewBox={`0 0 ${VW} ${VH}`} role="img" aria-label={t.shapeQuestion}><path key={c.id} d={d} /></svg>
            : <div className="shape-loading">{geo ? t.shapeMissing : '…'}</div>}
        </div>

        {(tip || phase !== 'ask') && <img className="shape-flag" src={flagUrl(c)} alt={t.flagOf(countryName(c, lang))} />}

        {phase === 'right' ? (
          <div className="shape-solution">
            <div className="banner good" role="status">
              <strong>✓ {countryName(c, lang)}</strong>
              {otherName(c, lang) && <span className="muted"> · {otherName(c, lang)}</span>}
              {result === 'typo' && <span className="muted"> · {t.watchSpellingQuiz}</span>}
              <div>{c.capitals.length > 1 ? t.capitals : t.capital}: <b>{capitalsOf(c, lang).join(' · ')}</b></div>
            </div>
            <div className="shape-locate"><WorldMap fill continent={c.continent} focusId={c.id} onPickCountry={noop} /></div>
            <button className="btn" onClick={next} autoFocus>{t.nextCountry} <small>{t.enter}</small></button>
          </div>
        ) : (
          <form onSubmit={submit} className="shape-form">
            <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} className={phase === 'wrong' ? 'copy' : ''}
              placeholder={phase === 'wrong' ? t.typeThe(countryName(c, lang)) : t.nameOfCountry} aria-label={t.country}
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} enterKeyHint="go" />
            <div className="q-actions">
              {phase === 'ask' && (
                <button type="button" className="btn ghost q-tip" onClick={() => setTip(true)} disabled={tip}>{tip ? t.flagShown : t.tipShowFlag}</button>
              )}
              <button type="submit" className="btn">{phase === 'wrong' ? t.continue : t.check}</button>
            </div>
            {phase === 'wrong' && (
              <div className="banner bad" role="status">
                <strong>{t.notQuite}</strong>
                <div>{t.answerIs} <b>{countryName(c, lang)}</b>{was && <span className="was"> · {t.youTypedLower} <s>{was}</s></span>}</div>
                <div className="must">{t.writeOutQuiz}</div>
              </div>
            )}
            {phase === 'wrong' && copyMsg && <p className="copy-msg" role="alert">{copyMsg}</p>}
          </form>
        )}
      </article>
    </div>
  )
}
