// 第 05 讲：单位根、DFT / FFT（课件约定：正变换用 ω_N = e^{2πi/N}）、多项式乘法、高斯消元与 LU

export interface C { re: number; im: number }
export const cx = (re: number, im = 0): C => ({ re, im })
export const cadd = (a: C, b: C): C => ({ re: a.re + b.re, im: a.im + b.im })
export const csub = (a: C, b: C): C => ({ re: a.re - b.re, im: a.im - b.im })
export const cmul = (a: C, b: C): C => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re })
export const cabs = (a: C) => Math.hypot(a.re, a.im)
// ω_N^k = e^{2πik/N}；sign = −1 时给出 ω_N^{−k}
export const root = (N: number, k: number, sign = 1): C => {
  const t = sign * 2 * Math.PI * k / N
  return { re: Math.cos(t), im: Math.sin(t) }
}

// 把 1e-15 量级的舍入噪声显示成 0，并给出 a + bi 的简短写法
export function cstr(z: C, d = 3) {
  const eps = 5 * 10 ** -(d + 1)
  const r = Math.abs(z.re) < eps ? 0 : z.re, i = Math.abs(z.im) < eps ? 0 : z.im
  const f = (v: number) => Number(v.toFixed(d)).toString()
  if (i === 0) return f(r).replace('-', '−')
  if (r === 0) return (i === 1 ? '' : i === -1 ? '−' : f(i).replace('-', '−')) + 'i'
  return `${f(r).replace('-', '−')} ${i < 0 ? '−' : '+'} ${Math.abs(i) === 1 ? '' : f(Math.abs(i))}i`
}

// 直接按定义求和：â_k = Σ_j a_j ω_N^{kj}，O(N²)
export function dftNaive(a: C[], sign = 1): C[] {
  const N = a.length, out: C[] = []
  // 预先算好 N 个单位根，下标取 (k·j) mod N，避免大角度的三角函数误差
  const w = Array.from({ length: N }, (_, k) => root(N, k, sign))
  for (let k = 0; k < N; k++) {
    let re = 0, im = 0
    for (let j = 0; j < N; j++) {
      const t = w[(k * j) % N], x = a[j]
      re += x.re * t.re - x.im * t.im
      im += x.re * t.im + x.im * t.re
    }
    out.push({ re, im })
  }
  return out
}

// 课件 P24 的递归 FFT(a, ω)：N 为 2 的幂
export function fftRec(a: C[], sign = 1): C[] {
  const N = a.length
  if (N === 1) return [a[0]]
  const E = fftRec(a.filter((_, j) => j % 2 === 0), sign)
  const O = fftRec(a.filter((_, j) => j % 2 === 1), sign)
  const out = new Array<C>(N)
  for (let k = 0; k < N / 2; k++) {
    const t = cmul(root(N, k, sign), O[k])
    out[k] = cadd(E[k], t)
    out[k + N / 2] = csub(E[k], t)
  }
  return out
}

// 逆 DFT：ω → ω^{-1}，最后除以 N（P16、P26）
export function ifft(ah: C[]): C[] {
  const N = ah.length
  return fftRec(ah, -1).map(z => ({ re: z.re / N, im: z.im / N }))
}

export const bitrev = (j: number, bits: number) => {
  let r = 0
  for (let b = 0; b < bits; b++) r |= ((j >> b) & 1) << (bits - 1 - b)
  return r
}

// 把递归展开成 log2 N 层蝶形：第 0 层是按位反序排好的输入，第 s 层把长度 2^{s-1} 的块两两合并
export interface Fly { top: number; bot: number; k: number; len: number }
export function fftStages(a: C[], sign = 1) {
  const N = a.length, bits = Math.round(Math.log2(N))
  const order = Array.from({ length: N }, (_, j) => bitrev(j, bits))
  const layers: C[][] = [order.map(j => a[j])]
  const flies: Fly[][] = []
  for (let s = 1; s <= bits; s++) {
    const len = 1 << s, half = len / 2, prev = layers[s - 1], cur = prev.slice()
    const fs: Fly[] = []
    for (let b = 0; b < N; b += len) {
      for (let k = 0; k < half; k++) {
        const t = cmul(root(len, k, sign), prev[b + k + half])
        cur[b + k] = cadd(prev[b + k], t)
        cur[b + k + half] = csub(prev[b + k], t)
        fs.push({ top: b + k, bot: b + k + half, k, len })
      }
    }
    layers.push(cur); flies.push(fs)
  }
  return { order, layers, flies }
}

// 迭代版 radix-2 FFT（Float64Array 原地计算，用于计时）
export function fftInPlace(re: Float64Array, im: Float64Array) {
  const N = re.length, bits = Math.round(Math.log2(N))
  for (let j = 0; j < N; j++) {
    const r = bitrev(j, bits)
    if (r > j) {
      let t = re[j]; re[j] = re[r]; re[r] = t
      t = im[j]; im[j] = im[r]; im[r] = t
    }
  }
  for (let len = 2; len <= N; len <<= 1) {
    const half = len >> 1, th = 2 * Math.PI / len
    for (let k = 0; k < half; k++) {
      const wr = Math.cos(th * k), wi = Math.sin(th * k)
      for (let b = k; b < N; b += len) {
        const p = b + half
        const tr = wr * re[p] - wi * im[p], ti = wr * im[p] + wi * re[p]
        re[p] = re[b] - tr; im[p] = im[b] - ti
        re[b] += tr; im[b] += ti
      }
    }
  }
}
export function dftNaiveTyped(re: Float64Array, im: Float64Array, ore: Float64Array, oim: Float64Array) {
  const N = re.length
  const cr = new Float64Array(N), ci = new Float64Array(N)
  for (let k = 0; k < N; k++) { cr[k] = Math.cos(2 * Math.PI * k / N); ci[k] = Math.sin(2 * Math.PI * k / N) }
  for (let k = 0; k < N; k++) {
    let sr = 0, si = 0, idx = 0
    for (let j = 0; j < N; j++) {
      sr += re[j] * cr[idx] - im[j] * ci[idx]
      si += re[j] * ci[idx] + im[j] * cr[idx]
      idx += k; if (idx >= N) idx -= N
    }
    ore[k] = sr; oim[k] = si
  }
}

