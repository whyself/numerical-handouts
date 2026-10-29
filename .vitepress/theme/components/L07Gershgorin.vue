<script setup lang="ts">
import { ref, computed } from 'vue'
import { gershgorin, eigvalsSmall, isSymmetric, type Mat } from '../lib/l07'
import { makeScale } from '../lib/plot'

// Gershgorin 圆盘：每一行给一个圆盘，所有特征值都落在圆盘的并集里
const PRESETS: { name: string; A: Mat }[] = [
  { name: '课件 P17 的对称矩阵', A: [[4, -1, 0], [-1, 3, -1], [0, -1, 2]] },
  { name: '非对称：有复特征值', A: [[2, -3, 0], [3, 2, 0.5], [0.2, 0, -3]] },
  { name: '严格对角占优', A: [[6, 1, -1], [0.5, -4, 1], [1, 1, 9]] },
  { name: '正定但圆盘碰到 0', A: [[2, -1, 0], [-1, 2, -1], [0, -1, 2]] }
]
const pi = ref(0)
const A = ref<Mat>(PRESETS[0].A.map(r => r.slice()))
function load(i: number) { pi.value = i; A.value = PRESETS[i].A.map(r => r.slice()) }
function setEntry(i: number, j: number, e: Event) {
  const v = parseFloat((e.target as HTMLInputElement).value)
  if (!Number.isFinite(v)) return
  const B = A.value.map(r => r.slice()); B[i][j] = v
  if ((e.target as HTMLInputElement).dataset.sym === '1') B[j][i] = v
  A.value = B; pi.value = -1
}
const keepSym = ref(true)
const disks = computed(() => gershgorin(A.value))
const lams = computed(() => eigvalsSmall(A.value))
const sym = computed(() => isSymmetric(A.value))
const COLORS = ['var(--accent)', 'var(--prin)', 'var(--warn)']

// 视窗：包住所有圆盘和特征值
const box = computed(() => {
  let x0 = Infinity, x1 = -Infinity, y = 0.5
  disks.value.forEach(d => { x0 = Math.min(x0, d.c - d.r); x1 = Math.max(x1, d.c + d.r); y = Math.max(y, d.r) })
  lams.value.forEach(l => { x0 = Math.min(x0, l.re); x1 = Math.max(x1, l.re); y = Math.max(y, Math.abs(l.im)) })
  const pad = 0.12 * Math.max(x1 - x0, 2 * y, 1)
  return { x0: x0 - pad, x1: x1 + pad, y: y + pad }
})
const W = 640, H = 300
// 等比例：按宽、高中较紧的那个定尺度
const geom = computed(() => {
  const { x0, x1, y } = box.value
  const k = Math.min((W - 20) / (x1 - x0), (H - 30) / (2 * y))
  const cx = (x0 + x1) / 2
  return { k, sx: makeScale(cx - (W - 20) / (2 * k), cx + (W - 20) / (2 * k), 10, W - 10), sy: makeScale(-(H - 30) / (2 * k), (H - 30) / (2 * k), H - 20, 10) }
})
const ticks = computed(() => {
  const { x0, x1 } = box.value, span = x1 - x0
  const step = span > 20 ? 5 : span > 8 ? 2 : 1
  const out: number[] = []
  for (let t = Math.ceil(x0 / step) * step; t <= x1; t += step) out.push(t)
  return out
})
const inUnion = (l: { re: number; im: number }) => disks.value.some(d => Math.hypot(l.re - d.c, l.im) <= d.r + 1e-9)
const lowerBound = computed(() => Math.min(...disks.value.map(d => d.c - d.r)))
const upperBound = computed(() => Math.max(...disks.value.map(d => d.c + d.r)))
const fmt = (v: number) => (Math.abs(v) < 5e-12 ? 0 : v).toFixed(3)
</script>

