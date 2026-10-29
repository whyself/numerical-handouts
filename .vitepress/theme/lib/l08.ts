// 第 08 讲：奇异值分解（单边 Jacobi）、对称特征分解（Jacobi）、低秩逼近、PCA 与最小二乘小实验

export type Mat = number[][]

export const zeros = (m: number, n: number): Mat => Array.from({ length: m }, () => new Array(n).fill(0))
export const eye = (n: number): Mat => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)))
export const transpose = (A: Mat): Mat => (A.length ? A[0].map((_, j) => A.map(r => r[j])) : [])
export const copy = (A: Mat): Mat => A.map(r => r.slice())

export function mul(A: Mat, B: Mat): Mat {
  const m = A.length, k = B.length, n = B[0]?.length ?? 0
  const C = zeros(m, n)
  for (let i = 0; i < m; i++) for (let l = 0; l < k; l++) {
    const a = A[i][l]
    if (a === 0) continue
    const Bl = B[l], Ci = C[i]
    for (let j = 0; j < n; j++) Ci[j] += a * Bl[j]
  }
  return C
}
export const matvec = (A: Mat, x: number[]) => A.map(r => r.reduce((s, v, j) => s + v * x[j], 0))
export const sub = (A: Mat, B: Mat): Mat => A.map((r, i) => r.map((v, j) => v - B[i][j]))
export const fro = (A: Mat) => Math.sqrt(A.reduce((s, r) => s + r.reduce((t, v) => t + v * v, 0), 0))
const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0)
const norm = (a: number[]) => Math.sqrt(dot(a, a))

// 对称矩阵的循环 Jacobi 特征分解：特征值降序，vecs 的列是对应的单位特征向量
export function symEig(S: Mat) {
  const n = S.length, A = copy(S), V = eye(n)
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p][q] * A[p][q]
    if (off < 1e-30 * (fro(A) ** 2 + 1e-300)) break
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (A[p][q] === 0) continue
      const th = (A[q][q] - A[p][p]) / (2 * A[p][q])
      const t = (th >= 0 ? 1 : -1) / (Math.abs(th) + Math.sqrt(1 + th * th))
      const c = 1 / Math.sqrt(1 + t * t), s = t * c
      for (let k = 0; k < n; k++) { // 右乘旋转 J
        const akp = A[k][p], akq = A[k][q]
        A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq
      }
      for (let k = 0; k < n; k++) { // 左乘 Jᵀ
        const apk = A[p][k], aqk = A[q][k]
        A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk
      }
      for (let k = 0; k < n; k++) {
        const vkp = V[k][p], vkq = V[k][q]
        V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq
      }
    }
  }
  const idx = [...Array(n).keys()].sort((i, j) => A[j][j] - A[i][i])
  return { vals: idx.map(i => A[i][i]), vecs: V.map(r => idx.map(i => r[i])) }
}

export interface SVD { U: Mat; s: number[]; V: Mat } // A = U diag(s) Vᵀ，U 为 m×p、V 为 n×p，p = min(m, n)

