<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { lagrangeBasis, dividedDiff, newtonEval, newtonToMonomial, realPolyStr } from '../lib/l02'
import { makeScale, pathOf, fix } from '../lib/plot'

// 拉格朗日插值逐项构造：P = Σ y_k L_k；可拖动数据点，同时给出牛顿差商表与单项式系数
interface Preset { name: string; xs: number[]; ys: number[]; lo: number; hi: number; ylo: number; yhi: number }
const PRESETS: Preset[] = [
  { name: '节点 −1, 0, 1（P11 的例子）', xs: [-1, 0, 1], ys: [0, 1, 0], lo: -1.6, hi: 1.6, ylo: -1.5, yhi: 2 },
  { name: '(1, 1), (2, 1)（P14 一分钟练习）', xs: [1, 2], ys: [1, 1], lo: 0, hi: 3, ylo: -1.5, yhi: 2.5 },
  { name: 'sin x 上的 5 个采样点', xs: [0, 1.5, 3, 4.5, 6], ys: [0, 1.5, 3, 4.5, 6].map(Math.sin), lo: -0.5, hi: 6.5, ylo: -2, yhi: 2 },
  { name: '5 个点，4 个共线', xs: [-2, -1, 0, 1, 2], ys: [-1, -0.5, 0, 0.5, 1.6], lo: -2.5, hi: 2.5, ylo: -2.5, yhi: 2.5 }
]
const pi = ref(0)
const xs = ref<number[]>([])
const ys = ref<number[]>([])
const hi = ref(-1) // 高亮的基函数下标，−1 表示显示全部
function load() {
  const p = PRESETS[pi.value]
  xs.value = p.xs.slice(); ys.value = p.ys.slice(); hi.value = -1
}
load()
watch(pi, load)
const P = computed(() => PRESETS[pi.value])

const W = 640, H = 300
const sx = computed(() => makeScale(P.value.lo, P.value.hi, 34, W - 14))
const sy = computed(() => makeScale(P.value.ylo, P.value.yhi, H - 18, 12))
const COLORS = ['var(--ex)', 'var(--warn)', 'var(--prin)', 'var(--def)', 'var(--exam)']

const tab = computed(() => dividedDiff(xs.value, ys.value))
const coef = computed(() => tab.value[0])
const mono = computed(() => newtonToMonomial(xs.value, coef.value))
const realDeg = computed(() => {
  const m = mono.value
  for (let i = m.length - 1; i >= 0; i--) if (Math.abs(m[i]) > 1e-9) return i
  return 0
})
const Pf = (x: number) => newtonEval(xs.value, coef.value, x)
const basisPath = (k: number, scaled: boolean) =>
  pathOf(x => (scaled ? ys.value[k] : 1) * lagrangeBasis(xs.value, k, x), P.value.lo, P.value.hi, sx.value, sy.value, [P.value.ylo - 1, P.value.yhi + 1])
// 高亮的 L_k 在各节点上的取值（应为 0/1）
const hiVals = computed(() => hi.value < 0 ? [] : xs.value.map(x => lagrangeBasis(xs.value, hi.value, x)))

// 拖动数据点（只改纵坐标）
const svg = ref<SVGSVGElement | null>(null)
const drag = ref(-1)
function move(e: PointerEvent) {
  if (drag.value < 0 || !svg.value) return
  const m = svg.value.getScreenCTM()
  if (!m) return
  const pt = svg.value.createSVGPoint()
  pt.x = e.clientX; pt.y = e.clientY
  const p = pt.matrixTransform(m.inverse())
  const y = (sy.value as any).inv(p.y)
  const v = Math.max(P.value.ylo, Math.min(P.value.yhi, Math.round(y * 20) / 20))
  ys.value = ys.value.map((u, i) => i === drag.value ? v : u)
}
</script>

