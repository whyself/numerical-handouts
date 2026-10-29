// 第 04 讲：最小二乘、Gram–Schmidt（CGS / MGS）、Householder QR、函数空间投影
// 矩阵一律用行优先的 number[][]，A[i][j] 为第 i 行第 j 列

export type Mat = number[][]
export type Vec = number[]

export const zeros = (m: number, n: number): Mat => Array.from({ length: m }, () => new Array(n).fill(0))
export const eye = (n: number): Mat => zeros(n, n).map((r, i) => (r[i] = 1, r))
export const clone = (A: Mat): Mat => A.map(r => r.slice())
export const transpose = (A: Mat): Mat => A[0].map((_, j) => A.map(r => r[j]))
export const col = (A: Mat, j: number): Vec => A.map(r => r[j])
export const dot = (u: Vec, v: Vec) => u.reduce((s, x, i) => s + x * v[i], 0)
export const norm2 = (v: Vec) => {
  // 先缩放再平方，避免溢出 / 下溢（第一讲的技巧）
  const m = Math.max(...v.map(Math.abs))
  if (m === 0) return 0
  return m * Math.sqrt(v.reduce((s, x) => s + (x / m) ** 2, 0))
}
export const matmul = (A: Mat, B: Mat): Mat => A.map(r => B[0].map((_, j) => r.reduce((s, a, k) => s + a * B[k][j], 0)))
export const matvec = (A: Mat, x: Vec): Vec => A.map(r => dot(r, x))
export const sub = (u: Vec, v: Vec) => u.map((x, i) => x - v[i])
export const fromCols = (cols: Vec[]): Mat => cols[0].map((_, i) => cols.map(c => c[i]))

// ‖I − QᵀQ‖_F：正交性损失
export function orthLoss(Q: Mat) {
  const n = Q[0].length
  let s = 0
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    let d = 0
    for (let k = 0; k < Q.length; k++) d += Q[k][i] * Q[k][j]
    s += (d - (i === j ? 1 : 0)) ** 2
  }
  return Math.sqrt(s)
}

// ‖A − QR‖_F / ‖A‖_F：分解残差
export function factorResidual(A: Mat, Q: Mat, R: Mat) {
  const QR = matmul(Q, R)
  let s = 0, a = 0
  A.forEach((r, i) => r.forEach((v, j) => { s += (v - QR[i][j]) ** 2; a += v * v }))
  return Math.sqrt(s / a)
}

// ---------- Gram–Schmidt：CGS 与 MGS（课件 P19 的两段伪代码） ----------
export interface GSStep { j: number; i: number; rij: number; y: Vec }   // i = j 表示归一化这一步，rij 即 r_jj
export function gramSchmidt(A: Mat, kind: 'cgs' | 'mgs', record = false) {
  const m = A.length, n = A[0].length
  const Q = zeros(m, n), R = zeros(n, n)
  const steps: GSStep[] = []
  for (let j = 0; j < n; j++) {
    const Aj = col(A, j)
    let y = Aj.slice()
    for (let i = 0; i < j; i++) {
      const qi = col(Q, i)
      const rij = dot(qi, kind === 'cgs' ? Aj : y)   // 唯一差别：投影原列还是当前剩余向量
      R[i][j] = rij
      y = y.map((v, k) => v - rij * qi[k])
      if (record) steps.push({ j, i, rij, y: y.slice() })
    }
    const rjj = norm2(y)
    R[j][j] = rjj
    for (let k = 0; k < m; k++) Q[k][j] = rjj === 0 ? 0 : y[k] / rjj
    if (record) steps.push({ j, i: j, rij: rjj, y: y.slice() })
  }
  return { Q, R, steps }
}

// 重复正交化（CGS2）：每一列做两遍 CGS，常用的补救办法（补充）
export function cgs2(A: Mat) {
  const m = A.length, n = A[0].length
  const Q = zeros(m, n), R = zeros(n, n)
  for (let j = 0; j < n; j++) {
    let y = col(A, j)
    for (let pass = 0; pass < 2; pass++) {
      const cs = Array.from({ length: j }, (_, i) => dot(col(Q, i), y))
      cs.forEach((c, i) => { R[i][j] += c; const qi = col(Q, i); y = y.map((v, k) => v - c * qi[k]) })
    }
    const rjj = norm2(y)
    R[j][j] = rjj
    for (let k = 0; k < m; k++) Q[k][j] = y[k] / rjj
  }
  return { Q, R }
}

