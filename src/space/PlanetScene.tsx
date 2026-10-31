// One planet as a real 3D ball (three.js) in space: its surface picture, lit by the Sun from the upper left so you see
// day and night, tilted like the real planet (Uranus on its side), slowly turning. Saturn gets its rings.
// Drag to turn it, scroll/pinch to zoom. `reserveRight` keeps the planet centred in the part not covered by the panel.
import { useEffect, useRef } from 'react'
import {
  AmbientLight, DirectionalLight, DoubleSide, EquirectangularReflectionMapping, Group, Mesh, MeshStandardMaterial,
  PerspectiveCamera, RingGeometry, SRGBColorSpace, Scene, SphereGeometry, TextureLoader, WebGLRenderer, type Texture,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { starrySky, stars } from '../map/space'
import { RING_URL, textureUrl, type Planet } from './planets'

const loader = new TextureLoader()
const textures = new Map<string, Texture>()
function texture(url: string): Texture {
  if (!textures.has(url)) {
    const t = loader.load(url)
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 8
    textures.set(url, t)
  }
  return textures.get(url)!
}

/** Saturn's ring: the ring picture is one strip from the inside to the outside edge, so every point gets u = its distance. */
function ringMesh(): Mesh {
  const inner = 1.24, outer = 2.27 // in Saturn radii (C ring to A ring)
  const geo = new RingGeometry(inner, outer, 160, 1)
  const pos = geo.attributes.position, uv = geo.attributes.uv
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i))
    uv.setXY(i, (r - inner) / (outer - inner), 0.5)
  }
  const mesh = new Mesh(geo, new MeshStandardMaterial({ map: texture(RING_URL), side: DoubleSide, transparent: true, depthWrite: false }))
  mesh.rotation.x = -Math.PI / 2 // in the planet's equator
  return mesh
}

interface Props { planet: Planet; reserveRight?: number }

export default function PlanetScene({ planet, reserveRight = 0 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const api = useRef<{ show: (p: Planet) => void; offset: (px: number) => void } | null>(null)

  // Set up renderer, camera, light, stars once.
  useEffect(() => {
    const el = wrapRef.current!
    const renderer = new WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
    renderer.setClearColor('#01020a')
    el.appendChild(renderer.domElement)

    const scene = new Scene()
    const sky = loader.load(starrySky())
    sky.mapping = EquirectangularReflectionMapping
    sky.colorSpace = SRGBColorSpace
    scene.background = sky
    const starLayers = stars(800)
    starLayers.forEach((s) => scene.add(s))
    scene.add(new AmbientLight(0xffffff, 0.14)) // the night side stays faintly visible
    const sun = new DirectionalLight(0xffffff, 3)
    sun.position.set(-5, 2.5, 3.5)
    scene.add(sun)

    const camera = new PerspectiveCamera(32, 1, 0.1, 3000)
    camera.position.set(0, 1.4, 6.25) // a little above the planet's path, so Saturn's rings are seen open, not edge-on
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = false
    controls.enableDamping = true
    controls.minDistance = 2.2
    controls.maxDistance = 16

    // the planet: tilt (group) > turning ball (+ ring)
    const tilt = new Group()
    const ball = new Mesh(new SphereGeometry(1, 96, 64), new MeshStandardMaterial({ roughness: 1, metalness: 0 }))
    const ring = ringMesh()
    tilt.add(ball)
    scene.add(tilt)
    let spin = 1
    let scale = 0.6 // grows to 1 when a new planet appears

    function show(p: Planet) {
      const mat = ball.material as MeshStandardMaterial
      mat.map = texture(textureUrl(p))
      mat.needsUpdate = true
      tilt.rotation.set(p.id === 'saturn' ? 0.25 : 0, 0, (-p.tilt * Math.PI) / 180)
      if (p.id === 'saturn') tilt.add(ring); else tilt.remove(ring)
      spin = p.spin
      scale = 0.6
      // the ring needs room: Saturn a little further away
      camera.position.setLength(p.id === 'saturn' ? 9.5 : 6.4)
      controls.update()
    }

    let reserve = 0
    function size() {
      const w = el.clientWidth, h = el.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h)
      camera.aspect = w / h
      // shift the picture so the planet sits in the middle of the free part (left of the panel)
      if (reserve) camera.setViewOffset(w, h, reserve / 2, 0, w, h); else camera.clearViewOffset()
      camera.updateProjectionMatrix()
    }
    size()
    const ro = new ResizeObserver(size)
    ro.observe(el)

    let frame = 0, last = performance.now()
    function tick(now: number) {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      ball.rotation.y += dt * 0.12 * spin
      scale += (1 - scale) * Math.min(1, dt * 6)
      tilt.scale.setScalar(scale)
      controls.update()
      renderer.render(scene, camera)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    api.current = { show, offset: (px) => { reserve = px; size() } }
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      controls.dispose()
      starLayers.forEach((s) => { s.geometry.dispose(); (s.material as MeshStandardMaterial).dispose() })
      ball.geometry.dispose(); (ball.material as MeshStandardMaterial).dispose()
      ring.geometry.dispose(); (ring.material as MeshStandardMaterial).dispose()
      sky.dispose()
      renderer.dispose()
      el.innerHTML = ''
      api.current = null
    }
  }, [])

  useEffect(() => { api.current?.show(planet) }, [planet])
  useEffect(() => { api.current?.offset(reserveRight) }, [reserveRight])

  return <div ref={wrapRef} className="planet-scene" />
}
