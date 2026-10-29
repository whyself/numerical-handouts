<script setup lang="ts">
import { ref, computed } from 'vue'
import { svd, lsqNormal, lsqQR, lsqSVD, type Mat } from '../lib/l08'
import { makeScale, sci } from '../lib/plot'

// 多项式拟合的最小二乘：正规方程 vs QR vs SVD 伪逆。真解已知（全 1），看相对误差与 κ(A)、κ(A)² 的关系
const M = 40
const NMAX = 13
const u = 2 ** -53
function vander(n: number): Mat {
  return Array.from({ length: M }, (_, i) => Array.from({ length: n }, (_, j) => (i / (M - 1)) ** j))
}
const rows = computed(() => {
  const out = []
  for (let n = 2; n <= NMAX; n++) {
    const A = vander(n), x = new Array(n).fill(1)
    const b = A.map(r => r.reduce((a, v) => a + v, 0)) // b = A·1，相容方程，误差只来自舍入
    const err = (y: number[] | null) => (y ? Math.sqrt(y.reduce((a, v) => a + (v - 1) ** 2, 0) / n) : NaN)
    const s = svd(A).s
    out.push({ n, kappa: s[0] / s[n - 1], ne: err(lsqNormal(A, b)), qr: err(lsqQR(A, b)), sv: err(lsqSVD(A, b)) })
  }
  return out
})
const n = ref(8)
const cur = computed(() => rows.value.find(r => r.n === n.value)!)

const W = 640, H = 280
const sx = makeScale(2, NMAX, 50, W - 120)
const sy = makeScale(-17, 2, H - 24, 10)
const lg = (v: number) => Math.max(-17, Math.min(2, Math.log10(v)))
const line = (key: 'ne' | 'qr' | 'sv' | 'k1' | 'k2') => {
  let d = '', pen = false
  for (const r of rows.value) {
    const v = key === 'k1' ? r.kappa * u : key === 'k2' ? r.kappa ** 2 * u : r[key]
    if (!Number.isFinite(v) || v <= 0) { pen = false; continue }
    d += `${pen ? 'L' : 'M'}${sx(r.n).toFixed(1)},${sy(lg(v)).toFixed(1)}`; pen = true
  }
  return d
}
const SERIES = [
  { key: 'ne' as const, name: '正规方程 + Cholesky', st: 'stroke:var(--warn);stroke-width:2.5' },
  { key: 'qr' as const, name: 'Householder QR', st: 'stroke:var(--ex);stroke-width:2.5' },
  { key: 'sv' as const, name: 'SVD 伪逆', st: 'stroke:var(--prin);stroke-width:2.5' },
  { key: 'k2' as const, name: 'κ(A)²·u', st: 'stroke:var(--warn);stroke-dasharray:5 4' },
  { key: 'k1' as const, name: 'κ(A)·u', st: 'stroke:var(--ink-3);stroke-dasharray:5 4' }
]
</script>

<template>
  <Widget title="为什么不直接解正规方程：条件数被平方">
    <div class="ctrl">
      <label>多项式项数 n = <b>{{ n }}</b>（次数 {{ n - 1 }}）<input v-model.number="n" type="range" min="2" :max="NMAX" step="1"></label>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
      <g v-for="e in [0, -4, -8, -12, -16]" :key="e">
        <line :x1="sx(2)" :x2="sx(NMAX)" :y1="sy(e)" :y2="sy(e)" style="stroke:var(--line)" />
        <text :x="sx(2) - 6" :y="sy(e) + 4" font-size="11" text-anchor="end" style="fill:var(--ink-3)">1e{{ e }}</text>
      </g>
      <text v-for="r in rows" :key="r.n" :x="sx(r.n)" :y="H - 6" font-size="11" text-anchor="middle" style="fill:var(--ink-3)">{{ r.n }}</text>
      <line :x1="sx(n)" :x2="sx(n)" :y1="10" :y2="H - 24" style="stroke:var(--accent);stroke-opacity:.5" />
      <path v-for="s in SERIES" :key="s.key" :d="line(s.key)" :style="'fill:none;' + s.st" />
      <g v-for="(s, i) in SERIES" :key="'l' + s.key">
        <line :x1="W - 112" :x2="W - 90" :y1="22 + 18 * i" :y2="22 + 18 * i" :style="s.st" />
        <text :x="W - 86" :y="26 + 18 * i" font-size="11" style="fill:var(--ink-2)">{{ s.name }}</text>
      </g>
    </svg>
    <div class="stats">
      <div class="stat"><b>{{ sci(cur.kappa) }}</b><span>κ₂(A) = σ₁/σₙ</span></div>
      <div class="stat"><b>{{ sci(cur.kappa ** 2) }}</b><span>κ₂(AᵀA) = κ₂(A)²</span></div>
      <div class="stat"><b>{{ Number.isNaN(cur.ne) ? 'Cholesky 失败' : sci(cur.ne) }}</b><span>正规方程的误差</span></div>
      <div class="stat"><b>{{ sci(cur.qr) }}</b><span>QR 的误差</span></div>
      <div class="stat"><b>{{ sci(cur.sv) }}</b><span>SVD 的误差</span></div>
    </div>
    <p class="widget-note">在 [0, 1] 上取 {{ M }} 个等距点，用单项式基 1, t, …, t<sup>n−1</sup> 拟合；右端 b = A·(1, …, 1)ᵀ，所以真解已知、残差为 0，误差全部来自舍入与条件数。正规方程的误差沿着 κ(A)²·u 的虚线增长，QR 与 SVD 沿着 κ(A)·u 增长（u = 2⁻⁵³）；n 大到 κ(A)² 超过 1/u 时，AᵀA 在浮点意义下已不再正定，Cholesky 直接失败。</p>
  </Widget>
</template>
