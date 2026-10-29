<script setup lang="ts">
import { ref, computed } from 'vue'
import { bernstein, baryWeights, interp, supNorm, type Fn } from '../lib/l03'
import { makeScale, pathOf, sci } from '../lib/plot'

// 同一组等距样本 f(k/n)：Bernstein 多项式（不过点，一致收敛）vs 插值多项式（过点，可能振荡）
interface Case { name: string; f: Fn }
const CASES: Case[] = [
  { name: 'Runge 型 1/(1 + 25(2x − 1)²)', f: x => 1 / (1 + 25 * (2 * x - 1) ** 2) },
  { name: '|x − 1/2|', f: x => Math.abs(x - 0.5) },
  { name: 'sin(2πx)', f: x => Math.sin(2 * Math.PI * x) }
]
const ci = ref(0)
const f = computed(() => CASES[ci.value].f)
const n = ref(10)
const showI = ref(true)

const samples = computed(() => Array.from({ length: n.value + 1 }, (_, k) => k / n.value))
const B = computed(() => (x: number) => bernstein(f.value, n.value, x))
const P = computed(() => {
  const xs = samples.value, ys = xs.map(f.value), w = baryWeights(xs)
  return (x: number) => interp(xs, ys, w, x)
})
const eB = computed(() => supNorm(x => f.value(x) - B.value(x), 0, 1, 1500).max)
const eP = computed(() => supNorm(x => f.value(x) - P.value(x), 0, 1, 1500).max)

const W = 640, H = 260
const sx = makeScale(0, 1, 30, W - 14)
const sy = makeScale(-1.3, 1.5, H - 16, 10)
</script>

<template>
  <Widget title="Bernstein 多项式：同样的等距样本，换一种重建规则">
    <div class="ctrl">
      <select v-model.number="ci"><option v-for="(cc, i) in CASES" :key="i" :value="i">{{ cc.name }}</option></select>
      <label>n = <b>{{ n }}</b><input v-model.number="n" type="range" min="1" max="200" step="1"></label>
      <label><input v-model="showI" type="checkbox"> 同时画出过这 n + 1 个点的插值多项式</label>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
      <line :x1="sx(0)" :x2="sx(1)" :y1="sy(0)" :y2="sy(0)" style="stroke:var(--ink-3)" />
      <text :x="sx(0)" :y="sy(0) + 14" font-size="11" text-anchor="middle" style="fill:var(--ink-3)">0</text>
      <text :x="sx(1)" :y="sy(0) + 14" font-size="11" text-anchor="middle" style="fill:var(--ink-3)">1</text>
      <path v-if="showI" :d="pathOf(P, 0, 1, sx, sy, [-1.4, 1.6], 600)" style="fill:none;stroke:var(--warn);stroke-width:1.6;opacity:.8" />
      <path :d="pathOf(f, 0, 1, sx, sy)" style="fill:none;stroke:var(--ink-3);stroke-width:1.6" />
      <path :d="pathOf(B, 0, 1, sx, sy, [-2, 2], 300)" style="fill:none;stroke:var(--accent);stroke-width:2.4" />
      <template v-if="n <= 60">
        <circle v-for="(x, k) in samples" :key="k" :cx="sx(x)" :cy="sy(f(x))" r="3" style="fill:var(--ink-2)" />
      </template>
    </svg>
    <div class="stats">
      <div class="stat"><b style="color:var(--accent)">{{ sci(eB, 3) }}</b><span>max |f − B<sub>n</sub>f|（Bernstein）</span></div>
      <div class="stat"><b style="color:var(--warn)">{{ sci(eP, 3) }}</b><span>max |f − p<sub>n</sub>|（等距插值）</span></div>
      <div class="stat"><b>{{ sci(1 / Math.sqrt(n), 3) }}</b><span>1/√n（参考尺度）</span></div>
    </div>
    <p class="widget-note">灰线是 f，<span style="color:var(--accent)">蓝线是 B<sub>n</sub>f</span>，<span style="color:var(--warn)">红线是等距插值</span>，黑点是两者共用的样本 f(k/n)。Bernstein 多项式一般不经过中间的样本点，误差随 n 增大单调地慢慢下降（对光滑函数大约是 1/n 量级）；而插值多项式精确过点，却在 Runge 型函数上随 n 增大剧烈振荡。问题不在“等距采样”，而在“高次全局插值”这条重建规则。</p>
  </Widget>
</template>
