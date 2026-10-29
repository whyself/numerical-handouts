// 第 07 讲：特征值、谱分解与幂迭代 —— 小矩阵的线性代数工具

export type Vec = number[]
export type Mat = number[][]

export const dot = (a: Vec, b: Vec) => a.reduce((s, v, i) => s + v * b[i], 0)
export const norm2 = (a: Vec) => Math.hypot(...a)
export const scale = (a: Vec, c: number) => a.map(v => v * c)
export const sub = (a: Vec, b: Vec) => a.map((v, i) => v - b[i])
export const matVec = (A: Mat, x: Vec) => A.map(row => dot(row, x))
export const matMul = (A: Mat, B: Mat) => A.map(row => B[0].map((_, j) => row.reduce((s, v, k) => s + v * B[k][j], 0)))
export const transpose = (A: Mat) => A[0].map((_, j) => A.map(row => row[j]))
export const diag = (d: Vec) => d.map((v, i) => d.map((_, j) => (i === j ? v : 0)))
export const isSymmetric = (A: Mat, tol = 1e-12) => A.every((row, i) => row.every((v, j) => Math.abs(v - A[j][i]) <= tol))

// Rayleigh 商 xᵀAx / xᵀx
export const rayleigh = (A: Mat, x: Vec) => dot(x, matVec(A, x)) / dot(x, x)

// 残差 ‖Ax − μx‖₂
export const residual = (A: Mat, x: Vec, mu: number) => norm2(sub(matVec(A, x), scale(x, mu)))

// ---------- 复数（只用于小矩阵的特征值） ----------
export interface C { re: number; im: number }
const cadd = (a: C, b: C): C => ({ re: a.re + b.re, im: a.im + b.im })
const csub = (a: C, b: C): C => ({ re: a.re - b.re, im: a.im - b.im })
const cmul = (a: C, b: C): C => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re })
const cdiv = (a: C, b: C): C => {
  const d = b.re * b.re + b.im * b.im
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }
}

// 首一多项式 t^n + c[0] t^{n-1} + … + c[n-1] 的全部复根（Durand–Kerner 同时迭代）
export function polyRoots(c: number[]): C[] {
  const n = c.length
  const p = (z: C) => c.reduce<C>((acc, ck) => cadd(cmul(acc, z), { re: ck, im: 0 }), { re: 1, im: 0 })
  const R = 1 + Math.max(...c.map(Math.abs))
  let z: C[] = Array.from({ length: n }, (_, k) => ({ re: R * 0.9 * Math.cos(2 * Math.PI * k / n + 0.4), im: R * 0.9 * Math.sin(2 * Math.PI * k / n + 0.4) }))
  for (let it = 0; it < 500; it++) {
    let moved = 0
    z = z.map((zi, i) => {
      let den: C = { re: 1, im: 0 }
      z.forEach((zj, j) => { if (j !== i) den = cmul(den, csub(zi, zj)) })
      const step = cdiv(p(zi), den)
      moved = Math.max(moved, Math.hypot(step.re, step.im))
      return csub(zi, step)
    })
    if (moved < 1e-15 * R) break
  }
  // 清理几乎为实数的根，按实部排序
  return z.map(r => (Math.abs(r.im) < 1e-9 * R ? { re: r.re, im: 0 } : r)).sort((a, b) => a.re - b.re || a.im - b.im)
}

// 2×2 或 3×3 一般实矩阵的特征值（特征多项式 det(tI − A) 的根）
export function eigvalsSmall(A: Mat): C[] {
  if (A.length === 2) {
    const [[a, b], [c, d]] = A
    return polyRoots([-(a + d), a * d - b * c])
  }
  const [[a, b, c], [d, e, f], [g, h, i]] = A
  const tr = a + e + i
  const m2 = (a * e - b * d) + (a * i - c * g) + (e * i - f * h)
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)
  return polyRoots([-tr, m2, -det])
}

