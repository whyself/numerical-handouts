// 第 09 讲：逆迭代、Rayleigh 商迭代、同时迭代与 QR 算法（小规模稠密矩阵，浏览器里真算）

export type Vec = number[]
export type Mat = number[][]

export const dot = (a: Vec, b: Vec) => a.reduce((s, v, i) => s + v * b[i], 0)
export const norm = (a: Vec) => Math.sqrt(dot(a, a))
export const scale = (a: Vec, c: number) => a.map(v => v * c)
export const normalize = (a: Vec) => scale(a, 1 / norm(a))
export const matvec = (A: Mat, x: Vec) => A.map(r => dot(r, x))
export const transpose = (A: Mat): Mat => A[0].map((_, j) => A.map(r => r[j]))
export const matmul = (A: Mat, B: Mat): Mat => A.map(r => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)))
export const eye = (n: number): Mat => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => +(i === j)))
export const diag = (d: Vec): Mat => d.map((v, i) => d.map((_, j) => (i === j ? v : 0)))
export const col = (A: Mat, j: number): Vec => A.map(r => r[j])
export const fromCols = (cs: Vec[]): Mat => cs[0].map((_, i) => cs.map(c => c[i]))
export const shift = (A: Mat, q: number): Mat => A.map((r, i) => r.map((v, j) => (i === j ? v - q : v)))
export const frob = (A: Mat) => Math.sqrt(A.reduce((s, r) => s + dot(r, r), 0))
export const rayleigh = (A: Mat, x: Vec) => dot(x, matvec(A, x)) / dot(x, x)

// 列主元高斯消去解 Ax = b；矩阵（数值上）奇异时返回 null
export function solve(A: Mat, b: Vec): Vec | null {
  const n = A.length, M = A.map((r, i) => [...r, b[i]])
  const big = Math.max(...A.map(r => Math.max(...r.map(Math.abs)))) || 1
  for (let k = 0; k < n; k++) {
    let p = k
    for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i
    if (Math.abs(M[p][k]) <= 1e-15 * big) return null
    ;[M[k], M[p]] = [M[p], M[k]]
    for (let i = k + 1; i < n; i++) {
      const f = M[i][k] / M[k][k]
      for (let j = k; j <= n; j++) M[i][j] -= f * M[k][j]
    }
  }
  const x = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n]
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j]
    x[i] = s / M[i][i]
  }
  return x
}

// Householder QR：A (m×n, m ≥ n) = Q R，Q 为 m×n 列正交，R 为 n×n 上三角且对角元 ≥ 0（课件约定的“自然”选取）
export function qr(A: Mat): { Q: Mat; R: Mat } {
  const m = A.length, n = A[0].length
  const R = A.map(r => [...r]), H: Vec[] = []
  for (let k = 0; k < n; k++) {
    const x = R.slice(k).map(r => r[k]), nx = norm(x)
    const v = [...x]
    v[0] += (x[0] >= 0 ? 1 : -1) * nx
    const nv = norm(v)
    if (nv < 1e-300) { H.push(v.map(() => 0)); continue }
    const u = scale(v, 1 / nv)
    H.push(u)
    for (let j = 0; j < n; j++) {
      let s = 0
      for (let i = k; i < m; i++) s += u[i - k] * R[i][j]
      for (let i = k; i < m; i++) R[i][j] -= 2 * u[i - k] * s
    }
  }
  // 把 Householder 反射作用在 I 的前 n 列上得到薄 Q
  const Q: Mat = Array.from({ length: m }, (_, i) => Array.from({ length: n }, (_, j) => +(i === j)))
  for (let k = n - 1; k >= 0; k--) {
    const u = H[k]
    for (let j = 0; j < n; j++) {
      let s = 0
      for (let i = k; i < m; i++) s += u[i - k] * Q[i][j]
      for (let i = k; i < m; i++) Q[i][j] -= 2 * u[i - k] * s
    }
  }
  const Rn = R.slice(0, n).map((r, i) => r.map((v, j) => (j < i ? 0 : v)))
  // 符号约定：R 的对角元取非负
  for (let i = 0; i < n; i++) if (Rn[i][i] < 0) {
    for (let j = 0; j < n; j++) Rn[i][j] = -Rn[i][j]
    for (let r = 0; r < m; r++) Q[r][i] = -Q[r][i]
  }
  return { Q, R: Rn }
}

// 对称矩阵的 Jacobi 特征分解（作为“标准答案”）：返回按特征值降序排列的 { vals, vecs(列) }
export function eigSym(A0: Mat) {
  const n = A0.length, A = A0.map(r => [...r]), V = eye(n)
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] ** 2
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
  const idx = [...Array(n).keys()].sort((a, b) => A[b][b] - A[a][a])
  return { vals: idx.map(i => A[i][i]), vecs: idx.map(i => col(V, i)) }
}

