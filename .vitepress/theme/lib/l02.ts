// 第 02 讲：实数上的插值（拉格朗日、牛顿差商、重心公式、Bernstein）
// 与有限域 F_q 上的多项式运算（Shamir 秘密分享、Reed–Solomon 编码、Berlekamp–Welch 解码）

/* ---------------- 实数插值 ---------------- */

// 第 k 个拉格朗日基函数 L_k(x) = ∏_{j≠k} (x − x_j)/(x_k − x_j)
export function lagrangeBasis(xs: number[], k: number, x: number) {
  let v = 1
  for (let j = 0; j < xs.length; j++) if (j !== k) v *= (x - xs[j]) / (xs[k] - xs[j])
  return v
}

// 牛顿差商表：tab[i][j] = f[x_i, …, x_{i+j}]，第一行 tab[0] 就是牛顿形式的系数
export function dividedDiff(xs: number[], ys: number[]) {
  const n = xs.length
  const tab: number[][] = xs.map((_, i) => [ys[i]])
  for (let j = 1; j < n; j++)
    for (let i = 0; i + j < n; i++)
      tab[i][j] = (tab[i + 1][j - 1] - tab[i][j - 1]) / (xs[i + j] - xs[i])
  return tab
}

// 牛顿形式求值（类 Horner 嵌套，O(n)）
export function newtonEval(xs: number[], c: number[], x: number) {
  let v = c[c.length - 1]
  for (let i = c.length - 2; i >= 0; i--) v = v * (x - xs[i]) + c[i]
  return v
}

// 由牛顿形式展开成单项式系数 a_0 + a_1 x + …（只用于显示）
export function newtonToMonomial(xs: number[], c: number[]) {
  let a = [c[c.length - 1]]
  for (let i = c.length - 2; i >= 0; i--) {
    // a ← a·(x − x_i) + c_i
    const b = new Array(a.length + 1).fill(0)
    for (let j = 0; j < a.length; j++) { b[j + 1] += a[j]; b[j] -= xs[i] * a[j] }
    b[0] += c[i]
    a = b
  }
  return a
}

// 重心权 w_k = 1 / ∏_{j≠k} (x_k − x_j)，预处理 O(n²)
export function baryWeights(xs: number[]) {
  return xs.map((xk, k) => {
    let p = 1
    for (let j = 0; j < xs.length; j++) if (j !== k) p *= xk - xs[j]
    return 1 / p
  })
}

// 重心公式（第二型）求值，O(n)
export function baryEval(xs: number[], ys: number[], w: number[], x: number) {
  let num = 0, den = 0
  for (let k = 0; k < xs.length; k++) {
    const d = x - xs[k]
    if (d === 0) return ys[k]
    const t = w[k] / d
    num += t * ys[k]; den += t
  }
  return num / den
}

export const equispaced = (n: number) =>
  n === 1 ? [0] : Array.from({ length: n }, (_, j) => -1 + 2 * j / (n - 1))
// Chebyshev 点 cos((2j−1)π/(2n))，j = 1..n（下一讲的主角）
export const chebyshevNodes = (n: number) =>
  Array.from({ length: n }, (_, j) => Math.cos((2 * j + 1) * Math.PI / (2 * n)))

export const omega = (xs: number[], x: number) => xs.reduce((p, xj) => p * (x - xj), 1)

// Bernstein 多项式 B_n f(x) = Σ f(i/n) C(n,i) x^i (1−x)^{n−i}；用二项分布的概率递推避免大数
export function bernstein(f: (x: number) => number, n: number, x: number) {
  if (x <= 0) return f(0)
  if (x >= 1) return f(1)
  let p = Math.pow(1 - x, n) // Pr[K = 0]
  let s = 0
  const r = x / (1 - x)
  // n 较大且 x 接近 1 时 (1−x)^n 会下溢，改用对数
  if (p === 0) {
    const lx = Math.log(x), l1 = Math.log(1 - x)
    let lc = 0
    for (let i = 0; i <= n; i++) {
      if (i > 0) lc += Math.log((n - i + 1) / i)
      s += f(i / n) * Math.exp(lc + i * lx + (n - i) * l1)
    }
    return s
  }
  for (let i = 0; i <= n; i++) {
    s += f(i / n) * p
    p *= r * (n - i) / (i + 1)
  }
  return s
}

