// A small map with one river / water / mountain range highlighted (quiz-duel questions). Lazy-loaded.
import { useMemo } from 'react'
import WorldMap from '../map/WorldMap'
import { NATURE } from './nature'
import { GEO, boundsOf, pathOf } from './geo'
import './nature.css'

const noop = () => {}

export default function NatureShape({ id }: { id: string }) {
  const item = NATURE.find((n) => n.id === id)!
  const overlay = useMemo(() => (
    <g className="nat-layer">
      <path className={'nat-halo ' + item.kind} d={pathOf(id)} />
      <path className={'nat on ' + item.kind} d={pathOf(id)} />
    </g>
  ), [id, item.kind])
  return (
    <div className="qd-map">
      <WorldMap fill continent={item.areas[0]} focusId={null} onPickCountry={noop} hideNames classFor={() => 'q-open'} colorKey={id}
        overlay={overlay} fitBox={boundsOf([id])} targetLonLat={GEO[id].at} />
    </div>
  )
}
