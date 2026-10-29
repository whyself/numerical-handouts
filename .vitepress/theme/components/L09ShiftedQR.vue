<script setup lang="ts">
import { ref, computed } from 'vue'
import { symWithEigs, qrDeflate, type Mat, type ShiftRule } from '../lib/l09'
import { makeScale } from '../lib/plot'

// 带位移的 QR 迭代 + 收缩：看活动块最后一行次对角元 |a_{m,m−1}| 怎样掉到 10⁻¹²，然后锁定一个特征值、矩阵缩小一阶
interface Case { name: string; A: Mat }
const CASES: Case[] = [
  { name: '4×4，特征值 10, 6, 3, 1', A: symWithEigs([10, 6, 3, 1], 3) },
  { name: '5×5，特征值 5, −4, 3, −2, 1', A: symWithEigs([5, -4, 3, -2, 1], 17) },
  { name: '6×6，特征值 1, 0.9, 0.8, 0.7, 0.6, 0.5（模很接近）', A: symWithEigs([1, 0.9, 0.8, 0.7, 0.6, 0.5], 23) },
  { name: '反例 (0 1; 1 0)', A: [[0, 1], [1, 0]] }
]
const ci = ref(0)
const c = computed(() => CASES[ci.value])
const MAXIT = 300
const RULES: { rule: ShiftRule; name: string; color: string }[] = [
  { rule: 'none', name: '无位移', color: 'var(--ink-3)' },
  { rule: 'rayleigh', name: 'Rayleigh 位移 μ = a_mm', color: 'var(--prin)' },
  { rule: 'wilkinson', name: 'Wilkinson 位移', color: 'var(--accent)' }
]
const runs = computed(() => RULES.map(r => ({ ...r, ...qrDeflate(c.value.A, r.rule, MAXIT) })))
const xmax = computed(() => Math.max(10, ...runs.value.map(r => Math.min(r.iters, 120))))

const W = 640, H = 260
const sx = computed(() => makeScale(0, xmax.value, 44, W - 12))
const sy = makeScale(0, -16, 12, H - 26)
const yOf = (e: number) => sy(Math.log10(Math.max(e, 1e-16)))
// 只画每次迭代后的 |a_{m,m−1}|；收缩时竖线断开
const path = (tr: { k: number; sub: number }[]) => tr.filter(t => t.k <= xmax.value).map((t, i) => `${i ? 'L' : 'M'}${sx.value(t.k).toFixed(1)},${yOf(t.sub).toFixed(1)}`).join('')
</script>

<template>
  <Widget title="带位移的 QR 迭代：位移 + 收缩，几步锁定一个特征值">
    <div class="ctrl">
      <select v-model.number="ci"><option v-for="(cc, i) in CASES" :key="i" :value="i">{{ cc.name }}</option></select>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
      <g v-for="p in [0, -4, -8, -12, -16]" :key="p">
        <line :x1="sx(0)" :x2="sx(xmax)" :y1="sy(p)" :y2="sy(p)" :style="{ stroke: p === -12 ? 'var(--warn)' : 'var(--line-2)' }" :stroke-dasharray="p === -12 ? '4 3' : ''" />
        <text :x="sx(0) - 6" :y="sy(p) + 4" font-size="11" text-anchor="end" style="fill:var(--ink-3)">1e{{ p }}</text>
      </g>
      <text :x="sx(xmax)" :y="H - 8" font-size="11" text-anchor="end" style="fill:var(--ink-3)">迭代次数（共 {{ xmax }} 步内）</text>
      <g v-for="r in runs" :key="r.rule">
        <path :d="path(r.trace)" :style="{ fill: 'none', stroke: r.color, strokeWidth: 2 }" />
        <circle v-for="(f, i) in r.found.filter(f => f.at <= xmax)" :key="i" :cx="sx(f.at)" :cy="sy(-12)" r="4.5" :style="{ fill: r.color }" />
      </g>
    </svg>
    <table class="mini-table" style="font-variant-numeric:tabular-nums">
      <thead><tr><th>位移策略</th><th>QR 步数（全部特征值）</th><th>依次锁定的特征值（括号内为锁定时的步数）</th></tr></thead>
      <tbody>
        <tr v-for="r in runs" :key="r.rule">
          <td><b :style="{ color: r.color }">●</b> {{ r.name }}</td>
          <td>{{ r.done ? r.iters : `> ${MAXIT}（未完成）` }}</td>
          <td>{{ r.found.map(f => `${+f.val.toFixed(8)} (${f.at})`).join('，') }}</td>
        </tr>
      </tbody>
    </table>
    <p class="widget-note">纵轴是当前活动块最后一行的次对角元 |a<sub>m,m−1</sub>|；掉到 10⁻¹²·‖A‖_F（橙色虚线）就把 a<sub>mm</sub> 当成一个特征值锁定（圆点），去掉最后一行一列继续。无位移时每次锁定都要几十步（线性收敛，比值 |λₘ/λₘ₋₁|），模接近的 6×6 例子尤其慢；带位移后每个特征值只要两三步。反例 (0 1; 1 0) 上 Rayleigh 位移 μ = a₂₂ = 0，与无位移相同，只能靠舍入误差慢慢打破对称；Wilkinson 位移一步就解决。Wilkinson 位移与隐式实现不在本课程要求之内（课件 P35）。</p>
  </Widget>
</template>
