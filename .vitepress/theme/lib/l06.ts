// 第 06 讲：向量 / 矩阵范数、2×2 矩阵的奇异值与特征值、Jacobi / Gauss-Seidel 迭代、分数运算

export type Vec2 = [number, number]
// 2×2 矩阵按行存：[a, b, c, d] 表示 [[a, b], [c, d]]
export type Mat2 = [number, number, number, number]
export type NormKind = 1 | 2 | 'inf'

export const mv = (A: Mat2, x: Vec2): Vec2 => [A[0] * x[0] + A[1] * x[1], A[2] * x[0] + A[3] * x[1]]
export const mm = (A: Mat2, B: Mat2): Mat2 => [
  A[0] * B[0] + A[1] * B[2], A[0] * B[1] + A[1] * B[3],
  A[2] * B[0] + A[3] * B[2], A[2] * B[1] + A[3] * B[3]
]
export const det2 = (A: Mat2) => A[0] * A[3] - A[1] * A[2]
export const inv2 = (A: Mat2): Mat2 => {
  const d = det2(A)
  return [A[3] / d, -A[1] / d, -A[2] / d, A[0] / d]
}

// 向量范数
export function vnorm(x: number[], p: NormKind) {
  if (p === 1) return x.reduce((s, v) => s + Math.abs(v), 0)
  if (p === 'inf') return x.reduce((s, v) => Math.max(s, Math.abs(v)), 0)
  return Math.hypot(...x)
}

// 对称 2×2 矩阵 [[p, q], [q, r]] 的特征值（降序）与对应单位特征向量
export function symEig2(p: number, q: number, r: number) {
  const m = (p + r) / 2, h = Math.hypot((p - r) / 2, q)
  const l1 = m + h, l2 = m - h
  // (S − l1 I)v = 0 的一个非零解；q ≈ 0 时直接取坐标轴
  let v1: Vec2
  if (Math.abs(q) > 1e-14 * (Math.abs(p) + Math.abs(r) + 1)) v1 = [l1 - r, q]
  else v1 = p >= r ? [1, 0] : [0, 1]
  const n = Math.hypot(v1[0], v1[1])
  v1 = [v1[0] / n, v1[1] / n]
  return { l1, l2, v1, v2: [-v1[1], v1[0]] as Vec2 }
}

// 2×2 矩阵的奇异值分解：A v_i = σ_i u_i，σ1 ≥ σ2 ≥ 0
export function svd2(A: Mat2) {
  const [a, b, c, d] = A
  const { l1, l2, v1, v2 } = symEig2(a * a + c * c, a * b + c * d, b * b + d * d)
  const s1 = Math.sqrt(Math.max(l1, 0)), s2 = Math.sqrt(Math.max(l2, 0))
  const unit = (w: Vec2, s: number, fb: Vec2): Vec2 => s > 1e-300 ? [w[0] / s, w[1] / s] : fb
  const u1 = unit(mv(A, v1), s1, [1, 0])
  const u2 = unit(mv(A, v2), s2, [-u1[1], u1[0]])
  return { s1, s2, v1, v2, u1, u2 }
}

// 算子范数的闭式公式：‖A‖₁ = 最大列和，‖A‖∞ = 最大行和，‖A‖₂ = √λmax(AᵀA)
export function opNorm2x2(A: Mat2, p: NormKind) {
  const [a, b, c, d] = A.map(Math.abs)
  if (p === 1) return Math.max(a + c, b + d)
  if (p === 'inf') return Math.max(a + b, c + d)
  return svd2(A).s1
}
// 取到最大值的单位向量（1、∞ 范数取顶点，2 范数取第一右奇异向量）
export function opNormArgmax(A: Mat2, p: NormKind): Vec2 {
  if (p === 1) {
    const [a, b, c, d] = A.map(Math.abs)
    return a + c >= b + d ? [1, 0] : [0, 1]
  }
  if (p === 'inf') {
    const [a, b, c, d] = A
    // 让最大的那一行的每一项都取正号：x_j = sign(a_ij)
    const row = Math.abs(a) + Math.abs(b) >= Math.abs(c) + Math.abs(d) ? [a, b] : [c, d]
    return [row[0] >= 0 ? 1 : -1, row[1] >= 0 ? 1 : -1]
  }
  return svd2(A).v1
}

// 单位球边界上的点：方向角 t，缩放到 ‖x‖_p = 1
export function unitPoint(t: number, p: NormKind): Vec2 {
  const u: Vec2 = [Math.cos(t), Math.sin(t)]
  const n = vnorm(u, p)
  return [u[0] / n, u[1] / n]
}

// 一般 2×2 矩阵的特征值（可能是复数），返回谱半径与说明
export function eig2(A: Mat2) {
  const tr = A[0] + A[3], dt = det2(A), disc = tr * tr / 4 - dt
  if (disc >= 0) {
    const s = Math.sqrt(disc)
    const l1 = tr / 2 + s, l2 = tr / 2 - s
    return { real: true, re: [l1, l2], im: [0, 0], rho: Math.max(Math.abs(l1), Math.abs(l2)) }
  }
  const s = Math.sqrt(-disc)
  return { real: false, re: [tr / 2, tr / 2], im: [s, -s], rho: Math.hypot(tr / 2, s) }
}