// ---------- Householder QR（课件 P25、P40） ----------
// v ∝ x + sign(x₁)‖x‖e₁（取与 x₁ 同号，避免相减抵消），H = I − 2vvᵀ，Hx = −sign(x₁)‖x‖e₁
export function householderVec(x: Vec) {
  const a = norm2(x)
  const s = x[0] >= 0 ? 1 : -1
  const v = x.slice()
  v[0] += s * a
  const nv = norm2(v)
  return { v: nv === 0 ? v : v.map(t => t / nv), alpha: -s * a }
}

// 返回 R（m×n 上三角，取前 n 行即薄 R）、薄 Q（m×n）、每一步之后的矩阵快照
export function householderQR(A: Mat) {
  const m = A.length, n = A[0].length
  const W = clone(A)
  const vs: Vec[] = []
  const snaps: Mat[] = [clone(W)]
  for (let k = 0; k < Math.min(n, m - 1); k++) {
    const x = W.slice(k).map(r => r[k])
    const { v } = householderVec(x)
    vs.push(v)
    for (let j = k; j < n; j++) {
      let s = 0
      for (let i = k; i < m; i++) s += v[i - k] * W[i][j]
      for (let i = k; i < m; i++) W[i][j] -= 2 * v[i - k] * s
    }
    for (let i = k + 1; i < m; i++) W[i][k] = 0
    snaps.push(clone(W))
  }
  // 薄 Q = H₁H₂⋯H_k [I_n; 0]
  const Q = zeros(m, n)
  for (let j = 0; j < n; j++) Q[j][j] = 1
  for (let k = vs.length - 1; k >= 0; k--) {
    const v = vs[k]
    for (let j = 0; j < n; j++) {
      let s = 0
      for (let i = k; i < m; i++) s += v[i - k] * Q[i][j]
      for (let i = k; i < m; i++) Q[i][j] -= 2 * v[i - k] * s
    }
  }
  const R = W.slice(0, n).map(r => r.slice())
  return { Q, R, snaps, vs }
}

// 用 Householder 反射直接作用在 b 上算 Qᵀb（不必显式形成 Q）
export function applyQt(vs: Vec[], b: Vec) {
  const y = b.slice()
  vs.forEach((v, k) => {
    let s = 0
    for (let i = k; i < y.length; i++) s += v[i - k] * y[i]
    for (let i = k; i < y.length; i++) y[i] -= 2 * v[i - k] * s
  })
  return y
}

// 回代解上三角系统 R x = c
export function solveUpper(R: Mat, c: Vec) {
  const n = R[0].length, x = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let s = c[i]
    for (let j = i + 1; j < n; j++) s -= R[i][j] * x[j]
    x[i] = s / R[i][i]
  }
  return x
}

// ---------- 三种最小二乘解法 ----------
// 法线方程 + Cholesky：AᵀA = LLᵀ；失败（数值上不正定）时返回 null
export function lsqNormal(A: Mat, b: Vec): Vec | null {
  const At = transpose(A), G = matmul(At, A), c = matvec(At, b), n = G.length
  const L = zeros(n, n)
  for (let j = 0; j < n; j++) {
    let d = G[j][j]
    for (let k = 0; k < j; k++) d -= L[j][k] ** 2
    if (!(d > 0)) return null
    L[j][j] = Math.sqrt(d)
    for (let i = j + 1; i < n; i++) {
      let s = G[i][j]
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k]
      L[i][j] = s / L[j][j]
    }
  }
  const z = new Array(n).fill(0)
  for (let i = 0; i < n; i++) { let s = c[i]; for (let k = 0; k < i; k++) s -= L[i][k] * z[k]; z[i] = s / L[i][i] }
  return solveUpper(transpose(L), z)
}
export function lsqHouseholder(A: Mat, b: Vec) {
  const { R, vs } = householderQR(A)
  return solveUpper(R, applyQt(vs, b).slice(0, A[0].length))
}
export function lsqMGS(A: Mat, b: Vec) {
  // 把 b 当作第 n+1 列一起做 MGS，是 MGS 解最小二乘的稳定写法（补充）
  const n = A[0].length
  const { R } = gramSchmidt(A.map((r, i) => [...r, b[i]]), 'mgs')
  return solveUpper(R.slice(0, n).map(r => r.slice(0, n)), R.slice(0, n).map(r => r[n]))
}

