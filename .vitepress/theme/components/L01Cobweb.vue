<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { fixedPoint, SQRT2, DOTTIE, type Fn } from '../lib/l01'
import { makeScale, pathOf, sci, fix } from '../lib/plot'

// Cobweb 图：竖直走到 y = g(x)，水平走到 y = x，就完成一次 x_{k+1} = g(x_k)
interface Case { name: string; g: Fn; dg: Fn; r: number; x0: number; lo: number; hi: number }
const lam = ref(0.25)
const CASES = computed<Case[]>(() => [
  { name: 'g(x) = cos x', g: Math.cos, dg: x => -Math.sin(x), r: DOTTIE, x0: 1, lo: -0.2, hi: 1.6 },
  { name: 'g₁(x) = 2/x（求 √2）', g: x => 2 / x, dg: x => -2 / (x * x), r: SQRT2, x0: 1, lo: 0.4, hi: 2.6 },
  { name: 'g₂(x) = (x + 2/x)/2（求 √2）', g: x => (x + 2 / x) / 2, dg: x => (1 - 2 / (x * x)) / 2, r: SQRT2, x0: 1, lo: 0.4, hi: 2.6 },
  { name: 'g_λ(x) = x − λ(x² − 2)（求 √2）', g: x => x - lam.value * (x * x - 2), dg: x => 1 - 2 * lam.value * x, r: SQRT2, x0: 1, lo: 0.2, hi: 2.6 },
  { name: 'g(x) = 2x（x = 0 的坏改写）', g: x => 2 * x, dg: () => 2, r: 0, x0: 0.1, lo: -0.4, hi: 2.4 }
])
const ci = ref(0)
const c = computed(() => CASES.value[ci.value])
const x0 = ref(1)
const shown = ref(0)
watch(ci, () => { x0.value = c.value.x0; shown.value = 0 })
watch([x0, lam], () => { shown.value = 0 })

const xs = computed(() => fixedPoint(c.value.g, x0.value, 40))
const W = 360, H = 360
const sx = computed(() => makeScale(c.value.lo, c.value.hi, 30, W - 10))
const sy = computed(() => makeScale(c.value.lo, c.value.hi, H - 30, 10))
// 折线：(x0, x0) → (x0, x1) → (x1, x1) → (x1, x2) …
const web = computed(() => {
  const v = xs.value.slice(0, shown.value + 1), [lo, hi] = [c.value.lo - 5, c.value.hi + 5]
  const cl = (t: number) => Math.min(hi, Math.max(lo, t))
  let d = `M${sx.value(cl(v[0]))},${sy.value(c.value.lo)}`
  for (let k = 0; k + 1 < v.length; k++) {
    d += `L${sx.value(cl(v[k]))},${sy.value(cl(v[k + 1]))}L${sx.value(cl(v[k + 1]))},${sy.value(cl(v[k + 1]))}`
  }
  return d
})
const rows = computed(() => xs.value.slice(0, Math.min(shown.value + 1, 12)).map((x, k, arr) => {
  const e = Math.abs(x - c.value.r), ep = k ? Math.abs(arr[k - 1] - c.value.r) : NaN
  return { k, x, e, ratio: k && ep > 0 ? e / ep : NaN }
}))
const gr = computed(() => Math.abs(c.value.dg(c.value.r)))
const verdict = computed(() => gr.value < 1e-12 ? '|g′(r)| = 0：比线性更快' : gr.value < 1 ? '|g′(r)| < 1：稳定不动点，线性收敛' : gr.value === 1 ? '|g′(r)| = 1：一阶判据失效' : '|g′(r)| > 1：不稳定不动点')
let timer: ReturnType<typeof setInterval> | undefined
function play() {
  clearInterval(timer); shown.value = 0
  timer = setInterval(() => { if (shown.value >= Math.min(xs.value.length - 1, 25)) clearInterval(timer); else shown.value++ }, 450)
}
</script>

<template>
  <Widget title="Cobweb 图：同一个方程，不同的迭代映射 g">
    <div class="ctrl">
      <select v-model.number="ci"><option v-for="(cc, i) in CASES" :key="i" :value="i">{{ cc.name }}</option></select>
      <label v-if="ci === 3">λ = <b>{{ lam.toFixed(2) }}</b><input v-model.number="lam" type="range" min="0.05" max="1.2" step="0.01"></label>
    </div>
    <div class="ctrl">
      <label>初值 x₀ = <b>{{ x0.toFixed(2) }}</b><input v-model.number="x0" type="range" :min="c.lo + 0.05" :max="c.hi - 0.05" step="0.01"></label>
      <button class="btn" @click="shown = Math.max(0, shown - 1)">◂</button>
      <button class="btn primary" @click="shown = Math.min(shown + 1, xs.length - 1)">迭代一次 ▸</button>
      <button class="btn" @click="play">▶ 自动播放</button>
    </div>
    <div class="two-col" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start">
      <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
        <line :x1="sx(c.lo)" :x2="sx(c.hi)" :y1="sy(c.lo)" :y2="sy(c.hi)" style="stroke:var(--ink-3)" stroke-dasharray="5 4" />
        <text :x="sx(c.hi) - 4" :y="sy(c.hi) + 16" font-size="12" text-anchor="end" style="fill:var(--ink-3)">y = x</text>
        <line v-if="c.lo < 0" :x1="sx(c.lo)" :x2="sx(c.hi)" :y1="sy(0)" :y2="sy(0)" style="stroke:var(--line)" />
        <path :d="pathOf(c.g, c.lo, c.hi, sx, sy, [c.lo, c.hi])" style="fill:none;stroke:var(--prin);stroke-width:2.5" />
        <path :d="web" style="fill:none;stroke:var(--accent);stroke-width:1.6" />
        <circle :cx="sx(c.r)" :cy="sy(c.r)" r="4.5" style="fill:var(--ink)" />
        <text :x="sx(c.r) + 8" :y="sy(c.r) + 16" font-size="12" style="fill:var(--ink)">r = {{ fix(c.r, 4) }}</text>
      </svg>
      <div>
        <div class="stats">
          <div class="stat"><b>{{ gr.toFixed(3) }}</b><span>|g′(r)|</span></div>
        </div>
        <p class="widget-note" style="margin-bottom:6px"><b>{{ verdict }}</b></p>
        <table class="mini-table" style="font-variant-numeric:tabular-nums">
          <thead><tr><th>k</th><th>x<sub>k</sub></th><th>e<sub>k</sub></th><th>e<sub>k</sub>/e<sub>k−1</sub></th></tr></thead>
          <tbody>
            <tr v-for="r in rows" :key="r.k"><td>{{ r.k }}</td><td>{{ fix(r.x, 8) }}</td><td>{{ sci(r.e) }}</td><td>{{ Number.isNaN(r.ratio) ? '—' : r.ratio.toFixed(3) }}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="widget-note">看最后一列：线性收敛时 e<sub>k</sub>/e<sub>k−1</sub> 稳定在 |g′(r)| 附近。把 g_λ 的 λ 调到 1/(2√2) ≈ 0.354，g′(r) = 0，收敛立刻变快——这正是牛顿法的设计思路。</p>
  </Widget>
</template>
