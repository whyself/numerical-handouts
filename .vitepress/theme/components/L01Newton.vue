<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { newton, SQRT2, DOTTIE, CUBIC_ROOT, type Fn } from '../lib/l01'
import { makeScale, pathOf, sci, fix } from '../lib/plot'

// 牛顿法逐步动画：画切线、交 x 轴、得到下一个点；表格同时给出线性比与二次比
interface Case { name: string; f: Fn; df: Fn; r: number; x0: number; lo: number; hi: number; ylo: number; yhi: number; mult: number }
const CASES: Case[] = [
  { name: 'f(x) = x² − 2（巴比伦开方）', f: x => x * x - 2, df: x => 2 * x, r: SQRT2, x0: 1, lo: 0.3, hi: 2.8, ylo: -2.5, yhi: 6, mult: 1 },
  { name: 'f(x) = cos x − x', f: x => Math.cos(x) - x, df: x => -Math.sin(x) - 1, r: DOTTIE, x0: 2, lo: -1, hi: 3, ylo: -4, yhi: 2, mult: 1 },
  { name: 'f(x) = x³ − 2x + 2（会进入 2-周期）', f: x => x ** 3 - 2 * x + 2, df: x => 3 * x * x - 2, r: CUBIC_ROOT, x0: 0, lo: -2.5, hi: 2, ylo: -6, yhi: 8, mult: 1 },
  { name: 'f(x) = (x − 1)³（三重根）', f: x => (x - 1) ** 3, df: x => 3 * (x - 1) ** 2, r: 1, x0: 2, lo: 0.2, hi: 2.4, ylo: -1, yhi: 3, mult: 3 }
]
const ci = ref(0)
const c = computed(() => CASES[ci.value])
const x0 = ref(1)
const fixM = ref(false)
const shown = ref(0)
watch(ci, () => { x0.value = c.value.x0; fixM.value = false; shown.value = 0 })
watch([x0, fixM], () => { shown.value = 0 })

const xs = computed(() => newton(c.value.f, c.value.df, x0.value, 30, fixM.value ? c.value.mult : 1))
const W = 640, H = 300
const sx = computed(() => makeScale(c.value.lo, c.value.hi, 30, W - 14))
const sy = computed(() => makeScale(c.value.ylo, c.value.yhi, H - 16, 12))
const cur = computed(() => Math.min(shown.value, xs.value.length - 1))
// 当前一步的切线
const tan = computed(() => {
  const x = xs.value[cur.value], fx = c.value.f(x), d = c.value.df(x)
  const t = (u: number) => fx + d * (u - x)
  return { x, fx, path: pathOf(t, c.value.lo, c.value.hi, sx.value, sy.value, [c.value.ylo, c.value.yhi], 2), next: xs.value[cur.value + 1] }
})
const rows = computed(() => xs.value.slice(0, Math.min(shown.value + 2, xs.value.length, 10)).map((x, k, a) => {
  const e = Math.abs(x - c.value.r), ep = k ? Math.abs(a[k - 1] - c.value.r) : NaN
  return { k, x, e, lin: k && ep > 0 && e > 0 ? e / ep : NaN, quad: k && ep > 0 && e > 0 ? e / (ep * ep) : NaN }
}))
const theory = computed(() => {
  if (c.value.mult > 1) return fixM.value ? '已用重数修正：回到快速收敛' : `重根 m = ${c.value.mult}：eₖ₊₁/eₖ → 1 − 1/m = ${(1 - 1 / c.value.mult).toFixed(3)}，线性收敛`
  const h = 1e-5, r = c.value.r
  const d2 = (c.value.f(r + h) - 2 * c.value.f(r) + c.value.f(r - h)) / (h * h)
  return `简单根：eₖ₊₁/eₖ² → |f″(r)/(2f′(r))| = ${Math.abs(d2 / (2 * c.value.df(r))).toFixed(4)}`
})
</script>

<template>
  <Widget title="牛顿法：切线一步，误差平方">
    <div class="ctrl">
      <select v-model.number="ci"><option v-for="(cc, i) in CASES" :key="i" :value="i">{{ cc.name }}</option></select>
      <label v-if="c.mult > 1"><input v-model="fixM" type="checkbox"> 已知重数，用 x − m·f/f′</label>
    </div>
    <div class="ctrl">
      <label>初值 x₀ = <b>{{ x0.toFixed(2) }}</b><input v-model.number="x0" type="range" :min="c.lo + 0.05" :max="c.hi - 0.05" step="0.01"></label>
      <button class="btn" @click="shown = Math.max(0, shown - 1)">◂</button>
      <button class="btn primary" @click="shown = Math.min(shown + 1, xs.length - 1)">牛顿一步 ▸</button>
      <button class="btn" @click="shown = 0">⟲</button>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
      <line :x1="sx(c.lo)" :x2="sx(c.hi)" :y1="sy(0)" :y2="sy(0)" style="stroke:var(--ink-3)" />
      <path :d="pathOf(c.f, c.lo, c.hi, sx, sy, [c.ylo, c.yhi])" style="fill:none;stroke:var(--prin);stroke-width:2.5" />
      <path :d="tan.path" style="fill:none;stroke:var(--accent);stroke-width:1.8" />
      <line :x1="sx(tan.x)" :x2="sx(tan.x)" :y1="sy(0)" :y2="sy(tan.fx)" style="stroke:var(--ink-3)" stroke-dasharray="3 3" />
      <circle :cx="sx(tan.x)" :cy="sy(tan.fx)" r="5" style="fill:var(--accent)" />
      <text :x="sx(tan.x)" :y="sy(0) + 16" font-size="12" text-anchor="middle" style="fill:var(--ink-2)">x{{ cur }}</text>
      <template v-if="tan.next !== undefined && tan.next > c.lo && tan.next < c.hi">
        <circle :cx="sx(tan.next)" :cy="sy(0)" r="5" style="fill:var(--ex)" />
        <text :x="sx(tan.next)" :y="sy(0) - 9" font-size="12" text-anchor="middle" style="fill:var(--ex);font-weight:700">x{{ cur + 1 }}</text>
      </template>
    </svg>
    <p class="widget-note" style="margin:4px 0 8px"><b>{{ theory }}</b></p>
    <table class="mini-table" style="font-variant-numeric:tabular-nums">
      <thead><tr><th>k</th><th>x<sub>k</sub></th><th>e<sub>k</sub> = |x<sub>k</sub> − r|</th><th>e<sub>k</sub>/e<sub>k−1</sub></th><th>e<sub>k</sub>/e<sub>k−1</sub>²</th></tr></thead>
      <tbody>
        <tr v-for="r in rows" :key="r.k" :class="{ best: r.k === cur }">
          <td>{{ r.k }}</td><td>{{ fix(r.x, 10) }}</td><td>{{ sci(r.e) }}</td>
          <td>{{ Number.isNaN(r.lin) ? '—' : r.lin.toFixed(4) }}</td><td>{{ Number.isNaN(r.quad) ? '—' : r.quad.toFixed(4) }}</td>
        </tr>
      </tbody>
    </table>
    <p class="widget-note">e<sub>k</sub> 显示为 0 表示已经和 r 的双精度值完全相同。二次收敛时倒数第二列趋于 0、最后一列趋于常数；线性收敛时倒数第二列趋于常数。x³ − 2x + 2 从 x₀ = 0 出发会在 0 和 1 之间来回跳；把 x₀ 拖到 −1.5 附近再试。</p>
  </Widget>
</template>