// 单边 Jacobi（Hestenes）：不断用平面旋转使 A 的两列正交，收敛后各列的长度就是奇异值。
// 只对 A 本身做正交变换，不显式形成 AᵀA，所以对小奇异值也有很好的相对精度。
export let svdSweeps = 0
function svdTall(A: Mat): SVD {
  const m = A.length, n = A[0].length
  const W = transpose(A).map(r => Float64Array.from(r)) // 第 j 行存 A 的第 j 列，便于整列旋转
  const V = eye(n).map(r => Float64Array.from(r))       // 同样按行存 V 的列
  const eps = 2.3e-16
  let total = 0
  for (const w of W) for (const v of w) total += v * v
  const floor = (1e-30 * total) ** 2 // 两列都小到可忽略时不再旋转
  for (let sweep = 0; sweep < 80; sweep++) {
    let rotated = false
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      const wp = W[p], wq = W[q]
      let a = 0, b = 0, g = 0
      for (let i = 0; i < m; i++) { a += wp[i] * wp[i]; b += wq[i] * wq[i]; g += wp[i] * wq[i] }
      if (g === 0 || Math.abs(g) <= 4 * eps * Math.sqrt(a * b) || a * b < floor) continue
      rotated = true
      const z = (b - a) / (2 * g)
      const t = (z >= 0 ? 1 : -1) / (Math.abs(z) + Math.sqrt(1 + z * z))
      const c = 1 / Math.sqrt(1 + t * t), s = c * t
      for (let i = 0; i < m; i++) { const x = wp[i], y = wq[i]; wp[i] = c * x - s * y; wq[i] = s * x + c * y }
      const vp = V[p], vq = V[q]
      for (let i = 0; i < n; i++) { const x = vp[i], y = vq[i]; vp[i] = c * x - s * y; vq[i] = s * x + c * y }
    }
    if (!rotated) { svdSweeps = sweep; break }
  }
  const sig = W.map(w => Math.sqrt(w.reduce((t, v) => t + v * v, 0)))
  const idx = [...Array(n).keys()].sort((i, j) => sig[j] - sig[i])
  const s = idx.map(i => sig[i])
  const tol = Math.max(m, n) * eps * (s[0] || 0)
  const Ucols = idx.map(i => (sig[i] > tol ? Array.from(W[i], v => v / sig[i]) : new Array(m).fill(0)))
  const Vcols = idx.map(i => Array.from(V[i]))
  // 符号约定：每个 v_i 绝对值最大的分量取正（奇异向量本来只确定到 ±1）
  for (let j = 0; j < n; j++) {
    const v = Vcols[j]
    let k = 0
    for (let i = 1; i < n; i++) if (Math.abs(v[i]) > Math.abs(v[k]) + 1e-12) k = i
    if (v[k] < 0) { Vcols[j] = v.map(x => -x); Ucols[j] = Ucols[j].map(x => -x) }
  }
  // σ = 0 的左奇异向量不能用 Av/σ 得到：把已有的 u 补成标准正交组（证明里的“正交基扩充”）
  const r = s.filter(x => x > tol).length
  const done = completeBasis(Ucols.slice(0, r), m)
  for (let j = r; j < n; j++) Ucols[j] = done[j]
  return { U: transpose(Ucols), s: s.map(x => (x > tol ? x : 0)), V: transpose(Vcols) }
}

export function svd(A: Mat): SVD {
  const m = A.length, n = A[0].length
  if (m >= n) return svdTall(A)
  const r = svdTall(transpose(A))
  return { U: r.V, s: r.s, V: r.U }
}

// 给定若干标准正交向量（长度 dim），用改进的 Gram–Schmidt 依次加入 e_1, e_2, … 补成 ℝ^dim 的标准正交基
export function completeBasis(cols: number[][], dim: number) {
  const Q = cols.map(c => c.slice())
  for (let e = 0; e < dim && Q.length < dim; e++) {
    let v = Array.from({ length: dim }, (_, i) => (i === e ? 1 : 0))
    for (let pass = 0; pass < 2; pass++) for (const q of Q) { const d = dot(q, v); v = v.map((x, i) => x - d * q[i]) }
    const nv = norm(v)
    if (nv > 1e-8) Q.push(v.map(x => x / nv))
  }
  return Q
}

// 完整的 U（m×m）与 V（n×n），用于展示“完整形式”的 SVD
export function fullSVD(A: Mat) {
  const m = A.length, n = A[0].length, { U, s, V } = svd(A)
  const Uf = transpose(completeBasis(transpose(U), m))
  const Vf = transpose(completeBasis(transpose(V), n))
  const S = zeros(m, n)
  s.forEach((x, i) => { S[i][i] = x })
  return { U: Uf, S, V: Vf, s }
}

