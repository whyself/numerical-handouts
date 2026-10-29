<script setup lang="ts">
import { ref, computed } from 'vue'
import { chebT, chebCoefs, chebNodes, chebExtrema } from '../lib/l03'
import { makeScale, pathOf } from '../lib/plot'

// T_n(x) = cos(nθ)，x = cos θ：上半圆上的点投影到 x 轴，曲线高度就是 cos(nθ)
const n = ref(6)
const deg = ref(50) // θ，单位：度
const show = ref<'zeros' | 'ext'>('ext')
const th = computed(() => deg.value * Math.PI / 180)
const x = computed(() => Math.cos(th.value))

const W = 640, H = 410
const sx = makeScale(-1, 1, 160, 480)
const R = 160, CY = 182
const sy = makeScale(-1.15, 1.15, 395, 215)
const Tn = computed(() => (t: number) => chebT(n.value, t))

const marks = computed(() => show.value === 'zeros'
  ? chebNodes(n.value).map(t => ({ t, y: 0 }))
  : chebExtrema(n.value).map((t, k) => ({ t, y: k % 2 ? -1 : 1 })))

const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
const sup = (k: number) => String(k).replace(/./g, c => SUP[c])
function polyStr(c: number[]) {
  const terms: string[] = []
  for (let j = c.length - 1; j >= 0; j--) {
    if (!c[j]) continue
    const a = Math.abs(c[j]), s = c[j] < 0 ? '−' : '+'
    const body = j === 0 ? `${a}` : `${a === 1 ? '' : a}x${j > 1 ? sup(j) : ''}`
    terms.push(terms.length ? ` ${s} ${body}` : (c[j] < 0 ? '−' : '') + body)
  }
  return terms.join('') || '0'
}
const rows = computed(() => {
  const cs = chebCoefs(Math.max(n.value, 1))
  return [n.value - 2, n.value - 1, n.value].filter(k => k >= 0).map(k => ({ k, s: polyStr(cs[k]), lead: cs[k][k] }))
})
const sub = (k: number) => String(k).replace(/./g, c => '₀₁₂₃₄₅₆₇₈₉'[Number(c)])
</script>