// 2×2 实矩阵的实特征向量（若有）：返回 [{ lambda, v }]，v 为单位向量
export function eig2Real(A: Mat): { lambda: number; v: Vec }[] {
  const [[a, b], [c, d]] = A
  const tr = a + d, det = a * d - b * c, disc = tr * tr / 4 - det
  if (disc < -1e-14) return []
  const s = Math.sqrt(Math.max(disc, 0))
  const lams = s < 1e-12 ? [tr / 2] : [tr / 2 + s, tr / 2 - s]
  const out: { lambda: number; v: Vec }[] = []
  for (const l of lams) {
    // (A − λI) v = 0：取较大的一行求零空间
    const r1 = [a - l, b], r2 = [c, d - l]
    const r = norm2(r1) >= norm2(r2) ? r1 : r2
    if (norm2(r) < 1e-12) { out.push({ lambda: l, v: [1, 0] }, { lambda: l, v: [0, 1] }); continue }
    const v = [-r[1], r[0]], nv = norm2(v)
    out.push({ lambda: l, v: [v[0] / nv, v[1] / nv] })
  }
  return out
}

// 对称矩阵的循环 Jacobi 方法：返回升序特征值和对应的单位特征向量（列）
export function eigSym(A0: Mat): { values: number[]; vectors: Vec[] } {
  const n = A0.length
  const A = A0.map(r => r.slice())
  const V: Mat = diag(Array(n).fill(1))
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p][q] ** 2
    if (off < 1e-30) break
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(A[p][q]) < 1e-300) continue
      const th = (A[q][q] - A[p][p]) / (2 * A[p][q])
      const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1))
      const c = 1 / Math.sqrt(t * t + 1), s = t * c
      for (let k = 0; k < n; k++) {
        const akp = A[k][p], akq = A[k][q]
        A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq
      }
      for (let k = 0; k < n; k++) {
        const apk = A[p][k], aqk = A[q][k]
        A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk
      }
      for (let k = 0; k < n; k++) {
        const vkp = V[k][p], vkq = V[k][q]
        V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq
      }
    }
  }
  const idx = [...Array(n).keys()].sort((i, j) => A[i][i] - A[j][j])
  return { values: idx.map(i => A[i][i]), vectors: idx.map(i => V.map(row => row[i])) }
}

// Gershgorin 圆盘：圆心 a_ii，半径 R_i = Σ_{j≠i} |a_ij|
export const gershgorin = (A: Mat) => A.map((row, i) => ({ c: row[i], r: row.reduce((s, v, j) => s + (j === i ? 0 : Math.abs(v)), 0) }))

// 归一化幂迭代（课件 P27）：w = A x_k，x_{k+1} = w / ‖w‖₂；w = 0 时停止
export function powerIteration(A: Mat, x0: Vec, n: number) {
  const n0 = norm2(x0)
  const xs: Vec[] = [x0.map(v => v / n0)]
  const mus: number[] = [rayleigh(A, xs[0])]
  for (let k = 0; k < n; k++) {
    const w = matVec(A, xs[k]), nw = norm2(w)
    if (nw === 0 || !Number.isFinite(nw)) break
    const x = w.map(v => v / nw)
    xs.push(x); mus.push(rayleigh(A, x))
  }
  return { xs, mus }
}

// 单位向量 x 与直线 span(v) 的夹角正弦 = ‖x − (vᵀx)v‖（v 为单位向量）
// 直接算垂直分量的长度，不用 √(1 − cos²)（后者在夹角小于 10⁻⁸ 时会被舍入抹成 0）
export const sinToLine = (x: Vec, v: Vec) => norm2(sub(x, scale(v, dot(x, v)))) / norm2(x)

// 列随机矩阵（Google 矩阵）上的幂迭代：x_{k+1} = d P x_k + (1 − d)/n · 1
export function pagerank(P: Mat, d: number, n: number) {
  const m = P.length
  const xs: Vec[] = [Array(m).fill(1 / m)]
  for (let k = 0; k < n; k++) {
    const y = matVec(P, xs[k]).map(v => d * v + (1 - d) / m)
    xs.push(y)
  }
  return xs
}

// 由有向边表构造列随机转移矩阵：P[j][i] = 1/outdeg(i)（i → j）
export function transitionMatrix(m: number, edges: [number, number][]): Mat {
  const P: Mat = Array.from({ length: m }, () => Array(m).fill(0))
  const out = Array(m).fill(0)
  edges.forEach(([i]) => out[i]++)
  edges.forEach(([i, j]) => { P[j][i] += 1 / out[i] })
  return P
}
