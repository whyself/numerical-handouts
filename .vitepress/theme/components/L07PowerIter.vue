<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { powerIteration, eigSym, sinToLine, type Mat } from '../lib/l07'
import { makeScale, sci } from '../lib/plot'

// 归一化幂迭代的二维动画：x_k 在单位圆上一步步转向主特征向量 v₁ 所在的直线
const CASES: { name: string; A: Mat; note: string }[] = [
  { name: '(2 1; 1 2)：λ = 3, 1', A: [[2, 1], [1, 2]], note: '|λ₂/λ₁| = 1/3，几步就转过去了。' },
  { name: '(2 0.2; 0.2 1.8)：比值接近 1', A: [[2, 0.2], [0.2, 1.8]], note: '两个特征值很接近，|λ₂/λ₁| ≈ 0.79，转得很慢。' },
  { name: '(−2 1; 1 −2)：λ = −3, −1', A: [[-2, 1], [1, -2]], note: '主特征值为负：x_k 每步翻转符号，但所在的直线照样收敛。' },
  { name: 'diag(2, −2)：绝对值并列', A: [[2, 0], [0, -2]], note: '|λ₁| = |λ₂|：没有占优方向，x_k 在两个方向之间来回跳（课件 P28 例 2）。' }
]
const ci = ref(0)
const c = computed(() => CASES[ci.value])
const theta = ref(100)
const shown = ref(0)
const perp = ref(false)
watch([ci, theta, perp], () => { shown.value = 0 })
watch(ci, () => { perp.value = false })

const eig = computed(() => eigSym(c.value.A))
// 按绝对值排序：v1 对应 |λ| 最大
const order = computed(() => [0, 1].sort((i, j) => Math.abs(eig.value.values[j]) - Math.abs(eig.value.values[i])))
const l1 = computed(() => eig.value.values[order.value[0]])
const l2 = computed(() => eig.value.values[order.value[1]])
const v1 = computed(() => eig.value.vectors[order.value[0]])
const v2 = computed(() => eig.value.vectors[order.value[1]])
const x0 = computed(() => perp.value ? v2.value.slice() : [Math.cos(theta.value * Math.PI / 180), Math.sin(theta.value * Math.PI / 180)])
const run = computed(() => powerIteration(c.value.A, x0.value, 80))
function setPerp() { perp.value = true }

const W = 340
const sx = makeScale(-1.35, 1.35, 6, W - 6), sy = makeScale(-1.35, 1.35, W - 6, 6)
const cur = computed(() => Math.min(shown.value, run.value.xs.length - 1))
const trail = computed(() => run.value.xs.slice(0, cur.value + 1))
const arrow = (v: number[], s = 1) => {
  const X = sx(v[0] * s), Y = sy(v[1] * s), O = sx(0)
  const L = Math.hypot(X - O, Y - O) || 1, ux = (X - O) / L, uy = (Y - O) / L
  return `M${O},${O}L${X},${Y}M${X - 9 * ux + 4.5 * uy},${Y - 9 * uy - 4.5 * ux}L${X},${Y}L${X - 9 * ux - 4.5 * uy},${Y - 9 * uy + 4.5 * ux}`
}
const rows = computed(() => run.value.xs.slice(0, cur.value + 1).map((x, k) => {
  const s = sinToLine(x, v1.value), sp = k ? sinToLine(run.value.xs[k - 1], v1.value) : NaN
  return { k, x, mu: run.value.mus[k], s, ratio: k && sp > 1e-300 ? s / sp : NaN, mErr: Math.abs(run.value.mus[k] - l1.value) }
}).slice(-8))

let timer: ReturnType<typeof setInterval> | undefined
function play() {
  clearInterval(timer); shown.value = 0
  timer = setInterval(() => { if (shown.value >= Math.min(60, run.value.xs.length - 1)) clearInterval(timer); else shown.value++ }, 380)
}
onBeforeUnmount(() => clearInterval(timer))
const f4 = (v: number) => (Math.abs(v) < 5e-13 ? 0 : v).toFixed(4)
</script>