// 系数表示下的朴素乘法 c_k = Σ a_j b_{k-j}（线性卷积）
export function convolve(a: number[], b: number[]) {
  const c = new Array(a.length + b.length - 1).fill(0)
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) c[i + j] += a[i] * b[j]
  return c
}
// 长度 N 的循环卷积：下标 mod N，DFT 严格对应的就是它（P28）
export function circConvolve(a: number[], b: number[], N: number) {
  const c = new Array(N).fill(0)
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) c[(i + j) % N] += a[i] * b[j]
  return c
}
export const nextPow2 = (m: number) => { let N = 1; while (N < m) N *= 2; return N }

// 用 FFT 做多项式乘法：补零到 N → FFT → 逐点乘 → 逆 FFT
export function polyMulFFT(a: number[], b: number[], N: number) {
  const pad = (v: number[]) => Array.from({ length: N }, (_, j) => cx(j < v.length ? v[j] : 0))
  const A = fftRec(pad(a)), B = fftRec(pad(b))
  const Ch = A.map((z, k) => cmul(z, B[k]))
  const c = ifft(Ch)
  return { A, B, Ch, c }
}

// ---------- 高斯消元 ----------
export type Mat = number[][]
export const clone = (A: Mat) => A.map(r => r.slice())
export const eye = (n: number) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)))

export interface GStep {
  kind: 'swap' | 'elim' | 'singular' | 'zero'
  col: number            // 当前主元列
  i?: number; j?: number // swap: 交换行 i, j；elim: 第 j 行减去第 i 行的 l 倍
  l?: number
  U: Mat; L: Mat; perm: number[]  // 这一步之后的状态
}

// 逐步记录高斯消元：pivot = 'none' 只在主元恰为 0 时报错停下，'partial' 选列中绝对值最大的
export function gaussSteps(A0: Mat, pivot: 'none' | 'partial') {
  const n = A0.length
  const U = clone(A0), L = eye(n), perm = Array.from({ length: n }, (_, i) => i)
  const steps: GStep[] = []
  const snap = (s: Omit<GStep, 'U' | 'L' | 'perm'>) => steps.push({ ...s, U: clone(U), L: clone(L), perm: perm.slice() })
  for (let k = 0; k < n - 1; k++) {
    let p = k
    if (pivot === 'partial') {
      for (let r = k + 1; r < n; r++) if (Math.abs(U[r][k]) > Math.abs(U[p][k])) p = r
    }
    if (U[p][k] === 0) {
      // 不选主元时主元为 0：往下找一个非零的；整列都是 0 说明奇异
      let q = -1
      for (let r = k + 1; r < n; r++) if (U[r][k] !== 0) { q = r; break }
      if (q < 0) { snap({ kind: 'singular', col: k }); continue }
      if (pivot === 'none') { snap({ kind: 'zero', col: k, i: k }); return steps }
      p = q
    }
    if (p !== k) {
      [U[p], U[k]] = [U[k], U[p]];
      [perm[p], perm[k]] = [perm[k], perm[p]]
      // 已经记下的乘子（L 的前 k 列）跟着行一起换
      for (let c = 0; c < k; c++) [L[p][c], L[k][c]] = [L[k][c], L[p][c]]
      snap({ kind: 'swap', col: k, i: k, j: p })
    }
    for (let r = k + 1; r < n; r++) {
      const l = U[r][k] / U[k][k]
      if (l === 0) continue
      for (let c = k; c < n; c++) U[r][c] -= l * U[k][c]
      U[r][k] = 0
      L[r][k] = l
      snap({ kind: 'elim', col: k, i: k, j: r, l })
    }
  }
  return steps
}

// 前代 Ly = b（L 单位下三角）、回代 Ux = y
export function forwardSub(L: Mat, b: number[]) {
  const y: number[] = []
  for (let i = 0; i < b.length; i++) {
    let s = b[i]
    for (let j = 0; j < i; j++) s -= L[i][j] * y[j]
    y.push(s / L[i][i])
  }
  return y
}
export function backSub(U: Mat, y: number[]) {
  const n = y.length, x = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i]
    for (let j = i + 1; j < n; j++) s -= U[i][j] * x[j]
    x[i] = s / U[i][i]
  }
  return x
}

// 一次性求解 Ax = b（用来比较是否选主元）
export function solveLU(A0: Mat, b0: number[], pivot: 'none' | 'partial') {
  const n = A0.length
  const steps = gaussSteps(A0, pivot)
  const last = steps.length ? steps[steps.length - 1] : { U: clone(A0), L: eye(n), perm: Array.from({ length: n }, (_, i) => i), kind: 'elim' }
  if (steps.some(s => s.kind === 'singular' || s.kind === 'zero')) return null
  const pb = last.perm.map(i => b0[i])
  const x = backSub(last.U, forwardSub(last.L, pb))
  const growth = Math.max(...last.U.flat().map(Math.abs)) / Math.max(...A0.flat().map(Math.abs))
  return { x, L: last.L, U: last.U, perm: last.perm, growth }
}

export function matMul(A: Mat, B: Mat): Mat {
  return A.map(r => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)))
}
