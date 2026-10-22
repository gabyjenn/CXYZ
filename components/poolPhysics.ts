/**
 * Pool-table physics for the carousel thumbnails.
 *
 * Thumbnails only change direction by bouncing off the carousel edges or
 * off each other. They roll freely over the image frame and never stop on it:
 *
 *   - every shot is PLANNED: each thumbnail gets a free resting spot and is
 *     aimed there (straight or as a bank shot off the edges) with exactly the
 *     speed friction will bring to zero on that spot
 *   - collisions knock thumbnails off their plan, so the image area is
 *     "slick": friction can't slow a thumbnail below GLIDE_SPEED there.
 *     It keeps rolling in the same direction until it's off the image.
 *     Thumbnails only collide off the image; over it they pass over each other.
 *   - SOLID areas (e.g. the question module) are like table cushions: balls
 *     bounce off them and never pass over or rest on them
 *   - the whole run is simulated before it's shown; the quickest of a few
 *     tries is played back
 */

export type Rect = { x: number; y: number; w: number; h: number }
export type Ball = { id: string; x: number; y: number; r: number; vx: number; vy: number } // x/y = center
type Bounds = { W: number; H: number; edge: number }
type Pt = { x: number; y: number }

// ── tuning ──────────────────────────────────────────────
const PLAYBACK = 0.25 // <1 = slow motion (0.25 = quarter speed)
const MAX_DURATION_MS = 2000 // a roll never lasts longer than this on screen
const FRICTION = 0.02 // per ms (simulation time): higher = lively start, quicker settle
const DT = 4 // ms per simulation step
const CUE_DISTANCE: [number, number] = [0.5, 0.9] // how far the clicked one travels, × carousel width
const OTHER_DISTANCE: [number, number] = [0.1, 0.4] // how far the others travel, × carousel width
const ATTEMPTS = 400 // max shot sets to try…
const BUDGET_MS = 120 // …within this much planning time (keeps the click snappy)
const GLIDE_SPEED = 2.5 // px/ms: minimum speed while over the image (higher = leaves it faster)
const SIM_LIMIT = MAX_DURATION_MS * PLAYBACK // the same limit, in simulation time
const MAX_STEPS = Math.ceil(SIM_LIMIT / DT)
const REST_SPEED = 0.01 // px/ms: below this a ball counts as stopped (invisible at this playback)
const GAP = 6 // min space between resting thumbnails and the image area

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const damp = Math.exp(-FRICTION * DT)
/** launch speed that makes a ball travel exactly d px in this simulation */
const speedFor = (d: number) => (d * (1 - damp)) / (DT * damp)

const overlapsRect = (p: Pt, r: number, R: Rect, m = 0) =>
  p.x + r + m > R.x && p.x - r - m < R.x + R.w && p.y + r + m > R.y && p.y - r - m < R.y + R.h

// ── 1. free resting spots ───────────────────────────────
function freeSpot(ball: Ball, b: Bounds, blocked: Rect[], taken: { p: Pt; r: number }[], image: Rect[] = []): Pt | null {
  // `blocked` here = image area + solids (anywhere a ball may not rest)
  // Prefer spots the ball can reach in a straight line without crossing the
  // image (e.g. stay on its own side); fall back to any free spot.
  const clearPath = (p: Pt) => {
    for (let k = 1; k < 16; k++) {
      const t = k / 16
      const q = { x: ball.x + (p.x - ball.x) * t, y: ball.y + (p.y - ball.y) * t }
      if (image.some((R) => overlapsRect(q, ball.r, R))) return false
    }
    return true
  }
  let fallback: Pt | null = null
  for (let i = 0; i < 400; i++) {
    const p = { x: rand(b.edge + ball.r, b.W - b.edge - ball.r), y: rand(b.edge + ball.r, b.H - b.edge - ball.r) }
    if (blocked.some((R) => overlapsRect(p, ball.r, R, GAP))) continue
    if (taken.some((t) => Math.hypot(t.p.x - p.x, t.p.y - p.y) < ball.r + t.r + GAP)) continue
    if (!image.length || clearPath(p)) return p
    fallback ??= p
  }
  return fallback
}