/* ---------------- 有限域 F_q（q 为素数） ---------------- */

export const mod = (a: number, q: number) => ((a % q) + q) % q

export function inv(a: number, q: number) {
  // 扩展欧几里得
  let [r0, r1, s0, s1] = [mod(a, q), q, 1, 0]
  while (r1 !== 0) {
    const t = Math.floor(r0 / r1);
    [r0, r1] = [r1, r0 - t * r1];
    [s0, s1] = [s1, s0 - t * s1]
  }
  if (r0 !== 1) throw new Error('not invertible')
  return mod(s0, q)
}

// 多项式用系数数组表示，下标 = 次数
export function pEval(c: number[], x: number, q: number) {
  let v = 0
  for (let i = c.length - 1; i >= 0; i--) v = mod(v * x + c[i], q)
  return v
}

export function pTrim(c: number[]) {
  const a = c.slice()
  while (a.length > 1 && a[a.length - 1] === 0) a.pop()
  return a
}

export function pMul(a: number[], b: number[], q: number) {
  const c = new Array(a.length + b.length - 1).fill(0)
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++) c[i + j] = mod(c[i + j] + a[i] * b[j], q)
  return c
}

// 带余除法 a = quo·b + rem
export function pDivMod(a: number[], b: number[], q: number) {
  const B = pTrim(b), r = pTrim(a).slice()
  const db = B.length - 1, lead = inv(B[db], q)
  if (r.length - 1 < db) return { quo: [0], rem: pTrim(r) }
  const quo = new Array(r.length - db).fill(0)
  for (let i = r.length - 1; i >= db; i--) {
    const t = mod(r[i] * lead, q)
    quo[i - db] = t
    if (t) for (let j = 0; j <= db; j++) r[i - db + j] = mod(r[i - db + j] - t * B[j], q)
  }
  return { quo: pTrim(quo), rem: pTrim(r.slice(0, Math.max(db, 1))) }
}

// 有限域上的拉格朗日插值：返回次数 < 点数 的多项式系数
export function interpMod(xs: number[], ys: number[], q: number) {
  const n = xs.length
  let res = new Array(n).fill(0)
  for (let k = 0; k < n; k++) {
    let num = [1], den = 1
    for (let j = 0; j < n; j++) if (j !== k) {
      num = pMul(num, [mod(-xs[j], q), 1], q)
      den = mod(den * (xs[k] - xs[j]), q)
    }
    const s = mod(ys[k] * inv(den, q), q)
    res = res.map((v, i) => mod(v + s * (num[i] ?? 0), q))
  }
  return res
}

// 只求 P(0)：s = Σ y_k ∏_{j≠k} x_j/(x_j − x_k)
export function interpAtZero(xs: number[], ys: number[], q: number) {
  let s = 0
  for (let k = 0; k < xs.length; k++) {
    let num = 1, den = 1
    for (let j = 0; j < xs.length; j++) if (j !== k) {
      num = mod(num * xs[j], q)
      den = mod(den * (xs[j] - xs[k]), q)
    }
    s = mod(s + ys[k] * num % q * inv(den, q), q)
  }
  return s
}

// 齐次线性方程组 M v = 0（mod q）的一个非零解；无非零解返回 null
export function nullVector(M: number[][], q: number) {
  const A = M.map(r => r.map(v => mod(v, q)))
  const rows = A.length, cols = A[0].length
  const pivCol: number[] = []
  let r = 0
  for (let c = 0; c < cols && r < rows; c++) {
    let p = -1
    for (let i = r; i < rows; i++) if (A[i][c]) { p = i; break }
    if (p < 0) continue;
    [A[r], A[p]] = [A[p], A[r]]
    const iv = inv(A[r][c], q)
    A[r] = A[r].map(v => mod(v * iv, q))
    for (let i = 0; i < rows; i++) if (i !== r && A[i][c]) {
      const t = A[i][c]
      A[i] = A[i].map((v, j) => mod(v - t * A[r][j], q))
    }
    pivCol.push(c); r++
  }
  const free = []
  for (let c = 0; c < cols; c++) if (!pivCol.includes(c)) free.push(c)
  if (!free.length) return null
  // 取最后一个自由变量 = 1，其余自由变量 = 0
  const v = new Array(cols).fill(0)
  const f = free[free.length - 1]
  v[f] = 1
  pivCol.forEach((c, i) => { v[c] = mod(-A[i][f], q) })
  return v
}