<template>
  <Widget title="拉格朗日插值：每个基函数只在一个节点上取 1">
    <div class="ctrl">
      <select v-model.number="pi"><option v-for="(p, i) in PRESETS" :key="i" :value="i">{{ p.name }}</option></select>
      <button class="btn" @click="load">⟲ 还原</button>
    </div>
    <div class="ctrl">
      <div class="seg">
        <button :class="{ on: hi < 0 }" @click="hi = -1">全部 y<sub>k</sub>L<sub>k</sub></button>
        <button v-for="(x, k) in xs" :key="k" :class="{ on: hi === k }" @click="hi = k">L<sub>{{ k + 1 }}</sub></button>
      </div>
    </div>
    <svg ref="svg" :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto;touch-action:none" @pointermove="move" @pointerup="drag = -1" @pointerleave="drag = -1">
      <line :x1="sx(P.lo)" :x2="sx(P.hi)" :y1="sy(0)" :y2="sy(0)" style="stroke:var(--ink-3)" />
      <line v-if="P.lo < 0 && P.hi > 0" :x1="sx(0)" :x2="sx(0)" :y1="sy(P.ylo)" :y2="sy(P.yhi)" style="stroke:var(--line)" />
      <line :x1="sx(P.lo)" :x2="sx(P.hi)" :y1="sy(1)" :y2="sy(1)" style="stroke:var(--line)" stroke-dasharray="2 4" />
      <template v-if="hi < 0">
        <path v-for="(x, k) in xs" :key="k" :d="basisPath(k, true)" :style="{ fill: 'none', stroke: COLORS[k % 5], strokeWidth: 1.4, opacity: .75 }" stroke-dasharray="5 4" />
        <path :d="pathOf(Pf, P.lo, P.hi, sx, sy, [P.ylo - 1, P.yhi + 1])" style="fill:none;stroke:var(--accent);stroke-width:2.8" />
      </template>
      <template v-else>
        <path :d="basisPath(hi, false)" :style="{ fill: 'none', stroke: COLORS[hi % 5], strokeWidth: 2.6 }" />
        <circle v-for="(x, k) in xs" :key="'h' + k" :cx="sx(x)" :cy="sy(hiVals[k])" r="5" :style="{ fill: k === hi ? COLORS[hi % 5] : 'var(--vp-c-bg)', stroke: COLORS[hi % 5], strokeWidth: 2 }" />
      </template>
      <g v-if="hi < 0">
        <circle v-for="(x, k) in xs" :key="'p' + k" :cx="sx(x)" :cy="sy(ys[k])" r="7" style="fill:var(--accent);stroke:var(--vp-c-bg);stroke-width:2;cursor:ns-resize" @pointerdown.prevent="drag = k" />
      </g>
    </svg>
    <p v-if="hi >= 0" class="widget-note" style="margin-top:4px">L<sub>{{ hi + 1 }}</sub>(x) = ∏<sub>j≠{{ hi + 1 }}</sub> (x − x<sub>j</sub>)/(x<sub>{{ hi + 1 }}</sub> − x<sub>j</sub>)，在各节点上的值：<b>{{ hiVals.map(v => fix(v, 6)).join(', ') }}</b>——正是第 {{ hi + 1 }} 个单位向量。展开：L<sub>{{ hi + 1 }}</sub>(x) = {{ realPolyStr(newtonToMonomial(xs, dividedDiff(xs, xs.map((_, i) => i === hi ? 1 : 0))[0])) }}</p>
    <div class="out"><span class="lbl">插值多项式（单项式系数，由牛顿形式展开）</span>P(x) = {{ realPolyStr(mono) }}</div>
    <div class="stats">
      <div class="stat"><b>{{ xs.length - 1 }}</b><span>次数上界 n − 1</span></div>
      <div class="stat"><b :class="realDeg < xs.length - 1 ? 'bad-c' : ''">{{ realDeg }}</b><span>实际次数</span></div>
    </div>
    <table class="mini-table" style="font-variant-numeric:tabular-nums">
      <thead><tr><th>x<sub>i</sub></th><th>f[x<sub>i</sub>] = y<sub>i</sub></th><th v-for="j in xs.length - 1" :key="j">{{ j }} 阶差商</th></tr></thead>
      <tbody>
        <tr v-for="(x, i) in xs" :key="i">
          <td>{{ fix(x, 3) }}</td>
          <td v-for="j in xs.length" :key="j" :style="{ fontWeight: i === 0 ? 700 : 400, color: i === 0 ? 'var(--accent)' : '' }">{{ i + j - 1 < xs.length ? fix(tab[i][j - 1], 4) : '' }}</td>
        </tr>
      </tbody>
    </table>
    <p class="widget-note">上下拖动橙色圆点改 y 值。虚线是各项 y<sub>k</sub>L<sub>k</sub>(x)，它们的和就是粗实线 P(x)。差商表第一行（加粗）就是牛顿形式 P(x) = c₀ + c₁(x − x₁) + c₂(x − x₁)(x − x₂) + … 的系数。试试“4 个共线”：把最后一个点拖到直线上，实际次数立刻降到 1。</p>
  </Widget>
</template>
