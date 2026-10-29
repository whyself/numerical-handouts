<script setup lang="ts">
import { ref, computed } from 'vue'
import { equiNodes, chebNodes, baryWeights, interp, supNorm, type Fn } from '../lib/l03'
import { makeScale, pathOf, sci } from '../lib/plot'

// Runge 现象：同样 n 个节点，等距 vs Chebyshev，插值多项式次数 n − 1
interface Case { name: string; f: Fn; ylo: number; yhi: number }
const CASES: Case[] = [
  { name: 'Runge 函数 1/(1 + 25x²)', f: x => 1 / (1 + 25 * x * x), ylo: -0.6, yhi: 1.6 },
  { name: '|x|（不光滑）', f: x => Math.abs(x), ylo: -0.6, yhi: 1.6 },
  { name: 'eˣ（非常光滑）', f: x => Math.exp(x), ylo: -0.2, yhi: 3.2 }
]
const ci = ref(0)
const c = computed(() => CASES[ci.value])
const n = ref(11)

function build(nodes: number[]) {
  const ys = nodes.map(c.value.f), w = baryWeights(nodes)
  const p = (x: number) => interp(nodes, ys, w, x)
  const err = supNorm(x => c.value.f(x) - p(x))
  return { nodes, ys, p, err }
}
const eq = computed(() => build(equiNodes(n.value)))
const ch = computed(() => build(chebNodes(n.value)))

const W = 320, H = 220
const sx = makeScale(-1, 1, 14, W - 10)
const sy = computed(() => makeScale(c.value.ylo, c.value.yhi, H - 14, 10))
const clip = computed<[number, number]>(() => [c.value.ylo - 0.05, c.value.yhi + 0.05])

// 误差随 n 的变化（对数纵轴）
const NMAX = 40
const curve = computed(() => {
  const out: { n: number; e: number; c: number }[] = []
  for (let k = 2; k <= NMAX; k++) {
    const f = c.value.f
    const err = (nodes: number[]) => {
      const ys = nodes.map(f), w = baryWeights(nodes)
      return supNorm(x => f(x) - interp(nodes, ys, w, x), -1, 1, 1500).max
    }
    out.push({ n: k, e: err(equiNodes(k)), c: err(chebNodes(k)) })
  }
  return out
})
const CW = 640, CH = 200
const cx = makeScale(2, NMAX, 44, CW - 12)
const cy = makeScale(-16, 6, CH - 22, 8)
const lg = (v: number) => Math.max(-16, Math.min(6, Math.log10(Math.max(v, 1e-16))))
const line = (key: 'e' | 'c') => curve.value.map((r, i) => `${i ? 'L' : 'M'}${cx(r.n).toFixed(1)},${cy(lg(r[key])).toFixed(1)}`).join('')
</script>

<template>
  <Widget title="Runge 现象：只改节点位置，误差差几个数量级">
    <div class="ctrl">
      <select v-model.number="ci"><option v-for="(cc, i) in CASES" :key="i" :value="i">{{ cc.name }}</option></select>
      <label>节点数 n = <b>{{ n }}</b>（插值多项式次数 {{ n - 1 }}）<input v-model.number="n" type="range" min="2" max="30" step="1"></label>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px">
      <div v-for="(d, k) in [eq, ch]" :key="k">
        <div style="text-align:center;font-weight:650;font-size:14px">{{ n }} 个{{ k ? ' Chebyshev ' : '等距' }}节点</div>
        <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
          <line :x1="sx(-1)" :x2="sx(1)" :y1="sy(0)" :y2="sy(0)" style="stroke:var(--ink-3)" />
          <line :x1="sx(0)" :x2="sx(0)" :y1="sy(c.ylo)" :y2="sy(c.yhi)" style="stroke:var(--line)" />
          <path :d="pathOf(c.f, -1, 1, sx, sy, clip)" style="fill:none;stroke:var(--ink-3);stroke-width:1.5" />
          <path :d="pathOf(d.p, -1, 1, sx, sy, clip, 600)" :style="`fill:none;stroke:var(${k ? '--ex' : '--warn'});stroke-width:2.2`" />
          <circle v-for="(x, j) in d.nodes" :key="j" :cx="sx(x)" :cy="sy(d.ys[j])" r="3.5" style="fill:var(--accent)" />
          <text :x="sx(-1)" :y="H - 1" font-size="11" style="fill:var(--ink-3)">−1</text>
          <text :x="sx(1)" :y="H - 1" font-size="11" text-anchor="end" style="fill:var(--ink-3)">1</text>
        </svg>
        <div style="text-align:center;font-size:14px" :style="`color:var(${k ? '--ex' : '--warn'})`">max |f − p<sub>{{ n - 1 }}</sub>| ≈ <b>{{ sci(d.err.max, 3) }}</b></div>
      </div>
    </div>
    <p class="widget-note" style="margin-top:10px">下图：最大误差（对数纵轴）随节点数 n 的变化，<span style="color:var(--warn)">红 = 等距</span>，<span style="color:var(--ex)">绿 = Chebyshev</span>，竖线是当前 n。</p>
    <svg :viewBox="`0 0 ${CW} ${CH}`" style="width:100%;height:auto">
      <template v-for="t in [-15, -10, -5, 0, 5]" :key="t">
        <line :x1="cx(2)" :x2="cx(NMAX)" :y1="cy(t)" :y2="cy(t)" style="stroke:var(--line-2)" />
        <text :x="cx(2) - 6" :y="cy(t) + 4" font-size="11" text-anchor="end" style="fill:var(--ink-3)">10<tspan dy="-5" font-size="9">{{ t }}</tspan></text>
      </template>
      <line :x1="cx(n)" :x2="cx(n)" :y1="cy(6)" :y2="cy(-16)" style="stroke:var(--accent)" stroke-dasharray="3 3" />
      <path :d="line('e')" style="fill:none;stroke:var(--warn);stroke-width:2" />
      <path :d="line('c')" style="fill:none;stroke:var(--ex);stroke-width:2" />
      <text v-for="t in [2, 10, 20, 30, 40]" :key="t" :x="cx(t)" :y="CH - 6" font-size="11" text-anchor="middle" style="fill:var(--ink-3)">{{ t }}</text>
    </svg>
    <p class="widget-note">n = 11 的 Runge 函数正是课件 P19 的例子（1.92 对 0.11）。等距节点的误差随 n 增大反而爆炸；Chebyshev 节点的误差稳定下降。|x| 不光滑，Chebyshev 插值也只能慢慢收敛；eˣ 很光滑，两种节点在 n 不大时都很好，但 n 再大时等距节点的插值对舍入误差极其敏感（其 Lebesgue 常数指数增长，见 3.12 节），误差又会回升。</p>
  </Widget>
</template>