<template>
  <Widget title="T<sub>n</sub>(x) = cos(n arccos x)：圆上的均匀振荡搬到区间上">
    <div class="ctrl">
      <label>n = <b>{{ n }}</b><input v-model.number="n" type="range" min="0" max="12" step="1"></label>
      <label>θ = <b>{{ deg }}°</b><input v-model.number="deg" type="range" min="0" max="180" step="1"></label>
      <div class="seg">
        <button :class="{ on: show === 'ext' }" @click="show = 'ext'">极值点 cos(kπ/n)</button>
        <button :class="{ on: show === 'zeros' }" @click="show = 'zeros'">零点 cos((2i−1)π/2n)</button>
      </div>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
      <!-- 上半圆 -->
      <path :d="`M${sx(-1)},${CY} A${R},${R} 0 0 1 ${sx(1)},${CY}`" style="fill:none;stroke:var(--line)" />
      <line :x1="sx(-1) - 10" :x2="sx(1) + 10" :y1="CY" :y2="CY" style="stroke:var(--ink-3)" />
      <template v-if="n > 0">
        <g v-for="(m, i) in marks" :key="'c' + i">
          <line :x1="sx(m.t)" :x2="sx(m.t)" :y1="CY - R * Math.sqrt(Math.max(0, 1 - m.t * m.t))" :y2="sy(m.y)" style="stroke:var(--line)" stroke-dasharray="2 3" />
          <circle :cx="sx(m.t)" :cy="CY - R * Math.sqrt(Math.max(0, 1 - m.t * m.t))" r="3.5" :style="`fill:var(${show === 'ext' ? '--prin' : '--ex'})`" />
        </g>
      </template>
      <line :x1="sx(0)" :y1="CY" :x2="sx(x)" :y2="CY - R * Math.sin(th)" style="stroke:var(--accent);stroke-width:1.5" />
      <path :d="`M${sx(0) + 28},${CY} A28,28 0 0 0 ${sx(0) + 28 * Math.cos(th)},${CY - 28 * Math.sin(th)}`" style="fill:none;stroke:var(--accent)" />
      <text :x="sx(0) + 34 * Math.cos(th / 2) + 2" :y="CY - 34 * Math.sin(th / 2)" font-size="12" style="fill:var(--accent)">θ</text>
      <circle :cx="sx(x)" :cy="CY - R * Math.sin(th)" r="6" style="fill:var(--accent)" />
      <line :x1="sx(x)" :x2="sx(x)" :y1="CY - R * Math.sin(th)" :y2="sy(Tn(x))" style="stroke:var(--accent)" stroke-dasharray="5 3" />
      <!-- T_n 的图像 -->
      <line :x1="sx(-1)" :x2="sx(1)" :y1="sy(0)" :y2="sy(0)" style="stroke:var(--ink-3)" />
      <line v-for="v in [1, -1]" :key="v" :x1="sx(-1)" :x2="sx(1)" :y1="sy(v)" :y2="sy(v)" style="stroke:var(--line)" stroke-dasharray="4 4" />
      <text :x="sx(-1) - 8" :y="sy(1) + 4" font-size="11" text-anchor="end" style="fill:var(--ink-3)">1</text>
      <text :x="sx(-1) - 8" :y="sy(-1) + 4" font-size="11" text-anchor="end" style="fill:var(--ink-3)">−1</text>
      <text :x="sx(-1)" :y="sy(0) + 16" font-size="11" text-anchor="middle" style="fill:var(--ink-3)">−1</text>
      <text :x="sx(1)" :y="sy(0) + 16" font-size="11" text-anchor="middle" style="fill:var(--ink-3)">1</text>
      <path :d="pathOf(Tn, -1, 1, sx, sy, [-2, 2], 600)" style="fill:none;stroke:var(--prin);stroke-width:2.4" />
      <template v-if="n > 0">
        <circle v-for="(m, i) in marks" :key="'p' + i" :cx="sx(m.t)" :cy="sy(m.y)" r="4" :style="`fill:var(${show === 'ext' ? '--prin' : '--ex'})`" />
      </template>
      <circle :cx="sx(x)" :cy="sy(Tn(x))" r="6" style="fill:var(--accent)" />
      <text :x="sx(1) + 14" :y="sy(0.6)" font-size="13" style="fill:var(--ink-2)">x = cos θ = {{ x.toFixed(4) }}</text>
      <text :x="sx(1) + 14" :y="sy(0.6) + 20" font-size="13" style="fill:var(--ink-2)">cos(nθ) = {{ Math.cos(n * th).toFixed(4) }}</text>
      <text :x="sx(1) + 14" :y="sy(0.6) + 40" font-size="13" style="fill:var(--ink-2)">递推值 = {{ Tn(x).toFixed(4) }}</text>
      <text :x="sx(-1) - 140" :y="CY - 120" font-size="12" style="fill:var(--ink-3)">上半圆：θ 均匀</text>
      <text :x="sx(-1) - 140" :y="sy(0.9)" font-size="12" style="fill:var(--ink-3)">下方：y = T{{ sub(n) }}(x)</text>
    </svg>
    <table class="mini-table" style="font-variant-numeric:tabular-nums">
      <thead><tr><th>k</th><th>T<sub>k</sub>(x) 的单项式展开（由 T<sub>k+1</sub> = 2xT<sub>k</sub> − T<sub>k−1</sub> 算出）</th><th>首项系数</th></tr></thead>
      <tbody>
        <tr v-for="r in rows" :key="r.k" :class="{ best: r.k === n }"><td>{{ r.k }}</td><td>T{{ sub(r.k) }}(x) = {{ r.s }}</td><td>{{ r.lead }}</td></tr>
      </tbody>
    </table>
    <p class="widget-note">拖动 θ：圆上的点匀速转动时，它的投影 x = cos θ 在两端走得慢、在中间走得快，而曲线高度 cos(nθ) 匀速振荡——所以 T<sub>n</sub> 在 [−1, 1] 上有 n + 1 个一样高的峰谷，零点和极值点都向两端聚集。“cos(nθ)”与“递推值”两行始终相等；首项系数是 2<sup>n−1</sup>（n ≥ 1）。</p>
  </Widget>
</template>