// ---------- 奇异值（单边 Jacobi，直接作用在 A 上，比先算 AᵀA 准） ----------
export function singularValues(A: Mat) {
  const U = clone(A), m = U.length, n = U[0].length
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      let a = 0, b = 0, c = 0
      for (let i = 0; i < m; i++) { a += U[i][p] ** 2; b += U[i][q] ** 2; c += U[i][p] * U[i][q] }
      if (Math.abs(c) <= 1e-15 * Math.sqrt(a * b)) continue
      off = Math.max(off, Math.abs(c) / Math.sqrt(a * b))
      const z = (b - a) / (2 * c)
      const t = Math.sign(z || 1) / (Math.abs(z) + Math.sqrt(1 + z * z))
      const cs = 1 / Math.sqrt(1 + t * t), sn = cs * t
      for (let i = 0; i < m; i++) {
        const x = U[i][p], y = U[i][q]
        U[i][p] = cs * x - sn * y
        U[i][q] = sn * x + cs * y
      }
    }
    if (off < 1e-15) break
  }
  return Array.from({ length: n }, (_, j) => norm2(col(U, j))).sort((x, y) => y - x)
}
export function cond2(A: Mat) {
  const s = singularValues(A)
  return s[0] / s[s.length - 1]
}

// ---------- 常用矩阵 ----------
export const hilbert = (m: number, n = m): Mat => Array.from({ length: m }, (_, i) => Array.from({ length: n }, (_, j) => 1 / (i + j + 1)))
export const vandermonde = (xs: Vec, n: number): Mat => xs.map(x => Array.from({ length: n }, (_, j) => x ** j))
// Läuchli 矩阵：第一行全 1，下面是 ε·I，列几乎平行
export const lauchli = (n: number, eps: number): Mat => [new Array(n).fill(1), ...Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? eps : 0)))]
export const linspace = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1))

// ---------- 函数空间：傅里叶与 Chebyshev 投影 ----------
// 复合 Simpson 积分
export function simpson(f: (x: number) => number, a: number, b: number, n = 2000) {
  if (n % 2) n++
  const h = (b - a) / n
  let s = f(a) + f(b)
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f(a + i * h)
  return s * h / 3
}
// [−π, π] 上的傅里叶系数：a_k = ⟨f, cos kx⟩/π，b_k = ⟨f, sin kx⟩/π（P32）
export function fourierCoeffs(f: (x: number) => number, n: number) {
  const a: number[] = [], b: number[] = [0]
  for (let k = 0; k <= n; k++) {
    a.push(simpson(x => f(x) * Math.cos(k * x), -Math.PI, Math.PI, 4000) / Math.PI)
    if (k) b.push(simpson(x => f(x) * Math.sin(k * x), -Math.PI, Math.PI, 4000) / Math.PI)
  }
  return { a, b }
}
export const fourierEval = (a: number[], b: number[], x: number) =>
  a[0] / 2 + a.slice(1).reduce((s, ak, i) => s + ak * Math.cos((i + 1) * x) + b[i + 1] * Math.sin((i + 1) * x), 0)

// Chebyshev：⟨f, T_k⟩_w = ∫₀^π f(cos θ) cos kθ dθ（P28 的换元），⟨T₀,T₀⟩ = π，⟨T_k,T_k⟩ = π/2
export function chebCoeffs(f: (x: number) => number, n: number) {
  const c: number[] = []
  for (let k = 0; k <= n; k++) {
    const ip = simpson(t => f(Math.cos(t)) * Math.cos(k * t), 0, Math.PI, 4000)
    c.push(ip / (k === 0 ? Math.PI : Math.PI / 2))
  }
  return c
}
export function chebEval(c: number[], x: number) {
  // Clenshaw 递推
  let b1 = 0, b2 = 0
  for (let k = c.length - 1; k >= 1; k--) { const t = 2 * x * b1 - b2 + c[k]; b2 = b1; b1 = t }
  return x * b1 - b2 + c[0]
}

// 指针事件 → SVG 内部坐标（只在事件回调里调用，不会在服务端渲染时执行）
export function svgPoint(e: PointerEvent | MouseEvent, svg: SVGSVGElement) {
  const p = svg.createSVGPoint()
  p.x = e.clientX; p.y = e.clientY
  return p.matrixTransform(svg.getScreenCTM()!.inverse())
}
