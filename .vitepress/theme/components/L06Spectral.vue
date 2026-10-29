<script setup lang="ts">
import { ref, computed } from 'vue'
import { eig2, svd2, powerNorms, mv, type Mat2, type Vec2 } from '../lib/l06'
import { makeScale, sci } from '../lib/plot'

// A^k → 0 当且仅当 ρ(A) < 1；但 ‖A‖ 可以大于 1，‖A^k‖ 先变大、后衰减
const r = (t: number, s: number): Mat2 => [s * Math.cos(t), -s * Math.sin(t), s * Math.sin(t), s * Math.cos(t)]
const PRESETS: { name: string; M: Mat2 }[] = [
  { name: '对角 diag(0.9, 0.5)', M: [0.9, 0, 0, 0.5] },
  { name: '非正规 [[0.9, 4], [0, 0.8]]：‖M‖ > 1 但 ρ < 1', M: [0.9, 4, 0, 0.8] },
  { name: 'Jordan 块 [[0.9, 1], [0, 0.9]]（不可对角化）', M: [0.9, 1, 0, 0.9] },
  { name: '0.95 × 旋转 30°（复特征值）', M: r(Math.PI / 6, 0.95) },
  { name: 'P15 的 Jacobi 矩阵 [[0, −1/3], [−1/2, 0]]', M: [0, -1 / 3, -1 / 2, 0] },
  { name: 'P16 的 Jacobi 矩阵 [[0, −2], [−3, 0]]', M: [0, -2, -3, 0] },
  { name: 'diag(1.02, 0.3)：ρ 略大于 1', M: [1.02, 0, 0, 0.3] }
]
const pi = ref(1)
const M = computed(() => PRESETS[pi.value].M)
const K = 80
const norms = computed(() => powerNorms(M.value, K))
const ev = computed(() => eig2(M.value))
const rho = computed(() => ev.value.rho)
const n1 = computed(() => svd2(M.value).s1)
const peak = computed(() => norms.value.reduce((m, v, k) => v > m.v ? { v, k } : m, { v: 0, k: 0 }))
const hit = computed(() => norms.value.findIndex(v => v < 1e-6))

// 一条轨迹 x_k = M^k x_0（误差向量 e_k 的演化）
const traj = computed(() => {
  const out: Vec2[] = [[0, 1]]
  for (let k = 0; k < 40; k++) out.push(mv(M.value, out[k]))
  return out
})

const W = 640, H = 270
const LO = -8, HI = 3
const sx = makeScale(0, K, 46, W - 14)
const sy = makeScale(HI, LO, 12, H - 28)
const yOf = (v: number) => sy(Math.min(HI, Math.max(LO, Math.log10(Math.max(v, 1e-300)))))
const curve = (f: (k: number) => number) => Array.from({ length: K + 1 }, (_, k) => `${k ? 'L' : 'M'}${sx(k).toFixed(1)},${yOf(f(k)).toFixed(1)}`).join('')
const evText = computed(() => ev.value.real
  ? `λ = ${ev.value.re.map(v => Number(v.toFixed(4))).join(', ')}`
  : `λ = ${ev.value.re[0].toFixed(4)} ± ${ev.value.im[0].toFixed(4)}i`)

const S = 220
const tr = computed(() => {
  const m = Math.max(1.2, ...traj.value.slice(0, 25).map(p => Math.max(Math.abs(p[0]), Math.abs(p[1]))))
  return { sx: makeScale(-m, m, 6, S - 6), sy: makeScale(-m, m, S - 6, 6) }
})
</script>

