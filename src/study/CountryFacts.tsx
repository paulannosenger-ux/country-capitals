// Facts about a country, shown after a correct answer (flashcards and map quiz). The cities are also drawn on the map.
import CountUp from '../components/CountUp'
import type { Country } from '../data/countries'
import { citiesOf, cityName } from '../data/cities'
import { useLang, useT } from '../i18n'

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function CountryFacts({ country: c }: { country: Country }) {
  const t = useT()
  const lang = useLang()
  const de = lang === 'de'
  const cities = citiesOf(c.id)
  const government = de ? c.de.government ?? c.government : c.government
  const languages = de ? c.de.languages : c.languages
  const currencies = c.currencies.map((x, i) => `${de ? c.de.currencies[i] ?? x.name : x.name}${x.symbol ? ` (${x.symbol})` : ''}`)
  const summary = de ? c.de.summary ?? c.summary : c.summary
  return (
    <>
      <dl className="facts">
        {c.population && (<div><dt>{t.population}</dt><dd><CountUp value={c.population.value} format={t.fmtPopulation} /> <small>({c.population.year})</small></dd></div>)}
        {c.areaKm2 && (<div><dt>{t.area}</dt><dd><CountUp value={c.areaKm2} format={(n) => t.fmtArea(n, c.areaKm2!)} /></dd></div>)}
        {government && (<div className="wide"><dt>{t.government}</dt><dd>{capitalize(government)}</dd></div>)}
        <div><dt>{t.languages}</dt><dd>{languages.join(', ')}</dd></div>
        <div><dt>{t.currency}</dt><dd>{currencies.join(', ')}</dd></div>
        {cities.length > 1 && (
          <div className="wide"><dt>{t.bigCities}</dt><dd className="city-list">
            {cities.map((x, i) => <span key={i} className={x.cap ? 'cap' : ''}>{cityName(x, lang)}</span>)}
          </dd></div>
        )}
      </dl>
      {summary && (
        <p className="summary">
          {summary.text}{' '}
          <a href={summary.url} target="_blank" rel="noreferrer">Wikipedia</a>
        </p>
      )}
    </>
  )
}
