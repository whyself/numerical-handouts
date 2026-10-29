<script setup lang="ts">
import { ref, computed } from 'vue'
import { equispaced, chebyshevNodes, baryWeights, baryEval, omega } from '../lib/l02'
import { makeScale, pathOf, sci } from '../lib/plot'

// Runge 现象：等距节点上提高次数，端点附近振荡越来越大；换成 Chebyshev 点（下一讲）则误差下降
const FUNCS = [
  { name: '1/(1 + 25x²)（Runge 函数）', f: (x: number) => 1 / (1 + 25 * x * x) },
  { name: 'eˣ（各阶导数都温和）', f: (x: number) => Math.exp(x) },
  { name: '|x|（不可导）', f: (x: number) => Math.abs(x) }
]
const fi = ref(0)
const npts = ref(11)
const kind = ref<'eq' | 'cheb'>('eq')
const F = computed(() => FUNCS[fi.value].f)
const nodes = computed(() => kind.value === 'eq' ? equispaced(npts.value) : chebyshevNodes(npts.value))
const vals = computed(() => nodes.value.map(F.value))
const w = computed(() => baryWeights(nodes.value))
const P = (x: number) => baryEval(nodes.value, vals.value, w.value, x)

const G = 2000
const grid = Array.from({ length: G + 1 }, (_, i) => -1 + 2 * i / G)
const errMax = (xs: number[]) => {
  const ys = xs.map(F.value), ww = baryWeights(xs)
  let m = 0
  for (const x of grid) m = Math.max(m, Math.abs(baryEval(xs, ys, ww, x) - F.value(x)))
  return m
}
const err = computed(() => errMax(nodes.value))
const om = computed(() => grid.reduce((m, x) => Math.max(m, Math.abs(omega(nodes.value, x))), 0))
// 两种节点、不同点数下的最大误差，画成小表
const table = computed(() => [5, 9, 11, 15, 21].map(n => ({ n, eq: errMax(equispaced(n)), ch: errMax(chebyshevNodes(n)) })))

const W = 640, H = 270, H2 = 120
const sx = makeScale(-1, 1, 34, W - 14)
const yr = computed(() => fi.value === 1 ? [-0.5, 3.2] : [-0.6, 2.1])
const sy = computed(() => makeScale(yr.value[0], yr.value[1], H - 18, 10))
const out = computed(() => grid.some(x => { const v = P(x); return v > yr.value[1] || v < yr.value[0] }))
const sy2 = computed(() => makeScale(0, om.value * 1.05, H2 - 8, 8))
</script>

<template>
  <Widget title="Runge 现象：节点上处处精确，节点之间却可能很差">
    <div class="ctrl">
      <select v-model.number="fi"><option v-for="(f, i) in FUNCS" :key="i" :value="i">{{ f.name }}</option></select>
      <div class="seg">
        <button :class="{ on: kind === 'eq' }" @click="kind = 'eq'">等距节点</button>
        <button :class="{ on: kind === 'cheb' }" @click="kind = 'cheb'">Chebyshev 点（下一讲）</button>
      </div>
    </div>
    <div class="ctrl">
      <label>节点数 n = <b>{{ npts }}</b>（次数 ≤ {{ npts - 1 }}）<input v-model.number="npts" type="range" min="2" max="25" step="1"></label>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
      <line :x1="sx(-1)" :x2="sx(1)" :y1="sy(0)" :y2="sy(0)" style="stroke:var(--ink-3)" />
      <line :x1="sx(0)" :x2="sx(0)" :y1="sy(yr[0])" :y2="sy(yr[1])" style="stroke:var(--line)" />
      <text v-for="t in [-1, -0.5, 0.5, 1]" :key="t" :x="sx(t)" :y="sy(0) + 14" font-size="11" text-anchor="middle" style="fill:var(--ink-3)">{{ t }}</text>
      <path :d="pathOf(F, -1, 1, sx, sy, [yr[0] - 5, yr[1] + 5], 400)" style="fill:none;stroke:var(--prin);stroke-width:2.2" />
      <path :d="pathOf(P, -1, 1, sx, sy, [yr[0], yr[1]], 800)" style="fill:none;stroke:var(--accent);stroke-width:2.2" />
      <circle v-for="(x, i) in nodes" :key="i" :cx="sx(x)" :cy="sy(vals[i])" r="4" style="fill:var(--warn)" />
      <text v-if="out" :x="W - 16" y="24" font-size="12" text-anchor="end" style="fill:var(--warn);font-weight:700">P(x) 已冲出画面</text>
    </svg>
    <p class="widget-note" style="margin:0">下图：几何因子 |ω(x)| = |∏(x − x<sub>j</sub>)|，即误差公式里“我们选择的采样点”那一项。</p>
    <svg :viewBox="`0 0 ${W} ${H2}`" style="width:100%;height:auto">
      <line :x1="sx(-1)" :x2="sx(1)" :y1="sy2(0)" :y2="sy2(0)" style="stroke:var(--ink-3)" />
      <path :d="pathOf(x => Math.abs(omega(nodes, x)), -1, 1, sx, sy2, [-1, Infinity], 600)" style="fill:none;stroke:var(--def);stroke-width:1.8" />
      <circle v-for="(x, i) in nodes" :key="i" :cx="sx(x)" :cy="sy2(0)" r="3" style="fill:var(--warn)" />
    </svg>
    <div class="stats">
      <div class="stat"><b :class="err > 0.1 ? 'bad-c' : 'ok-c'">{{ sci(err, 3) }}</b><span>max |f − P|（[−1, 1] 上）</span></div>
      <div class="stat"><b>{{ sci(om, 3) }}</b><span>max |ω(x)|</span></div>
    </div>
    <table class="mini-table" style="font-variant-numeric:tabular-nums">
      <thead><tr><th>节点数 n</th><th v-for="r in table" :key="r.n">{{ r.n }}</th></tr></thead>
      <tbody>
        <tr><td>等距：max 误差</td><td v-for="r in table" :key="r.n">{{ sci(r.eq) }}</td></tr>
        <tr><td>Chebyshev：max 误差</td><td v-for="r in table" :key="r.n">{{ sci(r.ch) }}</td></tr>
      </tbody>
    </table>
    <p class="widget-note" style="margin-top:8px">课件 P35 的情形是 Runge 函数、11 个等距点：最大误差约 1.916，出现在端点附近。等距节点的 |ω(x)| 在两端远大于中间，次数越高越悬殊；Chebyshev 点让 |ω| 处处差不多高。eˣ 的高阶导数很温和，等距点也收敛；|x| 不光滑，两种节点都收敛得慢。</p>
  </Widget>
</template>