<template>
  <Widget title="谱半径：Mᵏ 什么时候趋于 0">
    <div class="ctrl">
      <select v-model.number="pi"><option v-for="(c, i) in PRESETS" :key="i" :value="i">{{ c.name }}</option></select>
    </div>
    <div class="stats">
      <div class="stat"><b :class="rho < 1 ? 'ok-c' : 'bad-c'">{{ rho.toFixed(4) }}</b><span>谱半径 ρ(M)</span></div>
      <div class="stat"><b>{{ n1.toFixed(4) }}</b><span>‖M‖₂</span></div>
      <div class="stat"><b>{{ sci(peak.v) }}</b><span>max‖Mᵏ‖₂（在 k = {{ peak.k }}）</span></div>
      <div class="stat"><b>{{ hit < 0 ? `> ${K}` : hit }}</b><span>‖Mᵏ‖₂ &lt; 10⁻⁶ 的 k</span></div>
    </div>
    <p class="widget-note" style="margin-bottom:4px">特征值 {{ evText }}</p>
    <div class="two-col" style="display:grid;grid-template-columns:minmax(0,2.3fr) minmax(0,1fr);gap:14px;align-items:start">
      <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
        <g v-for="p in [3, 0, -4, -8]" :key="p">
          <line :x1="sx(0)" :x2="sx(K)" :y1="sy(p)" :y2="sy(p)" :style="{ stroke: p === 0 ? 'var(--ink-3)' : 'var(--line-2)' }" />
          <text :x="sx(0) - 6" :y="sy(p) + 4" font-size="11" text-anchor="end" style="fill:var(--ink-3)">1e{{ p }}</text>
        </g>
        <g v-for="k in [0, 20, 40, 60, 80]" :key="k">
          <text :x="sx(k)" :y="H - 10" font-size="11" text-anchor="middle" style="fill:var(--ink-3)">{{ k }}</text>
        </g>
        <path :d="curve(k => n1 ** k)" style="fill:none;stroke:var(--ink-3);stroke-width:1.5" stroke-dasharray="6 4" />
        <path :d="curve(k => rho ** k)" style="fill:none;stroke:var(--prin);stroke-width:1.8" stroke-dasharray="3 3" />
        <path :d="curve(k => norms[k])" style="fill:none;stroke:var(--accent);stroke-width:2.4" />
        <text :x="W - 16" y="24" font-size="12" text-anchor="end" style="fill:var(--accent)">‖Mᵏ‖₂</text>
        <text :x="W - 16" y="40" font-size="12" text-anchor="end" style="fill:var(--prin)">ρᵏ</text>
        <text :x="W - 16" y="56" font-size="12" text-anchor="end" style="fill:var(--ink-3)">‖M‖₂ᵏ</text>
      </svg>
      <svg :viewBox="`0 0 ${S} ${S}`" style="width:100%;height:auto;border:1px solid var(--line-2);border-radius:8px">
        <line :x1="tr.sx(-100)" :x2="tr.sx(100)" :y1="tr.sy(0)" :y2="tr.sy(0)" style="stroke:var(--line)" />
        <line :x1="tr.sx(0)" :x2="tr.sx(0)" :y1="tr.sy(-100)" :y2="tr.sy(100)" style="stroke:var(--line)" />
        <polyline :points="traj.slice(0, 25).map(p => `${tr.sx(p[0]).toFixed(1)},${tr.sy(p[1]).toFixed(1)}`).join(' ')" style="fill:none;stroke:var(--accent);stroke-width:1.4" />
        <circle v-for="(p, k) in traj.slice(0, 25)" :key="k" :cx="tr.sx(p[0])" :cy="tr.sy(p[1])" :r="k === 0 ? 4 : 2.4" :style="{ fill: k === 0 ? 'var(--ink)' : 'var(--accent)' }" />
        <text x="10" y="18" font-size="11" style="fill:var(--ink-3)">e₀ = (0, 1)，eₖ = Mᵏe₀</text>
      </svg>
    </div>
    <p class="widget-note">纵轴是对数刻度。‖Mᵏ‖₂ 的长期斜率总是 log ρ（Gelfand 公式 ‖Mᵏ‖<sup>1/k</sup> → ρ）；‖M‖₂ᵏ 只是一个上界。非正规矩阵和 Jordan 块的 ‖Mᵏ‖ 会先涨很多再衰减——ρ &lt; 1 保证最终收敛，但不保证前几步误差变小。复特征值时误差向量一边转圈一边缩小。</p>
  </Widget>
</template>
