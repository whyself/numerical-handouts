<script setup lang="ts">
import { ref, computed } from 'vue'
import { solveLU } from '../lib/l05'
import { makeScale, sci } from '../lib/plot'

// 小主元的灾难：A = [[ε, 1], [1, 1]]，b = [1, 2]；精确解 x ≈ (1, 1)
const k = ref(10)
const KMAX = 20
function run(e: number) {
  const A = [[e, 1], [1, 1]], b = [1, 2]
  const exact = [1 / (1 - e), (1 - 2 * e) / (1 - e)]
  const err = (x: number[]) => Math.max(Math.abs(x[0] - exact[0]), Math.abs(x[1] - exact[1]))
  const np = solveLU(A, b, 'none')!, pp = solveLU(A, b, 'partial')!
  return { exact, np, pp, enp: err(np.x), epp: err(pp.x) }
}
const eps = computed(() => 10 ** -k.value)
const cur = computed(() => run(eps.value))
const curve = computed(() => Array.from({ length: KMAX }, (_, i) => ({ k: i + 1, ...run(10 ** -(i + 1)) })))

const W = 640, H = 230
const sx = makeScale(1, KMAX, 56, W - 16)
const sy = makeScale(0, -17, 14, H - 30)
const yOf = (e: number) => sy(Math.max(Math.log10(Math.max(e, 1e-17)), -17))
const path = (key: 'enp' | 'epp') => curve.value.map((r, i) => `${i ? 'L' : 'M'}${sx(r.k).toFixed(1)},${yOf(r[key]).toFixed(1)}`).join('')
const f = (v: number) => (Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-3 && v !== 0) ? sci(v, 3) : Number(v.toPrecision(10)).toString()).replace(/^-/, '−')
</script>

<template>
  <Widget title="为什么要选主元：一个很小的主元">
    <div class="ctrl">
      <label>ε = 10<sup>−{{ k }}</sup><input v-model.number="k" type="range" min="1" :max="KMAX" step="1"></label>
      <span class="muted" style="font-size:13px">解 εx₁ + x₂ = 1，x₁ + x₂ = 2；精确解 x₁ = 1/(1−ε) ≈ 1，x₂ = (1−2ε)/(1−ε) ≈ 1</span>
    </div>
    <div style="overflow-x:auto"><table class="mini-table" style="font-variant-numeric:tabular-nums;white-space:nowrap">
      <thead><tr><th></th><th>乘子 ℓ₂₁</th><th>U 的 (2,2) 元</th><th>算出的 x₁</th><th>算出的 x₂</th><th>误差</th></tr></thead>
      <tbody>
        <tr><td>不选主元</td><td>{{ f(cur.np.L[1][0]) }}</td><td>{{ f(cur.np.U[1][1]) }}</td><td :class="cur.enp > 1e-6 ? 'bad-c' : ''">{{ f(cur.np.x[0]) }}</td><td>{{ f(cur.np.x[1]) }}</td><td :class="cur.enp > 1e-6 ? 'bad-c' : ''">{{ sci(cur.enp) }}</td></tr>
        <tr class="best"><td>部分选主元</td><td>{{ f(cur.pp.L[1][0]) }}</td><td>{{ f(cur.pp.U[1][1]) }}</td><td>{{ f(cur.pp.x[0]) }}</td><td>{{ f(cur.pp.x[1]) }}</td><td>{{ sci(cur.epp) }}</td></tr>
      </tbody>
    </table></div>
    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto;margin-top:8px">
      <g v-for="p in [0, -4, -8, -12, -16]" :key="p">
        <line :x1="sx(1)" :x2="sx(KMAX)" :y1="sy(p)" :y2="sy(p)" style="stroke:var(--line-2)" />
        <text :x="sx(1) - 6" :y="sy(p) + 4" font-size="11" text-anchor="end" style="fill:var(--ink-3)">1e{{ p }}</text>
      </g>
      <g v-for="t in [1, 4, 8, 12, 16, 20]" :key="t">
        <text :x="sx(t)" :y="H - 10" font-size="11" text-anchor="middle" style="fill:var(--ink-3)">ε=1e−{{ t }}</text>
      </g>
      <line :x1="sx(k)" :x2="sx(k)" :y1="sy(0)" :y2="sy(-17)" style="stroke:var(--ink-3)" stroke-dasharray="3 3" />
      <path :d="path('enp')" style="fill:none;stroke:var(--warn);stroke-width:2.2" />
      <path :d="path('epp')" style="fill:none;stroke:var(--ex);stroke-width:2.2" />
      <text :x="sx(KMAX) - 4" y="26" font-size="12" text-anchor="end" style="fill:var(--warn);font-weight:700">不选主元</text>
      <text :x="sx(KMAX) - 4" :y="sy(-15)" font-size="12" text-anchor="end" style="fill:var(--ex);font-weight:700">部分选主元</text>
    </svg>
    <p class="widget-note">不选主元时，乘子 ℓ₂₁ = 1/ε 巨大，U₂₂ = 1 − 1/ε 在双精度里直接被舍入成 −1/ε，“1”这一信息丢了；回代 x₁ = (1 − x₂)/ε 又是两个几乎相等的数相减再除以 ε，误差约为 u/ε（u ≈ 1.1×10⁻¹⁶）——ε 越小越糟，到 ε ≤ 10⁻¹⁷ 时 x₁ 直接算成 0。换行以后乘子是 ε，|ℓ| ≤ 1，误差始终在 10⁻¹⁶ 量级。问题本身条件很好（A 的条件数约为 2.6），坏的是算法。</p>
  </Widget>
</template>
