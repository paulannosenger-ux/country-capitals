// The Space tab's 3D scene (three.js), two views:
// - system: the solar system. The Sun in the middle, the 8 planets on their orbits (slowly going round), names next to
//   them. Distances and sizes are squeezed (in real life the planets would be specks far apart), the order is right.
//   Tap a planet (or pick it in the panel): the camera flies to it and follows it; `focus = null` = the whole system.
// - solo: one planet alone, lit from the side, no name (the quiz).
// Planets are tilted like the real ones (Uranus on its side), Saturn has its rings. Drag to turn, scroll/pinch to zoom.
// `reserveRight` keeps everything centred in the part of the screen the panel doesn't cover.
import { useEffect, useRef } from 'react'
import {
  AdditiveBlending, AmbientLight, BufferGeometry, CanvasTexture, DirectionalLight, DoubleSide, EquirectangularReflectionMapping,
  Group, LineBasicMaterial, LineLoop, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, PointLight,
  Raycaster, RingGeometry, SRGBColorSpace, Scene, SphereGeometry, Sprite, SpriteMaterial, TextureLoader, Vector2, Vector3,
  WebGLRenderer, type Texture,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { starrySky, stars } from '../map/space'
import { PLANETS, RING_URL, SUN_URL, textureUrl, type Planet } from './planets'

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

// ---- squeezed solar system (scene units) ----
const SUN_R = 3.2
const AU: Record<string, number> = { mercury: 0.39, venus: 0.72, earth: 1, mars: 1.52, jupiter: 5.2, saturn: 9.58, uranus: 19.2, neptune: 30.05 }
const YEARS: Record<string, number> = { mercury: 0.24, venus: 0.62, earth: 1, mars: 1.88, jupiter: 11.86, saturn: 29.46, uranus: 84, neptune: 164.8 }
const orbitRadius = (p: Planet) => 4.8 + 6 * Math.pow(AU[p.id], 0.45)
const ballRadius = (p: Planet) => 0.55 * Math.pow(p.diameterKm / 12742, 0.4)
/** angle per second: inner planets faster, but the outer ones still move a little */
const orbitSpeed = (p: Planet) => 0.09 / Math.pow(YEARS[p.id], 0.6)
const OVERVIEW = new Vector3(0, 40, 82) // far enough to see Neptune's orbit too

/** Saturn's ring: the picture is one strip from the inside to the outside edge, so every point gets u = its distance. */
function ringMesh(): Mesh {
  const inner = 1.24, outer = 2.27 // in Saturn radii (C ring to A ring)
  const geo = new RingGeometry(inner, outer, 160, 1)
  const pos = geo.attributes.position, uv = geo.attributes.uv
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (Math.hypot(pos.getX(i), pos.getY(i)) - inner) / (outer - inner), 0.5)
  const mesh = new Mesh(geo, new MeshStandardMaterial({ map: texture(RING_URL), side: DoubleSide, transparent: true, depthWrite: false }))
  mesh.rotation.x = -Math.PI / 2 // in the planet's equator
  return mesh
}

/** A planet ball with its tilt (and Saturn's ring). Returns the group to place and the ball to spin. */
function planetBall(p: Planet, radius: number) {
  const tilt = new Group()
  tilt.rotation.set(p.id === 'saturn' ? 0.25 : 0, 0, (-p.tilt * Math.PI) / 180)
  const ball = new Mesh(new SphereGeometry(radius, 64, 48), new MeshStandardMaterial({ map: texture(textureUrl(p)), roughness: 1, metalness: 0 }))
  ball.userData.planet = p
  tilt.add(ball)
  if (p.id === 'saturn') { const ring = ringMesh(); ring.scale.setScalar(radius); tilt.add(ring) }
  return { tilt, ball }
}

/** Soft yellow glow around the Sun. */
function glow(): Sprite {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, 'rgba(255,220,140,0.9)'); g.addColorStop(0.25, 'rgba(255,170,60,0.35)'); g.addColorStop(1, 'rgba(255,140,30,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256)
  const s = new Sprite(new SpriteMaterial({ map: new CanvasTexture(c), blending: AdditiveBlending, depthWrite: false, transparent: true }))
  s.scale.setScalar(SUN_R * 6)
  return s
}

export type SceneView = { kind: 'system'; focus: Planet | null } | { kind: 'solo'; planet: Planet }

interface Props {
  view: SceneView
  /** a planet was tapped in the solar system (null: the Sun, = back to the overview) */
  onPick?: (p: Planet | null) => void
  /** planet names in the scene (in the interface language) */
  names: Record<string, string>
  reserveRight?: number
}

interface Api { setView: (v: SceneView) => void; offset: (px: number) => void; setNames: (n: Record<string, string>) => void }