<template>
  <Widget title="Gershgorin 圆盘：不解方程，先圈出特征值的范围">
    <div class="ctrl">
      <div class="seg"><button v-for="(p, i) in PRESETS" :key="i" :class="{ on: pi === i }" @click="load(i)">{{ p.name }}</button></div>
    </div>
    <div class="two-col" style="display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px;align-items:start">
      <div>
        <div style="display:grid;grid-template-columns:repeat(3,64px);gap:6px">
          <template v-for="(row, i) in A" :key="i">
            <input v-for="(v, j) in row" :key="`${i}-${j}`" type="number" step="0.5" :value="v" :data-sym="keepSym && i !== j ? '1' : '0'"
              :style="{ width: '64px', font: '14px var(--vp-font-family-mono)', padding: '4px 6px', border: '1px solid var(--line)', borderRadius: '6px', background: i === j ? 'var(--accent-soft)' : 'var(--vp-c-bg)', color: 'var(--ink)' }"
              @change="setEntry(i, j, $event)">
          </template>
        </div>
        <label class="widget-note" style="display:flex;gap:6px;align-items:center;margin-top:8px"><input v-model="keepSym" type="checkbox">改非对角元时保持对称</label>
      </div>
      <table class="mini-table" style="font-variant-numeric:tabular-nums">
        <thead><tr><th>行 i</th><th>圆心 a<sub>ii</sub></th><th>半径 R<sub>i</sub></th><th>D<sub>i</sub> ∩ ℝ</th></tr></thead>
        <tbody>
          <tr v-for="(d, i) in disks" :key="i">
            <td :style="{ color: COLORS[i], fontWeight: 700 }">D{{ i + 1 }}</td><td>{{ fmt(d.c) }}</td><td>{{ fmt(d.r) }}</td><td>[{{ fmt(d.c - d.r) }}, {{ fmt(d.c + d.r) }}]</td>
          </tr>
        </tbody>
      </table>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto;margin-top:8px">
      <line x1="10" :x2="W - 10" :y1="geom.sy(0)" :y2="geom.sy(0)" style="stroke:var(--ink-3)" />
      <template v-for="t in ticks" :key="t">
        <line :x1="geom.sx(t)" :x2="geom.sx(t)" :y1="geom.sy(0) - 3" :y2="geom.sy(0) + 3" style="stroke:var(--ink-3)" />
        <text :x="geom.sx(t)" :y="geom.sy(0) + 15" font-size="11" text-anchor="middle" style="fill:var(--ink-3)">{{ t }}</text>
      </template>
      <text :x="W - 12" :y="geom.sy(0) - 6" font-size="12" text-anchor="end" style="fill:var(--ink-3)">Re z</text>
      <circle v-for="(d, i) in disks" :key="'d' + i" :cx="geom.sx(d.c)" :cy="geom.sy(0)" :r="Math.max(d.r * geom.k, 1.5)"
        :style="{ fill: COLORS[i], fillOpacity: 0.12, stroke: COLORS[i], strokeWidth: 1.8 }" />
      <circle v-for="(d, i) in disks" :key="'c' + i" :cx="geom.sx(d.c)" :cy="geom.sy(0)" r="2.5" :style="{ fill: COLORS[i] }" />
      <g v-for="(l, i) in lams" :key="'l' + i">
        <line :x1="geom.sx(l.re) - 6" :x2="geom.sx(l.re) + 6" :y1="geom.sy(l.im) - 6" :y2="geom.sy(l.im) + 6" style="stroke:var(--ink);stroke-width:2.5" />
        <line :x1="geom.sx(l.re) - 6" :x2="geom.sx(l.re) + 6" :y1="geom.sy(l.im) + 6" :y2="geom.sy(l.im) - 6" style="stroke:var(--ink);stroke-width:2.5" />
      </g>
    </svg>
    <p class="widget-note" style="margin-bottom:6px">特征值（× 标记）：<b>{{ lams.map(l => l.im === 0 ? fmt(l.re) : `${fmt(l.re)} ${l.im > 0 ? '+' : '−'} ${fmt(Math.abs(l.im))}i`).join('，') }}</b>
      —— 都在圆盘并集内：<b :class="lams.every(inUnion) ? 'ok-c' : 'bad-c'">{{ lams.every(inUnion) ? '是' : '否' }}</b></p>
    <p v-if="sym" class="widget-note" style="margin-bottom:6px">矩阵对称 ⇒ 特征值都是实数，都在 [{{ fmt(lowerBound) }}, {{ fmt(upperBound) }}] 中。
      <b v-if="lowerBound > 0" class="ok-c">圆盘全在右半平面：λ<sub>min</sub> ≥ {{ fmt(lowerBound) }} &gt; 0，矩阵正定。</b>
      <b v-else>圆盘越过了 0，这个判据给不出正定性的结论（不代表不正定：看真实的最小特征值 {{ fmt(Math.min(...lams.map(l => l.re))) }}）。</b>
    </p>
    <p class="widget-note">圆盘是整个复平面里的圆；对称矩阵只需看它们与实轴的交（课件 P17 的线段图）。可以直接改矩阵元素（回车或失焦后生效），看圆盘跟着移动。</p>
  </Widget>
</template>
