// 坐标图通用工具：线性坐标变换、函数折线、数字格式化

// 把区间 [d0, d1] 线性映射到 [r0, r1]（SVG 的 y 轴向下，传 r0 > r1 即可翻转）
export function makeScale(d0: number, d1: number, r0: number, r1: number) {
  const k = (r1 - r0) / (d1 - d0)
  const s = (v: number) => r0 + (v - d0) * k
  s.inv = (p: number) => d0 + (p - r0) / k
  return s
}

// 把 y = f(x) 画成 SVG path；遇到非有限值或超出 yLim 时断开
export function pathOf(
  f: (x: number) => number, x0: number, x1: number,
  sx: (x: number) => number, sy: (y: number) => number,
  yLim: [number, number] = [-Infinity, Infinity], n = 300
) {
  let d = '', pen = false
  for (let i = 0; i <= n; i++) {
    const x = x0 + (x1 - x0) * i / n, y = f(x)
    if (!Number.isFinite(y) || y < yLim[0] || y > yLim[1]) { pen = false; continue }
    d += `${pen ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`
    pen = true
  }
  return d
}

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }

// 科学计数法：2.12×10⁻⁶；0 显示为 0
export function sci(v: number, digits = 2) {
  if (v === 0) return '0'
  if (!Number.isFinite(v)) return String(v)
  const [m, e] = v.toExponential(digits).split('e')
  const ex = Number(e)
  if (ex >= -2 && ex <= 3) return Number(v.toPrecision(digits + 1)).toString()
  return `${m}×10${String(ex).replace(/./g, c => SUP[c] ?? c)}`
}

// 定点小数，去掉末尾多余的 0
export const fix = (v: number, d = 10) => Number.isFinite(v) ? Number(v.toFixed(d)).toString() : String(v)
