// 第 03 讲：Chebyshev 节点与多项式、插值误差因子、Lebesgue 函数、Bernstein 多项式、p-范数

export type Fn = (x: number) => number

// [-1,1] 上 n 个等距节点（含端点）
export function equiNodes(n: number) {
  if (n === 1) return [0]
  return Array.from({ length: n }, (_, i) => -1 + 2 * i / (n - 1))
}

// n 个 Chebyshev 节点 x_i = cos((2i-1)π/(2n))，i = 1..n（从大到小）
export function chebNodes(n: number) {
  return Array.from({ length: n }, (_, i) => Math.cos((2 * i + 1) * Math.PI / (2 * n)))
}

// T_n 的 n+1 个极值点 y_k = cos(kπ/n)
export function chebExtrema(n: number) {
  return Array.from({ length: n + 1 }, (_, k) => Math.cos(k * Math.PI / n))
}

// 用三项递推 T_{n+1} = 2x T_n − T_{n−1} 求值（对任意实数 x 都成立）
export function chebT(n: number, x: number) {
  if (n === 0) return 1
  let a = 1, b = x
  for (let k = 1; k < n; k++) { const c = 2 * x * b - a; a = b; b = c }
  return b
}

// T_0..T_n 在单项式基下的系数：coef[k][j] = [x^j] T_k
export function chebCoefs(n: number) {
  const out: number[][] = [[1], [0, 1]]
  for (let k = 1; k < n; k++) {
    const a = out[k - 1], b = out[k], c = new Array(k + 2).fill(0)
    for (let j = 0; j < b.length; j++) c[j + 1] += 2 * b[j]
    for (let j = 0; j < a.length; j++) c[j] -= a[j]
    out.push(c)
  }
  return out.slice(0, n + 1)
}

// 节点因子 ω(x) = ∏(x − x_j)
export function omega(nodes: number[], x: number) {
  let p = 1
  for (const t of nodes) p *= x - t
  return p
}

// 重心公式（第二型）求插值多项式的值：数值上稳定，节点任意
export function baryWeights(nodes: number[]) {
  return nodes.map((xj, j) => {
    let w = 1
    for (let k = 0; k < nodes.length; k++) if (k !== j) w *= xj - nodes[k]
    return 1 / w
  })
}
export function interp(nodes: number[], ys: number[], w: number[], x: number) {
  let num = 0, den = 0
  for (let j = 0; j < nodes.length; j++) {
    const d = x - nodes[j]
    if (d === 0) return ys[j]
    const t = w[j] / d
    num += t * ys[j]; den += t
  }
  return num / den
}

// Lebesgue 函数 λ(x) = Σ_j |ℓ_j(x)|
export function lebesgueFn(nodes: number[], x: number) {
  let s = 0
  for (let j = 0; j < nodes.length; j++) {
    let l = 1
    for (let k = 0; k < nodes.length; k++) if (k !== j) l *= (x - nodes[k]) / (nodes[j] - nodes[k])
    s += Math.abs(l)
  }
  return s
}

// 在 [a,b] 上密集采样求 max |g|（返回最大值与位置）
export function supNorm(g: Fn, a = -1, b = 1, m = 4000) {
  let best = 0, at = a
  for (let i = 0; i <= m; i++) {
    const x = a + (b - a) * i / m, v = Math.abs(g(x))
    if (v > best) { best = v; at = x }
  }
  return { max: best, at }
}

// Bernstein 多项式 B_n f(x) = Σ f(k/n) C(n,k) x^k (1−x)^{n−k}，x ∈ [0,1]
// 用对数算二项分布的概率质量，n 到几百也不溢出
export function bernstein(f: Fn, n: number, x: number) {
  if (x <= 0) return f(0)
  if (x >= 1) return f(1)
  const lx = Math.log(x), l1 = Math.log(1 - x)
  let s = 0, lc = 0 // lc = log C(n,k)
  for (let k = 0; k <= n; k++) {
    if (k > 0) lc += Math.log((n - k + 1) / k)
    s += f(k / n) * Math.exp(lc + k * lx + (n - k) * l1)
  }
  return s
}

// 向量的 p-范数；p = Infinity 时为最大绝对值。先除以最大分量防止溢出（第 01 讲 1.3.2 的技巧）
export function pNorm(v: number[], p: number) {
  const m = Math.max(...v.map(Math.abs))
  if (m === 0) return 0
  if (!Number.isFinite(p)) return m
  return m * v.reduce((s, t) => s + Math.abs(t / m) ** p, 0) ** (1 / p)
}