export const rankOf = (s: number[], m: number, n: number) => {
  const tol = Math.max(m, n) * 2.3e-16 * (s[0] || 0)
  return s.filter(x => x > tol).length
}

// 截断 SVD：A_k = Σ_{i≤k} σ_i u_i v_iᵀ
export function lowRank({ U, s, V }: SVD, k: number): Mat {
  const m = U.length, n = V.length, B = zeros(m, n)
  for (let l = 0; l < Math.min(k, s.length); l++) {
    const sl = s[l]
    if (sl === 0) continue
    for (let i = 0; i < m; i++) {
      const a = sl * U[i][l]
      if (a === 0) continue
      const Bi = B[i]
      for (let j = 0; j < n; j++) Bi[j] += a * V[j][l]
    }
  }
  return B
}

// 伪逆 A⁺ = Σ_{i≤r} v_i u_iᵀ / σ_i
export function pinv(A: Mat): Mat {
  const m = A.length, n = A[0].length, d = svd(A), r = rankOf(d.s, m, n)
  const P = zeros(n, m)
  for (let l = 0; l < r; l++) for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) P[i][j] += d.V[i][l] * d.U[j][l] / d.s[l]
  return P
}

// 二范数：直接取最大奇异值（拿来独立核对 ‖A − A_k‖₂ = σ_{k+1}）
export const norm2 = (A: Mat) => (A.length && A[0].length ? svd(A).s[0] : 0)

// 可复现的伪随机数与正态分布
export function rng(seed: number) {
  let a = seed >>> 0
  const u = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const g = () => Math.sqrt(-2 * Math.log(u() + 1e-300)) * Math.cos(2 * Math.PI * u())
  return { u, g }
}

// 程序生成的灰度测试图（取值 0–1），避免依赖外部图片
export type ImgKind = 'scene' | 'plaid' | 'smooth' | 'noise'
export function makeImage(kind: ImgKind, N = 96): Mat {
  const A = zeros(N, N)
  const R = rng(7)
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const y = i / (N - 1), x = j / (N - 1)
    let v = 0
    if (kind === 'scene') {
      v = 0.25 + 0.35 * y                                             // 天空渐变
      if (y > 0.68) v = 0.55 + 0.1 * Math.sin(18 * x)                  // 地面
      if ((x - 0.72) ** 2 + (y - 0.25) ** 2 < 0.012) v = 0.95          // 太阳
      if (x > 0.12 && x < 0.42 && y > 0.42 && y < 0.8) v = 0.15        // 房子
      if (y < 0.42 && y > 0.22 && Math.abs(x - 0.27) < (y - 0.22) * 0.85) v = 0.3 // 屋顶
      if (x > 0.22 && x < 0.32 && y > 0.6 && y < 0.8) v = 0.8          // 门
      if (x > 0.55 && x < 0.62 && y > 0.5 && y < 0.82) v = 0.35        // 树干
      if ((x - 0.585) ** 2 + (y - 0.45) ** 2 < 0.01) v = 0.45          // 树冠
    } else if (kind === 'plaid') {
      // 三个“行模式 × 列模式”之和：秩恰好为 3
      v = 0.5 + 0.25 * Math.sin(6 * Math.PI * x) * Math.sin(2 * Math.PI * y)
        + 0.15 * (y < 0.5 ? 1 : -1) * (x < 0.3 ? 1 : 0.2)
        + 0.1 * Math.cos(10 * Math.PI * x) * y
    } else if (kind === 'smooth') {
      const r = Math.hypot(x - 0.45, y - 0.55)                         // 水波纹：径向函数，不可分离，但很光滑
      v = 0.5 + 0.4 * Math.cos(14 * r) * Math.exp(-2.5 * r)
    } else {
      v = R.u()
    }
    A[i][j] = Math.min(1, Math.max(0, v))
  }
  return A
}