// ‖M^k‖₂，k = 0..K
export function powerNorms(M: Mat2, K: number) {
  const out: number[] = []
  let P: Mat2 = [1, 0, 0, 1]
  for (let k = 0; k <= K; k++) {
    out.push(svd2(P).s1)
    P = mm(M, P)
  }
  return out
}

// ---------- 分数（展示课件里 5/3、25/12 这样的精确迭代值） ----------
const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : Math.abs(a)
export interface Frac { n: number; d: number }
export const fr = (n: number, d = 1): Frac => {
  if (d < 0) { n = -n; d = -d }
  const g = gcd(n, d) || 1
  return { n: n / g, d: d / g }
}
export const fadd = (x: Frac, y: Frac) => fr(x.n * y.d + y.n * x.d, x.d * y.d)
export const fsub = (x: Frac, y: Frac) => fr(x.n * y.d - y.n * x.d, x.d * y.d)
export const fmul = (x: Frac, y: Frac) => fr(x.n * y.n, x.d * y.d)
export const fdiv = (x: Frac, y: Frac) => fr(x.n * y.d, x.d * y.n)
export const fval = (x: Frac) => x.n / x.d
// 分子分母还在安全整数范围内才算“精确”
export const fsafe = (x: Frac) => Math.abs(x.n) < 1e12 && x.d < 1e12
export const fstr = (x: Frac) => x.d === 1 ? `${x.n}` : `${x.n}/${x.d}`

// 2×2 方程组 [[a, b], [c, d]] (u, v) = (e, f) 的 Jacobi / Gauss-Seidel，整数系数时用分数精确计算
export interface Sys2 { a: number; b: number; c: number; d: number; e: number; f: number }
export function iterate2(s: Sys2, method: 'jacobi' | 'gs', K: number) {
  const A = fr(s.a), B = fr(s.b), C = fr(s.c), D = fr(s.d), E = fr(s.e), F = fr(s.f)
  const exact = [s.a, s.b, s.c, s.d, s.e, s.f].every(Number.isInteger)
  let fu = fr(0), fv = fr(0), u = 0, v = 0, ok = exact
  const out: { u: number; v: number; uf?: string; vf?: string; mid?: Vec2 }[] = [{ u, v, uf: '0', vf: '0' }]
  for (let k = 0; k < K; k++) {
    const un = (s.e - s.b * v) / s.a
    const vn = (s.f - s.c * (method === 'gs' ? un : u)) / s.d
    if (ok) {
      const fun = fdiv(fsub(E, fmul(B, fv)), A)
      const fvn = fdiv(fsub(F, fmul(C, method === 'gs' ? fun : fu)), D)
      fu = fun; fv = fvn
      ok = fsafe(fu) && fsafe(fv)
    }
    // Gauss-Seidel 先更新 u（水平走一步），再用新的 u 更新 v（竖直走一步）
    out.push({ u: un, v: vn, uf: ok ? fstr(fu) : undefined, vf: ok ? fstr(fv) : undefined, mid: method === 'gs' ? [un, v] : undefined })
    u = un; v = vn
    if (!Number.isFinite(u) || !Number.isFinite(v) || Math.abs(u) + Math.abs(v) > 1e12) break
  }
  return out
}

// ---------- n×n 三对角模型问题 tridiag(−1, d, −1) ----------
// A x = b，b = A·1（真解全为 1），初值 0；返回每一步的 ‖x_k − x*‖∞
export function tridiagRun(n: number, diag: number, method: 'jacobi' | 'gs', K: number) {
  const b = Array.from({ length: n }, (_, i) => diag - (i > 0 ? 1 : 0) - (i < n - 1 ? 1 : 0))
  let x = new Array(n).fill(0)
  const errs = [1]
  for (let k = 0; k < K; k++) {
    const y = method === 'gs' ? x : x.slice()
    for (let i = 0; i < n; i++) {
      // Jacobi 只读旧向量 x；Gauss-Seidel 原地更新，左边邻居已经是新值
      const src = method === 'gs' ? y : x
      const left = i > 0 ? src[i - 1] : 0, right = i < n - 1 ? src[i + 1] : 0
      y[i] = (b[i] + left + right) / diag
    }
    x = y
    const e = x.reduce((m, v) => Math.max(m, Math.abs(v - 1)), 0)
    errs.push(e)
    if (!Number.isFinite(e) || e > 1e8) break
  }
  return errs
}
// Jacobi 迭代矩阵 D⁻¹(L+U) 的特征值是 (2/d)cos(jπ/(n+1))，谱半径取 j = 1
export const rhoJacobiTridiag = (n: number, d: number) => 2 * Math.cos(Math.PI / (n + 1)) / d