export default function PlanetScene({ view, onPick, names, reserveRight = 0 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const api = useRef<Api | null>(null)
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

  useEffect(() => {
    const el = wrapRef.current!
    const renderer = new WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
    renderer.setClearColor('#01020a')
    el.appendChild(renderer.domElement)
    const labels = new CSS2DRenderer()
    labels.domElement.className = 'p-labels'
    el.appendChild(labels.domElement)

    const scene = new Scene()
    const sky = loader.load(starrySky())
    sky.mapping = EquirectangularReflectionMapping
    sky.colorSpace = SRGBColorSpace
    scene.background = sky
    const starLayers = stars(1500)
    starLayers.forEach((s) => scene.add(s))
    const ambient = new AmbientLight(0xffffff, 0.14) // the night side stays faintly visible
    scene.add(ambient)

    const camera = new PerspectiveCamera(32, 1, 0.05, 6000)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = false
    controls.enableDamping = true

    // ---- the solar system ----
    const system = new Group()
    scene.add(system)
    const sunLight = new PointLight(0xffffff, 3.2, 0, 0) // no fading with distance (the distances are squeezed anyway)
    system.add(sunLight)
    const sunBall = new Mesh(new SphereGeometry(SUN_R, 64, 48), new MeshBasicMaterial({ map: texture(SUN_URL) }))
    system.add(sunBall, glow())
    const orbiting = PLANETS.map((p, i) => {
      const r = orbitRadius(p)
      const pts = Array.from({ length: 181 }, (_, k) => new Vector3(Math.cos((k / 180) * Math.PI * 2) * r, 0, Math.sin((k / 180) * Math.PI * 2) * r))
      const orbit = new LineLoop(new BufferGeometry().setFromPoints(pts), new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.13 }))
      system.add(orbit)
      const holder = new Group() // moves along the orbit
      const { tilt, ball } = planetBall(p, ballRadius(p))
      holder.add(tilt)
      const tag = document.createElement('div')
      tag.className = 'p-label'
      tag.addEventListener('click', () => onPickRef.current?.(p))
      const label = new CSS2DObject(tag)
      label.position.set(0, -(ballRadius(p) * (p.id === 'saturn' ? 1.9 : 1.25) + 0.45), 0)
      holder.add(label)
      system.add(holder)
      return { p, holder, ball, tag, orbit, angle: i * 2.39 } // golden angle: spread round the Sun
    })
    const place = (o: (typeof orbiting)[number]) => o.holder.position.set(Math.cos(o.angle) * orbitRadius(o.p), 0, -Math.sin(o.angle) * orbitRadius(o.p))
    orbiting.forEach(place)

    // ---- one planet alone (quiz) ----
    const solo = new Group()
    scene.add(solo)
    const soloLight = new DirectionalLight(0xffffff, 3)
    soloLight.position.set(-5, 2.5, 3.5)
    solo.add(soloLight)
    let soloBall: { tilt: Group; ball: Mesh } | null = null

    // ---- views ----
    let current: SceneView = { kind: 'system', focus: null }
    let focus: (typeof orbiting)[number] | null = null
    let fly = 0 // 0..1 while the camera moves to a new spot
    const flyFrom = { pos: new Vector3(), target: new Vector3() }
    const flyTo = { pos: new Vector3(), target: new Vector3() }
    const lastTarget = new Vector3()

    function startFly(pos: Vector3, target: Vector3) {
      flyFrom.pos.copy(camera.position); flyFrom.target.copy(controls.target)
      flyTo.pos.copy(pos); flyTo.target.copy(target)
      fly = 0.0001
    }

    function setView(v: SceneView) {
      const prev = current
      current = v
      system.visible = v.kind === 'system'
      solo.visible = v.kind === 'solo'
      if (v.kind === 'solo') {
        focus = null
        if (soloBall) { solo.remove(soloBall.tilt); disposeBall(soloBall) }
        soloBall = planetBall(v.planet, 1)
        soloBall.tilt.scale.setScalar(0.6)
        solo.add(soloBall.tilt)
        controls.minDistance = 2.2; controls.maxDistance = 16
        controls.target.set(0, 0, 0)
        camera.position.set(0, 1.4, 6.25).setLength(v.planet.id === 'saturn' ? 9.5 : 6.4)
        fly = 0
        return
      }
      focus = v.focus ? orbiting.find((o) => o.p === v.focus) ?? null : null
      orbiting.forEach((o) => o.tag.classList.toggle('on', o === focus))
      controls.maxDistance = 220
      if (focus) {
        const r = ballRadius(focus.p) * (focus.p.id === 'saturn' ? 2.3 : 1)
        controls.minDistance = r * 1.6
        const at = focus.holder.getWorldPosition(new Vector3())
        // come in from the Sun's side, a little from above, so the lit half faces us
        const dir = at.clone().normalize().multiplyScalar(-1).add(new Vector3(0, 0.45, 0)).normalize()
        startFly(at.clone().add(dir.multiplyScalar(r * 6.5)), at)
      } else {
        controls.minDistance = 6
        if (prev.kind === 'solo') { camera.position.copy(OVERVIEW); controls.target.set(0, 0, 0); fly = 0 }
        else startFly(OVERVIEW, new Vector3())
      }
      lastTarget.copy(controls.target)
    }

    function disposeBall(b: { tilt: Group }) {
      b.tilt.traverse((o) => { if (o instanceof Mesh) { o.geometry.dispose(); (o.material as MeshStandardMaterial).dispose() } })
    }

    function setNames(n: Record<string, string>) { orbiting.forEach((o) => { o.tag.textContent = n[o.p.id] ?? o.p.en }) }

    // tap on a planet (not after a drag)
    const ray = new Raycaster()
    const down = new Vector2()
    renderer.domElement.addEventListener('pointerdown', (e) => down.set(e.clientX, e.clientY))
    renderer.domElement.addEventListener('pointerup', (e) => {
      if (current.kind !== 'system' || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return
      const rect = renderer.domElement.getBoundingClientRect()
      ray.setFromCamera(new Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), camera)
      const hit = ray.intersectObjects([sunBall, ...orbiting.map((o) => o.ball)], false)[0]
      if (hit) onPickRef.current?.(hit.object === sunBall ? null : (hit.object.userData.planet as Planet))
    })

    let reserve = 0
    function size() {
      const w = el.clientWidth, h = el.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h)
      labels.setSize(w, h)
      camera.aspect = w / h
      // shift the picture so the middle of the scene is in the middle of the free part (left of the panel)
      if (reserve) camera.setViewOffset(w, h, reserve / 2, 0, w, h); else camera.clearViewOffset()
      camera.updateProjectionMatrix()
    }
    size()
    const ro = new ResizeObserver(size)
    ro.observe(el)

    let frame = 0, last = performance.now()
    const ease = (x: number) => 1 - Math.pow(1 - x, 3)
    function tick(now: number) {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (current.kind === 'system') {
        sunBall.rotation.y += dt * 0.03
        for (const o of orbiting) {
          o.angle += dt * orbitSpeed(o.p)
          place(o)
          o.ball.rotation.y += dt * 0.25 * o.p.spin
        }
        if (focus) {
          // follow the planet: move camera and target along with it
          const at = focus.holder.getWorldPosition(new Vector3())
          const move = at.clone().sub(fly ? flyTo.target : lastTarget)
          if (fly) { flyTo.pos.add(move); flyTo.target.copy(at) } else { camera.position.add(move); controls.target.copy(at) }
          lastTarget.copy(at)
        }
      } else if (soloBall) {
        soloBall.ball.rotation.y += dt * 0.12 * (current.planet.spin)
        const s = soloBall.tilt.scale.x
        soloBall.tilt.scale.setScalar(s + (1 - s) * Math.min(1, dt * 6))
      }
      if (fly) {
        fly = Math.min(1, fly + dt / 1.4)
        const k = ease(fly)
        camera.position.lerpVectors(flyFrom.pos, flyTo.pos, k)
        controls.target.lerpVectors(flyFrom.target, flyTo.target, k)
        if (fly >= 1) { fly = 0; lastTarget.copy(controls.target) }
      }
      controls.update()
      renderer.render(scene, camera)
      if (current.kind === 'system') labels.render(scene, camera)
      labels.domElement.style.display = current.kind === 'system' ? '' : 'none'
      frame = requestAnimationFrame(tick)
    }
    camera.position.copy(OVERVIEW)
    frame = requestAnimationFrame(tick)

    api.current = { setView, offset: (px) => { reserve = px; size() }, setNames }
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      controls.dispose()
      scene.traverse((o) => {
        if (o instanceof Mesh || o instanceof LineLoop || o instanceof Sprite) {
          o.geometry?.dispose()
          const m = o.material as MeshStandardMaterial
          if (o instanceof Sprite) m.map?.dispose() // the glow picture (the planet pictures are kept for next time)
          m.dispose()
        }
      })
      starLayers.forEach((s) => { s.geometry.dispose(); (s.material as MeshStandardMaterial).dispose() })
      sky.dispose()
      renderer.dispose()
      el.innerHTML = ''
      api.current = null
    }
  }, [])

  const viewKey = view.kind === 'solo' ? 'solo:' + view.planet.id : 'system:' + (view.focus?.id ?? '')
  useEffect(() => { api.current?.setView(view) }, [viewKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const namesKey = JSON.stringify(names)
  useEffect(() => { api.current?.setNames(names) }, [namesKey]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api.current?.offset(reserveRight) }, [reserveRight])

  return <div ref={wrapRef} className="planet-scene" />
}