// 带 Householder 的 QR 最小二乘（第四讲）：返回 x
export function lsqQR(A: Mat, b: number[]) {
  const m = A.length, n = A[0].length, R = copy(A), y = b.slice()
  for (let k = 0; k < n; k++) {
    let a = 0
    for (let i = k; i < m; i++) a += R[i][k] * R[i][k]
    a = Math.sqrt(a)
    if (a === 0) continue
    const alpha = R[k][k] > 0 ? -a : a
    const v = new Array(m).fill(0)
    for (let i = k; i < m; i++) v[i] = R[i][k]
    v[k] -= alpha
    const vv = v.reduce((s, x) => s + x * x, 0)
    if (vv === 0) continue
    for (let j = k; j < n; j++) {
      let d = 0
      for (let i = k; i < m; i++) d += v[i] * R[i][j]
      d = 2 * d / vv
      for (let i = k; i < m; i++) R[i][j] -= d * v[i]
    }
    let d = 0
    for (let i = k; i < m; i++) d += v[i] * y[i]
    d = 2 * d / vv
    for (let i = k; i < m; i++) y[i] -= d * v[i]
  }
  const x = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i]
    for (let j = i + 1; j < n; j++) s -= R[i][j] * x[j]
    x[i] = s / R[i][i]
  }
  return x
}

// 正规方程 + Cholesky：AᵀA x = Aᵀb；AᵀA 数值上不再正定时返回 null
export function lsqNormal(A: Mat, b: number[]) {
  const At = transpose(A), G = mul(At, A), c = matvec(At, b), n = G.length
  const L = zeros(n, n)
  for (let j = 0; j < n; j++) {
    let d = G[j][j]
    for (let k = 0; k < j; k++) d -= L[j][k] * L[j][k]
    if (!(d > 0)) return null
    L[j][j] = Math.sqrt(d)
    for (let i = j + 1; i < n; i++) {
      let s = G[i][j]
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k]
      L[i][j] = s / L[j][j]
    }
  }
  const z = new Array(n).fill(0), x = new Array(n).fill(0)
  for (let i = 0; i < n; i++) { let s = c[i]; for (let k = 0; k < i; k++) s -= L[i][k] * z[k]; z[i] = s / L[i][i] }
  for (let i = n - 1; i >= 0; i--) { let s = z[i]; for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k]; x[i] = s / L[i][i] }
  return x
}

// 伪逆解最小二乘：x = Σ v_i (u_iᵀ b) / σ_i
export function lsqSVD(A: Mat, b: number[]) {
  const m = A.length, n = A[0].length, { U, s, V } = svd(A), r = rankOf(s, m, n)
  const x = new Array(n).fill(0)
  for (let l = 0; l < r; l++) {
    let c = 0
    for (let i = 0; i < m; i++) c += U[i][l] * b[i]
    c /= s[l]
    for (let i = 0; i < n; i++) x[i] += c * V[i][l]
  }
  return x
}

// 解析 “1 2; 3 4” 或多行文本为矩阵，支持 a/b 形式的分数
export function parseMatrix(src: string): Mat | string {
  const rows = src.split(/[;\n]/).map(r => r.trim()).filter(Boolean)
  if (!rows.length) return '请输入矩阵'
  const M = rows.map(r => r.split(/[\s,]+/).filter(Boolean).map(t => {
    const m = t.match(/^(-?[\d.]+(?:e-?\d+)?)\/([\d.]+(?:e-?\d+)?)$/i)
    return m ? Number(m[1]) / Number(m[2]) : Number(t)
  }))
  const n = M[0].length
  if (M.some(r => r.length !== n)) return '每一行的元素个数必须相同'
  if (M.some(r => r.some(v => !Number.isFinite(v)))) return '有无法识别的数字'
  if (M.length > 6 || n > 6) return '为了显示清楚，最多 6×6'
  return M
}
