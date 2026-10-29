<script setup lang="ts">
import { ref, computed } from 'vue'
import { bernstein } from '../lib/l02'
import { makeScale, pathOf, sci } from '../lib/plot'

// Bernstein 多项式 B_n f(x) = E[f(K/n)]，K ~ Bin(n, x)：不插值，但一致收敛
const FUNCS = [
  { name: '|x − 1/2|', f: (x: number) => Math.abs(x - 0.5) },
  { name: 'sin 2πx', f: (x: number) => Math.sin(2 * Math.PI * x) },
  { name: 'Runge 函数 1/(1 + 25(2x − 1)²)', f: (x: number) => 1 / (1 + 25 * (2 * x - 1) ** 2) },
  { name: '√x（在 0 处很陡）', f: (x: number) => Math.sqrt(Math.max(0, x)) }
]
const fi = ref(0)
const logn = ref(Math.log10(10))
const n = computed(() => Math.max(1, Math.round(10 ** logn.value)))
const F = computed(() => FUNCS[fi.value].f)
const B = (x: number) => bernstein(F.value, n.value, x)

const G = 400
const grid = Array.from({ length: G + 1 }, (_, i) => i / G)
const fv = computed(() => grid.map(F.value))
const sup = computed(() => fv.value.reduce((m, v) => Math.max(m, Math.abs(v)), 0))
const err = computed(() => grid.reduce((m, x, i) => Math.max(m, Math.abs(B(x) - fv.value[i])), 0))
// 连续模 ω_f(ε)（在网格上计算），以及课件 P54 的界 min_ε [ω_f(ε) + ‖f‖/(2nε²)]
const omegaTab = computed(() => {
  const out: { eps: number; w: number }[] = []
  for (let s = 1; s <= G / 2; s = Math.max(s + 1, Math.round(s * 1.15))) {
    let w = 0
    for (let i = 0; i <= G; i++) for (let j = i + 1; j <= Math.min(G, i + s); j++) w = Math.max(w, Math.abs(fv.value[i] - fv.value[j]))
    out.push({ eps: s / G, w })
  }
  return out
})
const bound = computed(() => {
  let best = { v: Infinity, eps: 0 }
  for (const { eps, w } of omegaTab.value) {
    const v = w + sup.value / (2 * n.value * eps * eps)
    if (v < best.v) best = { v, eps }
  }
  return best
})

const W = 640, H = 270
const sx = makeScale(0, 1, 34, W - 14)
const yr = computed(() => fi.value === 1 ? [-1.2, 1.2] : [-0.1, 1.1])
const sy = computed(() => makeScale(yr.value[0], yr.value[1], H - 18, 10))
const samples = computed(() => n.value <= 60 ? Array.from({ length: n.value + 1 }, (_, i) => i / n.value) : [])
</script>

<template>
  <Widget title="Bernstein 多项式：用二项分布做“软平均”">
    <div class="ctrl">
      <select v-model.number="fi"><option v-for="(f, i) in FUNCS" :key="i" :value="i">{{ f.name }}</option></select>
      <label>次数 n = <b>{{ n }}</b><input v-model.number="logn" type="range" min="0" max="3" step="0.01"></label>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
      <line :x1="sx(0)" :x2="sx(1)" :y1="sy(0)" :y2="sy(0)" style="stroke:var(--ink-3)" />
      <text v-for="t in [0, 0.25, 0.5, 0.75, 1]" :key="t" :x="sx(t)" :y="sy(0) + 14" font-size="11" text-anchor="middle" style="fill:var(--ink-3)">{{ t }}</text>
      <path :d="pathOf(F, 0, 1, sx, sy, [-9, 9], 400)" style="fill:none;stroke:var(--prin);stroke-width:2.2" />
      <path :d="pathOf(B, 0, 1, sx, sy, [-9, 9], 300)" style="fill:none;stroke:var(--accent);stroke-width:2.4" />
      <circle v-for="(x, i) in samples" :key="i" :cx="sx(x)" :cy="sy(F(x))" r="3" style="fill:var(--warn)" />
    </svg>
    <div class="stats">
      <div class="stat"><b>{{ sci(err, 3) }}</b><span>‖f − B<sub>n</sub>f‖<sub>∞</sub>（实际）</span></div>
      <div class="stat"><b>{{ sci(bound.v, 3) }}</b><span>P54 的界（取最优 ε ≈ {{ bound.eps.toFixed(3) }}）</span></div>
      <div class="stat"><b>{{ sci(err * Math.sqrt(n), 3) }}</b><span>误差 × √n</span></div>
    </div>
    <p class="widget-note">紫线是 f，橙线是 B<sub>n</sub>f，红点是采样值 f(i/n)（n ≤ 60 时画出）。B<sub>n</sub>f 一般<b>不经过</b>这些点——它是 f(K/n) 在 K ~ Bin(n, x) 下的期望。n 每放大 100 倍，|x − 1/2| 的误差约缩小 10 倍（与 1/√n 同阶），比插值慢得多，但对任何连续函数都保证收敛。课件的界 ω<sub>f</sub>(ε) + ‖f‖<sub>∞</sub>/(2nε²) 总是成立，但偏保守。</p>
  </Widget>
</template>
