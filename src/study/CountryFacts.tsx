// Facts about a country, shown after a correct answer (flashcards and map quiz).
import CountUp from '../components/CountUp'
import type { Country } from '../data/countries'

const fmtPopulation = (n: number) => `≈ ${n >= 1e6 ? `${(n / 1e6).toFixed(n < 1e7 ? 2 : 1)} million` : Math.round(n).toLocaleString('en-US')}`
const fmtArea = (n: number, target: number) => `${target < 100 ? n.toFixed(target % 1 ? 2 : 0) : Math.round(n).toLocaleString('en-US')} km²`
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function CountryFacts({ country: c }: { country: Country }) {
  return (
    <>
      <dl className="facts">
        {c.population && (<div><dt>Population</dt><dd><CountUp value={c.population.value} format={fmtPopulation} /> <small>({c.population.year})</small></dd></div>)}
        {c.areaKm2 && (<div><dt>Area</dt><dd><CountUp value={c.areaKm2} format={(n) => fmtArea(n, c.areaKm2!)} /></dd></div>)}
        {c.government && (<div className="wide"><dt>Government</dt><dd>{capitalize(c.government)}</dd></div>)}
        <div><dt>Languages</dt><dd>{c.languages.join(', ')}</dd></div>
        <div><dt>Currency</dt><dd>{c.currencies.map((x) => `${x.name}${x.symbol ? ` (${x.symbol})` : ''}`).join(', ')}</dd></div>
      </dl>
      {c.summary && (
        <p className="summary">
          {c.summary.text}{' '}
          <a href={c.summary.url} target="_blank" rel="noreferrer">Wikipedia</a>
        </p>
      )}
    </>
  )
}
