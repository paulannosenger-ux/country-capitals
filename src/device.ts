// Which version of the interface to show:
//   desktop = mouse/trackpad and a wide window
//   mobile  = phones and tablets (touch screen), or any narrow window: tab bar at the bottom, full-width map
// Updates live (rotating a tablet, resizing the window). Also set as <html data-device="..."> for the CSS.
import { useSyncExternalStore } from 'react'

export type Device = 'desktop' | 'mobile'

const touch = window.matchMedia('(pointer: coarse)')
const detect = (): Device => (touch.matches || window.innerWidth < 1000 ? 'mobile' : 'desktop')

let device = detect()
document.documentElement.dataset.device = device
const listeners = new Set<() => void>()
function update() {
  const next = detect()
  if (next === device) return
  device = next
  document.documentElement.dataset.device = device
  listeners.forEach((fn) => fn())
}
window.addEventListener('resize', update)
touch.addEventListener('change', update)

export const useDevice = () => useSyncExternalStore((fn) => { listeners.add(fn); return () => { listeners.delete(fn) } }, () => device)
