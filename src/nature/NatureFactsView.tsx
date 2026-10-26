// Key figures of a river / water / mountain range: length, area, depth, highest peak, source + mouth,
// the countries it touches (with flags) and the short fact text.
import { countryById, countryName, flagUrl } from '../data/countries'
import { useLang, useT } from '../i18n'
import { NATURE_FACTS, type NatureItem } from './nature'

export default function NatureFactsView({ item }: { item: NatureItem }) {
  const t = useT()
  const lang = useLang()
  const f = NATURE_FACTS[item.id]
  const de = lang === 'de' ? 1 : 0
  const countries = (f?.countries ?? []).map((id) => countryById.get(id)).filter((c) => c !== undefined)
  return (
    <>
      <dl className="facts nat-facts">
        {f?.lengthKm && <div><dt>{t.nLength}</dt><dd>{t.fmtNum(f.lengthKm)} km</dd></div>}
        {f?.areaKm2 && <div><dt>{t.area}</dt><dd>{t.fmtNum(f.areaKm2)} km²</dd></div>}
        {f?.depthM && <div><dt>{t.nDepth}</dt><dd>{t.fmtNum(f.depthM)} m</dd></div>}
        {f?.opened && <div><dt>{t.nOpened}</dt><dd>{f.opened}</dd></div>}
        {f?.peak && <div className="wide"><dt>{t.nPeak}</dt><dd>{f.peak.name[de]} <small>({t.fmtNum(f.peak.m)} m)</small></dd></div>}
        {f?.source && <div><dt>{t.nSource}</dt><dd>{f.source[de]}</dd></div>}
        {f?.mouth && <div><dt>{t.nMouth}</dt><dd>{f.mouth[de]}</dd></div>}
        {countries.length > 0 && (
          <div className="wide">
            <dt>{t.nCountries[item.kind]}</dt>
            <dd className="nat-countries">
              {countries.map((c) => (
                <span key={c.id}><img src={flagUrl(c)} alt="" />{countryName(c, lang)}</span>
              ))}
            </dd>
          </div>
        )}
      </dl>
      <p className="summary nat-summary">{item.fact[lang]}</p>
    </>
  )
}
