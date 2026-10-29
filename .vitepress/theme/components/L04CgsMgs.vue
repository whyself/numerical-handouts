<script setup lang="ts">
import { ref, computed } from 'vue'
import { makeScale, sci } from '../lib/plot'
import { gramSchmidt, cgs2, householderQR, orthLoss, cond2, hilbert, vandermonde, linspace, type Mat } from '../lib/l04'

// 正交性损失 ‖I − QᵀQ‖_F 随条件数增长：CGS ~ κ²u，MGS ~ κu，Householder ~ u
const FAM: { name: string; make: (n: number) => Mat; ns: number[] }[] = [
  { name: 'Hilbert 矩阵 Hᵢⱼ = 1/(i+j−1)', make: n => hilbert(n), ns: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { name: 'Vandermonde（20 个等距点，列 1, x, …, xⁿ⁻¹）', make: n => vandermonde(linspace(0, 1, 20), n), ns: [2, 4, 6, 8, 10, 12, 14, 16] }
]
const fi = ref(0)
const fam = computed(() => FAM[fi.value])
const U = 2 ** -53
const data = computed(() => fam.value.ns.map(n => {
  const A = fam.value.make(n)
  const k = cond2(A)
  return {
    n, k,
    cgs: orthLoss(gramSchmidt(A, 'cgs').Q),
    mgs: orthLoss(gramSchmidt(A, 'mgs').Q),
    cgs2: orthLoss(cgs2(A).Q),
    hh: orthLoss(householderQR(A).Q)
  }
}))
const SER = [
  { key: 'cgs', name: 'CGS', color: 'var(--warn)' },
  { key: 'mgs', name: 'MGS', color: 'var(--accent)' },
  { key: 'cgs2', name: 'CGS2（正交化两遍）', color: 'var(--prin)' },
  { key: 'hh', name: 'Householder', color: 'var(--ex)' }
] as const
const W = 620, H = 300
const sx = computed(() => makeScale(fam.value.ns[0], fam.value.ns[fam.value.ns.length - 1], 50, W - 16))
const sy = makeScale(1, -17, 14, H - 30)
const ly = (v: number) => sy(Math.max(-17, Math.min(1, Math.log10(Math.max(v, 1e-17)))))
const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${sx.value(fam.value.ns[i]).toFixed(1)},${ly(v).toFixed(1)}`).join('')
const sel = ref(4)
const row = computed(() => data.value[Math.min(sel.value, data.value.length - 1)])
</script>

<template>
  <Widget title="CGS 与 MGS：病态矩阵上的正交性损失">
    <div class="ctrl">
      <div class="seg">
        <button v-for="(f, i) in FAM" :key="i" :class="{ on: fi === i }" @click="fi = i">{{ f.name }}</button>
      </div>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
      <g v-for="p in [0, -4, -8, -12, -16]" :key="p">
        <line :x1="sx(fam.ns[0])" :x2="sx(fam.ns[fam.ns.length - 1])" :y1="sy(p)" :y2="sy(p)" style="stroke:var(--line-2)" />
        <text :x="44" :y="sy(p) + 4" font-size="11" text-anchor="end" style="fill:var(--ink-3)">1e{{ p }}</text>
      </g>
      <g v-for="(d, i) in data" :key="d.n" style="cursor:pointer" @click="sel = i">
        <text :x="sx(d.n)" :y="H - 12" font-size="11" text-anchor="middle" :style="{ fill: i === sel ? 'var(--accent)' : 'var(--ink-3)', fontWeight: i === sel ? 700 : 400 }">{{ d.n }}</text>
        <rect :x="sx(d.n) - 10" :y="10" width="20" :height="H - 40" style="fill:transparent" />
      </g>
      <line :x1="sx(row.n)" :x2="sx(row.n)" :y1="12" :y2="H - 28" style="stroke:var(--accent);opacity:.3;stroke-width:6" />
      <path :d="path(data.map(d => d.k * U))" style="fill:none;stroke:var(--ink-3)" stroke-dasharray="5 4" />
      <path :d="path(data.map(d => d.k * d.k * U))" style="fill:none;stroke:var(--ink-3)" stroke-dasharray="1 4" />
      <g v-for="s in SER" :key="s.key">
        <path :d="path(data.map(d => d[s.key]))" :style="{ fill: 'none', stroke: s.color, strokeWidth: 2.4 }" />
        <circle v-for="d in data" :key="d.n" :cx="sx(d.n)" :cy="ly(d[s.key])" r="3" :style="{ fill: s.color }" />
      </g>
      <text :x="W - 16" :y="H - 12" font-size="11" text-anchor="end" style="fill:var(--ink-3)" dy="-14">列数 n（点击选择）</text>
    </svg>
    <p class="widget-note" style="margin-bottom:6px">
      <span v-for="s in SER" :key="s.key" style="margin-right:14px"><span :style="{ color: s.color, fontWeight: 700 }">●</span> {{ s.name }}</span>
      <span style="margin-right:14px">- - κ(A)·u</span><span>· · · κ(A)²·u（u = 2⁻⁵³ ≈ 1.1×10⁻¹⁶）</span>
    </p>
    <table class="mini-table" style="font-variant-numeric:tabular-nums">
      <thead><tr><th>n = {{ row.n }}</th><th>κ₂(A)</th><th>CGS</th><th>MGS</th><th>CGS2</th><th>Householder</th></tr></thead>
      <tbody><tr><td>‖I − QᵀQ‖_F</td><td>{{ sci(row.k) }}</td><td>{{ sci(row.cgs) }}</td><td>{{ sci(row.mgs) }}</td><td>{{ sci(row.cgs2) }}</td><td>{{ sci(row.hh) }}</td></tr></tbody>
    </table>
    <p class="widget-note">MGS 的曲线基本贴着 κ·u 那条虚线；CGS 涨得更快（经验上接近 κ²·u），在 Hilbert 矩阵 n ≈ 8 时 ‖I − QᵀQ‖ 已经是 1 的量级——算出来的“Q”根本不正交。Householder 与“正交化两遍”的 CGS2 始终停在 10⁻¹⁵ 附近，与条件数无关。四种算法在精确算术下给出同一个 Q。</p>
  </Widget>
</template>
