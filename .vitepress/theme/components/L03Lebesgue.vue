<script setup lang="ts">
import { ref, computed } from 'vue'
import { equiNodes, chebNodes, lebesgueFn, supNorm } from '../lib/l03'
import { makeScale, sci } from '../lib/plot'

// Lebesgue 函数 λ(x) = Σ|ℓ_j(x)| 与 Lebesgue 常数 Λ_n = max λ：等距指数增长，Chebyshev 对数增长
const n = ref(11)
const lamE = (x: number) => lebesgueFn(equiNodes(n.value), x)
const lamC = (x: number) => lebesgueFn(chebNodes(n.value), x)
const LE = computed(() => supNorm(lamE, -1, 1, 3000).max)
const LC = computed(() => supNorm(lamC, -1, 1, 3000).max)

const W = 640, H = 240
const sx = makeScale(-1, 1, 44, W - 14)
const top = computed(() => Math.max(1, Math.ceil(Math.log10(LE.value) + 0.2)))
const sy = computed(() => makeScale(0, top.value, H - 22, 10))
function logPath(g: (x: number) => number) {
  let d = ''
  for (let i = 0; i <= 800; i++) {
    const x = -1 + 2 * i / 800
    d += `${i ? 'L' : 'M'}${sx(x).toFixed(1)},${sy.value(Math.log10(Math.max(1, g(x)))).toFixed(1)}`
  }
  return d
}
const pE = computed(() => logPath(lamE))
const pC = computed(() => logPath(lamC))

// Λ_n 随 n 的表
const table = computed(() => [5, 10, 15, 20, 25].map(m => ({
  m,
  e: supNorm(x => lebesgueFn(equiNodes(m), x), -1, 1, 2000).max,
  c: supNorm(x => lebesgueFn(chebNodes(m), x), -1, 1, 2000).max,
  ref: 2 / Math.PI * Math.log(m) + 1
})))
</script>

<template>
  <Widget title="Lebesgue 常数：插值规则本身会把误差放大多少倍？">
    <div class="ctrl">
      <label>节点数 n = <b>{{ n }}</b><input v-model.number="n" type="range" min="2" max="25" step="1"></label>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
      <template v-for="t in top + 1" :key="t">
        <line :x1="sx(-1)" :x2="sx(1)" :y1="sy(t - 1)" :y2="sy(t - 1)" style="stroke:var(--line-2)" />
        <text :x="sx(-1) - 6" :y="sy(t - 1) + 4" font-size="11" text-anchor="end" style="fill:var(--ink-3)">10<tspan dy="-5" font-size="9">{{ t - 1 }}</tspan></text>
      </template>
      <path :d="pE" style="fill:none;stroke:var(--warn);stroke-width:2" />
      <path :d="pC" style="fill:none;stroke:var(--ex);stroke-width:2.2" />
      <text :x="sx(-1)" :y="H - 4" font-size="11" text-anchor="middle" style="fill:var(--ink-3)">−1</text>
      <text :x="sx(1)" :y="H - 4" font-size="11" text-anchor="middle" style="fill:var(--ink-3)">1</text>
    </svg>
    <div class="stats">
      <div class="stat"><b style="color:var(--warn)">{{ sci(LE, 3) }}</b><span>Λ<sub>n</sub>（等距节点）</span></div>
      <div class="stat"><b style="color:var(--ex)">{{ sci(LC, 3) }}</b><span>Λ<sub>n</sub>（Chebyshev 节点）</span></div>
      <div class="stat"><b>{{ sci(1 + LC, 3) }}</b><span>近最佳因子 1 + Λ<sub>n</sub>（Chebyshev）</span></div>
    </div>
    <table class="mini-table" style="font-variant-numeric:tabular-nums">
      <thead><tr><th>n</th><th>Λ<sub>n</sub> 等距</th><th>Λ<sub>n</sub> Chebyshev</th><th>(2/π) ln n + 1</th></tr></thead>
      <tbody><tr v-for="r in table" :key="r.m" :class="{ best: r.m === n }"><td>{{ r.m }}</td><td>{{ sci(r.e, 3) }}</td><td>{{ r.c.toFixed(3) }}</td><td>{{ r.ref.toFixed(3) }}</td></tr></tbody>
    </table>
    <p class="widget-note">图中是 Lebesgue 函数 λ(x) = Σ<sub>j</sub>|ℓ<sub>j</sub>(x)|（对数纵轴），<span style="color:var(--warn)">红 = 等距</span>，<span style="color:var(--ex)">绿 = Chebyshev</span>；它的最大值就是 Λ<sub>n</sub>。节点上的数据每个只差 10⁻⁶，等距 25 点插值的结果最坏可以差约 Λ<sub>25</sub> × 10⁻⁶ ≈ 1.4×10⁵ × 10⁻⁶ ≈ 0.14；Chebyshev 节点只放大约 3 倍，而且始终不超过 (2/π) ln n + 1。</p>
  </Widget>
</template>