<template>
  <Widget title="幂迭代：向量一步步转向主特征向量">
    <div class="ctrl">
      <select v-model.number="ci"><option v-for="(cc, i) in CASES" :key="i" :value="i">{{ cc.name }}</option></select>
    </div>
    <div class="ctrl">
      <label>初值方向 θ₀ = <b>{{ perp ? 'x₀ = v₂' : theta + '°' }}</b><input v-model.number="theta" type="range" min="0" max="359" step="1" @input="perp = false"></label>
      <button class="btn" :class="{ primary: perp }" @click="setPerp">取 x₀ = v₂（α₁ = 0）</button>
    </div>
    <div class="ctrl">
      <button class="btn" @click="shown = Math.max(0, shown - 1)">◂</button>
      <button class="btn primary" @click="shown = Math.min(shown + 1, run.xs.length - 1)">迭代一次 ▸</button>
      <button class="btn" @click="play">▶ 自动播放</button>
      <button class="btn" @click="shown = 0">⟲</button>
    </div>
    <div class="two-col" style="display:grid;grid-template-columns:minmax(0,0.8fr) minmax(0,1.2fr);gap:14px;align-items:start">
      <svg :viewBox="`0 0 ${W} ${W}`" style="width:100%;height:auto">
        <circle :cx="sx(0)" :cy="sy(0)" :r="sx(1) - sx(0)" style="fill:none;stroke:var(--line)" />
        <line :x1="sx(-1.35 * v1[0])" :y1="sy(-1.35 * v1[1])" :x2="sx(1.35 * v1[0])" :y2="sy(1.35 * v1[1])" style="stroke:var(--ex);stroke-width:2" stroke-dasharray="7 4" />
        <line :x1="sx(-1.35 * v2[0])" :y1="sy(-1.35 * v2[1])" :x2="sx(1.35 * v2[0])" :y2="sy(1.35 * v2[1])" style="stroke:var(--ink-3)" stroke-dasharray="3 4" />
        <text :x="sx(1.12 * v1[0]) + 4" :y="sy(1.12 * v1[1]) - 4" font-size="12" style="fill:var(--ex);font-weight:700">v₁</text>
        <text :x="sx(1.12 * v2[0]) + 4" :y="sy(1.12 * v2[1]) - 4" font-size="12" style="fill:var(--ink-3)">v₂</text>
        <circle v-for="(x, k) in trail" :key="k" :cx="sx(x[0])" :cy="sy(x[1])" r="4" :style="{ fill: 'var(--accent)', fillOpacity: 0.15 + 0.85 * (k + 1) / trail.length }" />
        <path :d="arrow(trail[trail.length - 1])" style="fill:none;stroke:var(--accent);stroke-width:2.5" />
        <text :x="sx(trail[trail.length - 1][0] * 1.18)" :y="sy(trail[trail.length - 1][1] * 1.18) + 4" font-size="13" text-anchor="middle" style="fill:var(--accent);font-weight:700">x{{ cur }}</text>
      </svg>
      <div>
        <div class="stats">
          <div class="stat"><b>{{ f4(l1) }}</b><span>λ₁（|λ| 最大）</span></div>
          <div class="stat"><b>{{ Math.abs(l2 / l1).toFixed(4) }}</b><span>|λ₂/λ₁|</span></div>
        </div>
        <table class="mini-table" style="font-variant-numeric:tabular-nums">
          <thead><tr><th>k</th><th>x<sub>k</sub></th><th>sin∠(x<sub>k</sub>, v₁)</th><th>比值</th><th>R<sub>A</sub>(x<sub>k</sub>)</th></tr></thead>
          <tbody>
            <tr v-for="r in rows" :key="r.k" :class="{ best: r.k === cur }">
              <td>{{ r.k }}</td><td>({{ f4(r.x[0]) }}, {{ f4(r.x[1]) }})</td><td>{{ sci(r.s) }}</td>
              <td>{{ Number.isNaN(r.ratio) ? '—' : r.ratio.toFixed(4) }}</td><td>{{ f4(r.mu) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="widget-note" style="margin-top:8px"><b>{{ c.note }}</b></p>
    <p class="widget-note">“比值”一列是相邻两步与 v₁ 夹角正弦之比，稳定后约等于 |λ₂/λ₁|（二维时 tan 之比恰好等于它）。点“取 x₀ = v₂”让 α₁ = 0：x<sub>k</sub> 永远停在 v₂ 上，Rayleigh 商给出的是 λ₂ 而不是 λ₁（课件 P28）。再把 θ₀ 从这个方向拖开哪怕 1°，α₁ 就不再是 0，多点几次迭代，向量仍会被“拉”到 v₁——只是起步的 α₁ 越小，需要的步数越多。</p>
  </Widget>
</template>