// 由给定特征值构造一个“看起来不对角”的对称矩阵 A = V diag(λ) Vᵀ（V 由固定种子的 QR 得到，可复现）
export function symWithEigs(lams: Vec, seed = 7): Mat {
  const n = lams.length
  let s = seed
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - 0.5 }
  const M = Array.from({ length: n }, () => Array.from({ length: n }, rnd))
  const { Q } = qr(M)
  const A = matmul(matmul(Q, diag(lams)), transpose(Q))
  return A.map((r, i) => r.map((_, j) => (A[i][j] + A[j][i]) / 2))
}

// 单位向量 x 与单位向量 v 的夹角正弦（方向误差，不计正负号）
// 用 ‖x̂ − (x̂·v̂)v̂‖ 计算，避免 sqrt(1 − cos²) 在小角度时的相消误差（否则只能精确到 1e−8 左右）
export function sinAngle(x: Vec, v: Vec) {
  const a = normalize(x), b = normalize(v), c = dot(a, b)
  return Math.min(1, norm(a.map((t, i) => t - c * b[i])))
}

// 位移逆迭代：(A − qI) y = x，x ← y/‖y‖；q 为 null 时退化为普通幂迭代
export function inverseIteration(A: Mat, q: number | null, x0: Vec, n: number) {
  const xs = [normalize(x0)]
  for (let k = 0; k < n; k++) {
    const x = xs[k]
    const y = q === null ? matvec(A, x) : solve(shift(A, q), x)
    if (!y || !y.every(Number.isFinite) || norm(y) === 0) break
    xs.push(normalize(y))
  }
  return xs
}

// Rayleigh 商迭代：每步 μ_k = xᵀAx，解 (A − μ_k I) y = x；残差足够小或矩阵奇异时停
export function rqi(A: Mat, x0: Vec, n: number) {
  const xs = [normalize(x0)], mus: number[] = []
  for (let k = 0; k < n; k++) {
    const x = xs[k], mu = rayleigh(A, x)
    mus.push(mu)
    const r = norm(matvec(shift(A, mu), x))
    if (r < 1e-14) break
    const y = solve(shift(A, mu), x)
    if (!y || !y.every(Number.isFinite)) break
    xs.push(normalize(y))
  }
  return { xs, mus }
}

// 2-范数：‖M‖₂ = sqrt(λ_max(MᵀM))
export function norm2(M: Mat) {
  const G = matmul(transpose(M), M)
  return Math.sqrt(Math.max(0, eigSym(G).vals[0]))
}

// 同时迭代（正交迭代）一步：A Q_k = Q_{k+1} R_k；orth = false 时只把每列各自归一化
export function orthStep(A: Mat, Q: Mat, orth = true): Mat {
  const AQ = matmul(A, Q)
  if (orth) return qr(AQ).Q
  return fromCols(Q[0].map((_, j) => normalize(col(AQ, j))))
}

// 基本 / 带位移的 QR 迭代一步：A − μI = QR，A' = RQ + μI
export function qrStep(A: Mat, mu = 0) {
  const { Q, R } = qr(shift(A, mu))
  const B = matmul(R, Q).map((r, i) => r.map((v, j) => (i === j ? v + mu : v)))
  return { A: B, Q, R }
}

// 2×2 尾块的 Wilkinson 位移：取 [[a, b], [b, c]] 中更接近 c 的那个特征值
export function wilkinson(A: Mat) {
  const n = A.length, a = A[n - 2][n - 2], b = A[n - 1][n - 2], c = A[n - 1][n - 1]
  const d = (a - c) / 2
  if (b === 0) return c
  const sg = d >= 0 ? 1 : -1
  return c - (sg * b * b) / (Math.abs(d) + Math.sqrt(d * d + b * b))
}

export type ShiftRule = 'none' | 'rayleigh' | 'wilkinson'

// 带收缩（deflation）的 QR 迭代：每当活动块最后一行的次对角元 < tol·‖A‖，就锁定一个特征值、块缩小一阶
export function qrDeflate(A0: Mat, rule: ShiftRule, maxIt = 400, tol = 1e-12) {
  let A = A0.map(r => [...r])
  const scaleA = frob(A0) || 1
  const trace: { k: number; m: number; sub: number }[] = []
  const found: { val: number; at: number }[] = []
  let k = 0
  while (A.length > 1 && k < maxIt) {
    const m = A.length, sub = Math.abs(A[m - 1][m - 2])
    trace.push({ k, m, sub })
    if (sub < tol * scaleA) {
      found.push({ val: A[m - 1][m - 1], at: k })
      A = A.slice(0, m - 1).map(r => r.slice(0, m - 1))
      continue
    }
    const mu = rule === 'none' ? 0 : rule === 'rayleigh' ? A[m - 1][m - 1] : wilkinson(A)
    A = qrStep(A, mu).A
    k++
  }
  if (A.length === 1) found.push({ val: A[0][0], at: k })
  return { trace, found, iters: k, done: A.length === 1 }
}
