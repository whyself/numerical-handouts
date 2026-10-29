// 第 01 讲：求根算法（二分、不动点、牛顿、割线、带保护的牛顿）与浮点小实验

export type Fn = (x: number) => number

// 两次迭代只差最后一两位时停下，免得在双精度的最后一位来回跳
const settled = (x: number, y: number) => Math.abs(y - x) <= 4 * Number.EPSILON * Math.abs(y)

export interface Step { k: number; x: number; e: number }

// 二分法：记录每一步的区间与中点
export function bisection(f: Fn, a: number, b: number, n: number) {
  const out: { k: number; a: number; b: number; m: number; fm: number }[] = []
  let fa = f(a)
  for (let k = 0; k < n; k++) {
    const m = (a + b) / 2, fm = f(m)
    out.push({ k, a, b, m, fm })
    if (fm === 0) break
    if (fa * fm < 0) b = m
    else { a = m; fa = fm }
  }
  return out
}

// 不动点迭代 x_{k+1} = g(x_k)，遇到非有限值或 |x| 过大就停
export function fixedPoint(g: Fn, x0: number, n: number) {
  const xs = [x0]
  for (let k = 0; k < n; k++) {
    const x = g(xs[k])
    if (!Number.isFinite(x) || Math.abs(x) > 1e6) break
    xs.push(x)
  }
  return xs
}

// 牛顿法；m > 1 时为已知重数的修正牛顿法 x - m f/f'
export function newton(f: Fn, df: Fn, x0: number, n: number, m = 1) {
  const xs = [x0]
  for (let k = 0; k < n; k++) {
    const x = xs[k], d = df(x)
    if (d === 0 || !Number.isFinite(d)) break
    const y = x - m * f(x) / d
    if (!Number.isFinite(y) || Math.abs(y) > 1e6) break
    xs.push(y)
    if (settled(x, y)) break
  }
  return xs
}

// 割线法：用两次函数值近似导数
export function secant(f: Fn, x0: number, x1: number, n: number) {
  const xs = [x0, x1]
  for (let k = 1; k < n; k++) {
    const a = xs[k - 1], b = xs[k], fa = f(a), fb = f(b)
    if (fb === fa) break
    const c = b - fb * (b - a) / (fb - fa)
    if (!Number.isFinite(c)) break
    xs.push(c)
    if (settled(b, c)) break
  }
  return xs
}

// 带保护的牛顿法：维持异号区间，牛顿步跳出区间就退回二分（课件 A41 的“全局 + 局部”）
export function safeNewton(f: Fn, df: Fn, a: number, b: number, n: number) {
  let fa = f(a), x = (a + b) / 2
  const xs = [x], kinds: ('newton' | 'bisect')[] = ['bisect']
  for (let k = 0; k < n; k++) {
    const fx = f(x)
    if (fx === 0) break
    if (fa * fx < 0) b = x
    else { a = x; fa = fx }
    const d = df(x)
    let y = d !== 0 ? x - fx / d : NaN
    let kind: 'newton' | 'bisect' = 'newton'
    if (!(y > a && y < b)) { y = (a + b) / 2; kind = 'bisect' }
    if (y === x) break
    xs.push(y); kinds.push(kind); x = y
  }
  return { xs, kinds }
}

export const errors = (xs: number[], r: number) => xs.map(x => Math.abs(x - r))

// Kahan 补偿求和
export function kahanSum(vals: Iterable<number>) {
  let s = 0, c = 0
  for (const v of vals) {
    const y = v - c, t = s + y
    c = (t - s) - y
    s = t
  }
  return s
}

export function softmaxNaive(z: number[]) {
  const e = z.map(Math.exp), s = e.reduce((a, b) => a + b, 0)
  return e.map(v => v / s)
}
export function softmaxStable(z: number[]) {
  const m = Math.max(...z), e = z.map(v => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0)
  return e.map(v => v / s)
}

// 课件里反复出现的几个根
export const SQRT2 = Math.SQRT2
export const DOTTIE = 0.7390851332151607 // cos x = x 的根
export const CUBIC_ROOT = -1.7692923542386314 // x^3 - 2x + 2 = 0 的实根