// Berlekamp–Welch：已知消息长度 n、最多 k 个错误，收到 r_1..r_N（N = n + 2k）
export function berlekampWelch(alphas: number[], rs: number[], n: number, k: number, q: number) {
  const nQ = n + k, nE = k + 1
  // 未知量 [Q_0..Q_{n+k−1}, E_0..E_k]；方程 Q(α_i) − r_i E(α_i) = 0
  const M = alphas.map((a, i) => {
    const row: number[] = []
    let pw = 1
    for (let j = 0; j < nQ; j++) { row.push(pw); pw = mod(pw * a, q) }
    pw = 1
    for (let j = 0; j < nE; j++) { row.push(mod(-rs[i] * pw, q)); pw = mod(pw * a, q) }
    return row
  })
  const v = nullVector(M, q)
  if (!v) return null
  const Q = pTrim(v.slice(0, nQ)), E = pTrim(v.slice(nQ))
  const { quo, rem } = pDivMod(Q, E, q)
  const ok = rem.every(x => x === 0) && quo.length <= n
  return { Q, E, p: quo, ok, unknowns: nQ + nE, equations: alphas.length }
}

// 穷举解码：枚举 n 点子集，插值后数与接收值一致的个数，找一致数 ≥ N − k 的多项式
export function bruteDecode(alphas: number[], rs: number[], n: number, k: number, q: number) {
  const N = alphas.length
  let tried = 0
  const idx = Array.from({ length: n }, (_, i) => i)
  while (true) {
    tried++
    const p = interpMod(idx.map(i => alphas[i]), idx.map(i => rs[i]), q)
    let agree = 0
    for (let i = 0; i < N; i++) if (pEval(p, alphas[i], q) === rs[i]) agree++
    if (agree >= N - k) return { p: pTrim(p), tried, subset: idx.slice() }
    // 下一个组合
    let i = n - 1
    while (i >= 0 && idx[i] === N - n + i) i--
    if (i < 0) break
    idx[i]++
    for (let j = i + 1; j < n; j++) idx[j] = idx[j - 1] + 1
  }
  return { p: null, tried, subset: null }
}

export function binom(n: number, k: number) {
  let r = 1
  for (let i = 1; i <= k; i++) r = r * (n - k + i) / i
  return Math.round(r)
}

// 多项式的可读形式（系数 mod q），如 "3 + 5x + x²"
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹'
const sup = (k: number) => String(k).split('').map(d => SUP[+d]).join('')
export function polyStr(c: number[], v = 'x') {
  const t: string[] = []
  c.forEach((a, i) => {
    if (!a) return
    const coef = i > 0 && a === 1 ? '' : String(a)
    t.push(i === 0 ? String(a) : `${coef}${v}${i > 1 ? sup(i) : ''}`)
  })
  return t.length ? t.join(' + ') : '0'
}

// 实系数多项式的可读形式（保留若干位小数）
export function realPolyStr(c: number[], d = 3) {
  const t: string[] = []
  c.forEach((a, i) => {
    const r = Number(a.toFixed(d))
    if (Math.abs(r) < 10 ** -d) return
    const s = Math.abs(r)
    const body = i === 0 ? String(s) : `${s === 1 ? '' : s}x${i > 1 ? sup(i) : ''}`
    t.push((r < 0 ? '− ' : t.length ? '+ ' : '') + body)
  })
  return t.length ? t.join(' ') : '0'
}

// 可复现的伪随机数（mulberry32）
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
