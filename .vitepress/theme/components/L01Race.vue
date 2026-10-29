<script setup lang="ts">
import { ref, computed } from 'vue'
import { bisection, fixedPoint, newton, secant, safeNewton, errors, SQRT2, DOTTIE, type Fn } from '../lib/l01'
import { makeScale, sci } from '../lib/plot'

// 同一个根，五种算法：看 log10 误差随迭代次数的形状（直线 = 线性收敛，越弯越快）
const CASES: { name: string; f: Fn; df: Fn; g: Fn; gname: string; a: number; b: number; r: number }[] = [
  { name: 'x² − 2 = 0', f: x => x * x - 2, df: x => 2 * x, g: x => x - 0.25 * (x * x - 2), gname: 'x − (x² − 2)/4', a: 1, b: 2, r: SQRT2 },
  { name: 'cos x − x = 0', f: x => Math.cos(x) - x, df: x => -Math.sin(x) - 1, g: Math.cos, gname: 'cos x', a: 0, b: 1, r: DOTTIE }
]
const ci = ref(0)
const c = computed(() => CASES[ci.value])
const N = 45
const FLOOR = 1e-16

const series = computed(() => {
  const { f, df, g, a, b, r } = c.value
  const list = [
    { name: '二分法', color: 'var(--ink-3)', xs: bisection(f, a, b, N).map(s => s.m) },
    { name: `不动点 g = ${c.value.gname}`, color: 'var(--prin)', xs: fixedPoint(g, a, N) },
    { name: '割线法', color: 'var(--ex)', xs: secant(f, a, b, N) },
    { name: '牛顿法', color: 'var(--accent)', xs: newton(f, df, a, N) },
    { name: '带保护的牛顿', color: 'var(--warn)', xs: safeNewton(f, df, a, b, N).xs }
  ]
  return list.map(s => {
    const es = errors(s.xs, r)
    const hit = es.findIndex(e => e <= 1e-12)
    return { ...s, es, hit }
  })
})

const W = 640, H = 300
const sx = makeScale(0, N, 46, W - 14)
const sy = makeScale(0, -16, 14, H - 30)
const yOf = (e: number) => sy(Math.log10(Math.max(e, FLOOR)))
const line = (es: number[]) => es.map((e, k) => `${k ? 'L' : 'M'}${sx(k).toFixed(1)},${yOf(e).toFixed(1)}`).join('')
</script>

<template>
  <Widget title="收敛速度对比：同一个根，五种求根器">
    <div class="ctrl">
      <div class="seg">
        <button v-for="(cc, i) in CASES" :key="i" :class="{ on: ci === i }" @click="ci = i">{{ cc.name }}</button>
      </div>
      <span class="muted" style="font-size:13px">区间 [{{ c.a }}, {{ c.b }}]；不动点和牛顿从 x₀ = {{ c.a }} 出发，割线用 x₀ = {{ c.a }}, x₁ = {{ c.b }}</span>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
      <g v-for="p in [0, -4, -8, -12, -16]" :key="p">
        <line :x1="sx(0)" :x2="sx(N)" :y1="sy(p)" :y2="sy(p)" style="stroke:var(--line-2)" />
        <text :x="sx(0) - 6" :y="sy(p) + 4" font-size="11" text-anchor="end" style="fill:var(--ink-3)">1e{{ p }}</text>
      </g>
      <g v-for="k in [0, 5, 10, 15, 20, 25, 30, 35, 40, 45]" :key="k">
        <text :x="sx(k)" :y="H - 12" font-size="11" text-anchor="middle" style="fill:var(--ink-3)">{{ k }}</text>
      </g>
      <text :x="sx(N)" :y="H - 12" font-size="11" text-anchor="end" style="fill:var(--ink-3)" dy="-14">迭代次数 k</text>
      <g v-for="s in series" :key="s.name">
        <path :d="line(s.es)" :style="{ fill: 'none', stroke: s.color, strokeWidth: 2.2 }" />
        <circle v-for="(e, k) in s.es" :key="k" :cx="sx(k)" :cy="yOf(e)" r="2.6" :style="{ fill: s.color }" />
      </g>
    </svg>
    <table class="mini-table">
      <thead><tr><th>算法</th><th>每步信息</th><th>误差 ≤ 10⁻¹² 需要的步数</th><th>第 5 步误差</th></tr></thead>
      <tbody>
        <tr v-for="(s, i) in series" :key="s.name">
          <td><span :style="{ color: s.color, fontWeight: 700 }">●</span> {{ s.name }}</td>
          <td>{{ ['f 的符号', 'g(x)', 'f(x)', 'f(x), f′(x)', 'f(x), f′(x) + 区间'][i] }}</td>
          <td>{{ s.hit < 0 ? `> ${s.es.length - 1}` : s.hit }}</td>
          <td>{{ s.es[5] !== undefined ? sci(s.es[5]) : '—' }}</td>
        </tr>
      </tbody>
    </table>
    <p class="widget-note">纵轴是 log₁₀ 误差：线性收敛是一条斜直线（二分法每步下降 log₁₀2 ≈ 0.3），超线性收敛的曲线越走越陡。误差到 10⁻¹⁶ 附近就碰到双精度的底，曲线变平。</p>
  </Widget>
</template>