// ── 2. aim: choose a mirror image of the target (= bank shot) ──
// A ball bouncing between two walls moves like a straight line through
// mirrored copies of the table, so aiming at a mirrored copy of the target
// is a bank shot that ends exactly on the real target.
function aim(ball: Ball, target: Pt, b: Bounds, wantDist: number, avoid: Rect[] = []) {
  const lo = { x: b.edge + ball.r, y: b.edge + ball.r }
  const L = { x: b.W - 2 * b.edge - 2 * ball.r, y: b.H - 2 * b.edge - 2 * ball.r }
  const images = (t: number, l: number, low: number) => {
    const res: number[] = []
    for (let k = -3; k <= 3; k++) {
      res.push(low + 2 * k * l + (t - low)) // even number of bounces
      res.push(low + 2 * k * l - (t - low)) // odd number of bounces
    }
    return res
  }
  // where a straight line through the mirrored tables lands on the real table
  const fold = (u: number, low: number, l: number) => {
    const m = (((u - low) % (2 * l)) + 2 * l) % (2 * l)
    return low + (m <= l ? m : 2 * l - m)
  }
  // how much of this bank shot's path runs over the image (sampled)
  const crossing = (ix: number, iy: number) => {
    if (!avoid.length) return 0
    let n = 0
    for (let k = 1; k < 32; k++) {
      const t = k / 32
      const p = { x: fold(ball.x + (ix - ball.x) * t, lo.x, L.x), y: fold(ball.y + (iy - ball.y) * t, lo.y, L.y) }
      if (avoid.some((R) => overlapsRect(p, ball.r, R))) n++
    }
    return n
  }
  let best = { x: target.x, y: target.y }
  let bestErr = Infinity
  for (const ix of images(target.x, L.x, lo.x)) {
    for (const iy of images(target.y, L.y, lo.y)) {
      const d = Math.hypot(ix - ball.x, iy - ball.y)
      // close to the wanted distance, and strongly prefer paths that stay off the image
      const err = (Math.abs(d - wantDist) + crossing(ix, iy) * 0.05 * wantDist) * rand(0.9, 1.1)
      if (err < bestErr) { bestErr = err; best = { x: ix, y: iy } }
    }
  }
  const dx = best.x - ball.x
  const dy = best.y - ball.y
  const d = Math.hypot(dx, dy) || 1
  const v = speedFor(d)
  ball.vx = (dx / d) * v
  ball.vy = (dy / d) * v
}

// ── 3. simulation (fixed step, deterministic) ───────────
/** Bounce a ball off a solid rectangle (elastic, like the table edges). */
function bounceOffRect(o: Ball, R: Rect) {
  const cx = Math.max(R.x, Math.min(o.x, R.x + R.w))
  const cy = Math.max(R.y, Math.min(o.y, R.y + R.h))
  let nx = o.x - cx
  let ny = o.y - cy
  let d = Math.hypot(nx, ny)
  if (d >= o.r) return
  if (d === 0) {
    // centre is inside: leave through the nearest side
    const pen = [o.x - R.x, R.x + R.w - o.x, o.y - R.y, R.y + R.h - o.y]
    const i = pen.indexOf(Math.min(...pen))
    ;[nx, ny] = ([[-1, 0], [1, 0], [0, -1], [0, 1]] as const)[i]
    d = 0
    if (i === 0) o.x = R.x - o.r
    if (i === 1) o.x = R.x + R.w + o.r
    if (i === 2) o.y = R.y - o.r
    if (i === 3) o.y = R.y + R.h + o.r
  } else {
    nx /= d
    ny /= d
    o.x = cx + nx * o.r
    o.y = cy + ny * o.r
  }
  const vn = o.vx * nx + o.vy * ny
  if (vn < 0) {
    o.vx -= 2 * vn * nx
    o.vy -= 2 * vn * ny
  }
}

function run(balls: Ball[], b: Bounds, blocked: Rect[], solids: Rect[] = []) {
  const onImage = (o: Ball) => blocked.some((R) => overlapsRect(o, o.r, R, -0.5))
  const frames: Float32Array[] = []
  const snap = () => {
    const f = new Float32Array(balls.length * 2)
    balls.forEach((o, i) => { f[2 * i] = o.x; f[2 * i + 1] = o.y })
    frames.push(f)
  }
  snap()
  let overImage = 0 // ball-steps spent over the image (lower = less crossing)
  for (let n = 0; n < MAX_STEPS; n++) {
    for (const o of balls) {
      const v = Math.hypot(o.vx, o.vy)
      // friction everywhere, except it can't stop a ball on the image
      const k = onImage(o) && v > 0 ? Math.max(damp, Math.min(1, GLIDE_SPEED / v)) : damp
      o.vx *= k
      o.vy *= k
      o.x += o.vx * DT
      o.y += o.vy * DT
      // edges: perfectly elastic, so bank shots land where aimed
      const minX = b.edge + o.r, maxX = b.W - b.edge - o.r
      const minY = b.edge + o.r, maxY = b.H - b.edge - o.r
      if (o.x < minX) { o.x = 2 * minX - o.x; o.vx = Math.abs(o.vx) }
      if (o.x > maxX) { o.x = 2 * maxX - o.x; o.vx = -Math.abs(o.vx) }
      if (o.y < minY) { o.y = 2 * minY - o.y; o.vy = Math.abs(o.vy) }
      if (o.y > maxY) { o.y = 2 * maxY - o.y; o.vy = -Math.abs(o.vy) }
      for (const R of solids) bounceOffRect(o, R)
    }
    // ball ↔ ball: equal mass, elastic. Only off the image: over it they
    // pass over each other, so a hit can never leave one stopped there.
    const off = balls.map((o) => !onImage(o))
    for (let i = 0; i < balls.length; i++) {
      if (!off[i]) continue
      for (let j = i + 1; j < balls.length; j++) {
        if (!off[j]) continue
        const a = balls[i], c = balls[j]
        let dx = c.x - a.x, dy = c.y - a.y
        const d = Math.hypot(dx, dy) || 0.001
        const min = a.r + c.r
        if (d >= min) continue
        dx /= d; dy /= d
        const push = (min - d) / 2
        a.x -= dx * push; a.y -= dy * push
        c.x += dx * push; c.y += dy * push
        const rel = (a.vx - c.vx) * dx + (a.vy - c.vy) * dy
        if (rel > 0) {
          a.vx -= rel * dx; a.vy -= rel * dy
          c.vx += rel * dx; c.vy += rel * dy
        }
      }
    }
    // a ball-ball push can shove a ball into a solid: bounce it back out
    if (solids.length) for (const o of balls) for (const R of solids) bounceOffRect(o, R)
    snap()
    for (const o of balls) if (onImage(o)) overImage++
    if (balls.every((o) => Math.hypot(o.vx, o.vy) < REST_SPEED && !onImage(o))) return { frames, done: true, overImage }
  }
  return { frames, done: false, overImage }
}

/** Plan a shot and return the recorded run (positions per step). */
export function planRoll(start: Ball[], bounds: Bounds, blocked: Rect[], cueId?: string, solids: Rect[] = []) {
  const noRest = [...blocked, ...solids]
  const cue = cueId && start.some((b) => b.id === cueId) ? cueId : start[Math.floor(Math.random() * start.length)]?.id
  let best: { frames: Float32Array[]; bad: number } | null = null // fallback if nothing fits
  let pick: { frames: Float32Array[]; overImage: number } | null = null // best valid run
  // state of the latest run, used to repair it
  let shots: { vx: number; vy: number }[] | null = null
  let landed: boolean[] = []
  let restAt: Float32Array | null = null

  const t0 = performance.now()
  for (let attempt = 0; attempt < ATTEMPTS && performance.now() - t0 < BUDGET_MS; attempt++) {
    // every 15th attempt: all-new shots. Otherwise keep the shots that
    // landed fine and re-aim only the ones that stopped over the image.
    const fresh = !shots || attempt % 15 === 0
    const balls = start.map((b) => ({ ...b, vx: 0, vy: 0 }))
    const taken: { p: Pt; r: number }[] = []
    if (!fresh && restAt) {
      balls.forEach((o, i) => landed[i] && taken.push({ p: { x: restAt![2 * i], y: restAt![2 * i + 1] }, r: o.r }))
    }

    const next: { vx: number; vy: number }[] = []
    let failed = false
    for (let i = 0; i < balls.length; i++) {
      const o = balls[i]
      if (!fresh && shots && landed[i]) { next.push(shots[i]); continue }
      // alternate strategies: half the attempts keep balls off the image's path,
      // half allow any spot (needed when the sides get crowded)
      const t = freeSpot(o, bounds, noRest, taken, attempt % 2 === 0 ? blocked : [])
      if (!t) { failed = true; break }
      taken.push({ p: t, r: o.r })
      const range = o.id === cue ? CUE_DISTANCE : OTHER_DISTANCE
      const want = Math.max(rand(...range) * bounds.W, Math.hypot(t.x - o.x, t.y - o.y))
      aim(o, t, bounds, want, blocked)
      next.push({ vx: o.vx, vy: o.vy })
    }
    if (failed) { shots = null; continue }
    balls.forEach((o, i) => { o.vx = next[i].vx; o.vy = next[i].vy })

    const { frames, done, overImage } = run(balls, bounds, blocked, solids)
    shots = next
    landed = balls.map((o) => !noRest.some((R) => overlapsRect(o, o.r, R, -0.5)))
    restAt = frames[frames.length - 1]
    const bad = landed.filter((x) => !x).length + (done ? 0 : 1)
    // valid = everyone stopped off the image, within MAX_DURATION_MS.
    // Keep searching (within the planning budget) for the valid run that
    // spends the least time over the image.
    if (bad === 0 && (!pick || overImage < pick.overImage)) pick = { frames, overImage }
    if (pick && pick.overImage === 0) break
    if (!best || bad < best.bad || (bad === best.bad && frames.length < best.frames.length)) best = { frames, bad }
  }
  return pick?.frames ?? best?.frames ?? []
}

/** Play a recorded run. Returns a cancel function. */
export function play(
  frames: Float32Array[],
  balls: Ball[],
  onFrame: (balls: Ball[]) => void,
  onDone: (balls: Ball[]) => void
): () => void {
  let raf = 0
  // start the clock on the first animation frame: its timestamp can be a few
  // ms EARLIER than performance.now() at call time, which gave frame -1
  let t0: number | null = null
  const apply = (f: Float32Array) => balls.forEach((b, i) => { b.x = f[2 * i]; b.y = f[2 * i + 1] })
  const tick = (now: number) => {
    if (t0 === null) t0 = now
    const i = Math.max(0, Math.floor(((now - t0) * PLAYBACK) / DT))
    if (i >= frames.length - 1) {
      apply(frames[frames.length - 1])
      onFrame(balls)
      onDone(balls)
      return
    }
    apply(frames[i])
    onFrame(balls)
    raf = requestAnimationFrame(tick)
  }
  if (!frames.length) { onDone(balls); return () => {} }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}
