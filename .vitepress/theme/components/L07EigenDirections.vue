<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { eig2Real, eigvalsSmall, matVec, norm2, isSymmetric, type Mat } from '../lib/l07'
import { makeScale } from '../lib/plot'

// 2×2 矩阵把单位圆变成椭圆；转动 x，看 Ax 什么时候与 x 共线（= 特征方向）
const PRESETS: { name: string; A: Mat }[] = [
  { name: '对称 (2 1; 1 2)', A: [[2, 1], [1, 2]] },
  { name: '对角 diag(2, 0.5)', A: [[2, 0], [0, 0.5]] },
  { name: '非对称 (1 1; 0 2)', A: [[1, 1], [0, 2]] },
  { name: '剪切 (1 1; 0 1)', A: [[1, 1], [0, 1]] },
  { name: '旋转 90°', A: [[0, -1], [1, 0]] },
  { name: '有负特征值 (0 1; 1 0)', A: [[0, 1], [1, 0]] }
]
const pi = ref(0)
const a = ref(2), b = ref(1), c = ref(1), d = ref(2)
function load(i: number) { pi.value = i; [[a.value, b.value], [c.value, d.value]] = PRESETS[i].A }
const A = computed<Mat>(() => [[a.value, b.value], [c.value, d.value]])
const theta = ref(20)
const x = computed(() => [Math.cos(theta.value * Math.PI / 180), Math.sin(theta.value * Math.PI / 180)])
const Ax = computed(() => matVec(A.value, x.value))
const eigs = computed(() => eig2Real(A.value))
const lams = computed(() => eigvalsSmall(A.value))
// x 与 Ax 的夹角（按直线算，0° 表示共线）
const angle = computed(() => {
  const n = norm2(Ax.value)
  if (n < 1e-12) return 0
  const s = Math.abs(x.value[0] * Ax.value[1] - x.value[1] * Ax.value[0]) / n
  return Math.asin(Math.min(1, s)) * 180 / Math.PI
})
const along = computed(() => x.value[0] * Ax.value[0] + x.value[1] * Ax.value[1])
const hit = computed(() => angle.value < 0.6)

const W = 360
const R = computed(() => {
  let m = 1.2
  for (let k = 0; k < 64; k++) { const t = 2 * Math.PI * k / 64; m = Math.max(m, norm2(matVec(A.value, [Math.cos(t), Math.sin(t)]))) }
  return m * 1.12
})
const sx = computed(() => makeScale(-R.value, R.value, 8, W - 8))
const sy = computed(() => makeScale(-R.value, R.value, W - 8, 8))
const curve = (f: (t: number) => number[]) => {
  let p = ''
  for (let k = 0; k <= 120; k++) { const t = 2 * Math.PI * k / 120, q = f(t); p += `${k ? 'L' : 'M'}${sx.value(q[0]).toFixed(1)},${sy.value(q[1]).toFixed(1)}` }
  return p
}
const circle = computed(() => curve(t => [Math.cos(t), Math.sin(t)]))
const ellipse = computed(() => curve(t => matVec(A.value, [Math.cos(t), Math.sin(t)])))
function arrow(v: number[]) {
  const X = sx.value(v[0]), Y = sy.value(v[1]), O = sx.value(0)
  const L = Math.hypot(X - O, Y - sy.value(0))
  if (L < 1) return ''
  const ux = (X - O) / L, uy = (Y - sy.value(0)) / L
  return `M${O},${sy.value(0)}L${X},${Y}M${X - 9 * ux + 4.5 * uy},${Y - 9 * uy - 4.5 * ux}L${X},${Y}L${X - 9 * ux - 4.5 * uy},${Y - 9 * uy + 4.5 * ux}`
}

let timer: ReturnType<typeof setInterval> | undefined
const sweeping = ref(false)
function sweep() {
  clearInterval(timer)
  if (sweeping.value) { sweeping.value = false; return }
  sweeping.value = true
  timer = setInterval(() => { theta.value = (theta.value + 1) % 360 }, 40)
}
onBeforeUnmount(() => clearInterval(timer))
const fmt = (v: number) => (Math.abs(v) < 5e-13 ? 0 : v).toFixed(3)
const lamText = computed(() => lams.value.map(l => l.im === 0 ? fmt(l.re) : `${fmt(l.re)} ${l.im > 0 ? '+' : '−'} ${Math.abs(l.im).toFixed(3)}i`).join('，'))
</script>

<template>
  <Widget title="哪些方向在矩阵作用下不变？">
    <div class="ctrl">
      <div class="seg"><button v-for="(p, i) in PRESETS" :key="i" :class="{ on: pi === i }" @click="load(i)">{{ p.name }}</button></div>
    </div>
    <div class="ctrl">
      <label>a₁₁ <input v-model.number="a" type="range" min="-3" max="3" step="0.1" style="width:110px"><b>{{ a.toFixed(1) }}</b></label>
      <label>a₁₂ <input v-model.number="b" type="range" min="-3" max="3" step="0.1" style="width:110px"><b>{{ b.toFixed(1) }}</b></label>
      <label>a₂₁ <input v-model.number="c" type="range" min="-3" max="3" step="0.1" style="width:110px"><b>{{ c.toFixed(1) }}</b></label>
      <label>a₂₂ <input v-model.number="d" type="range" min="-3" max="3" step="0.1" style="width:110px"><b>{{ d.toFixed(1) }}</b></label>
    </div>
    <div class="ctrl">
      <label>x 的方向 θ = <b>{{ theta }}°</b><input v-model.number="theta" type="range" min="0" max="359" step="1"></label>
      <button class="btn" :class="{ primary: sweeping }" @click="sweep">{{ sweeping ? '■ 停止' : '▶ 转一圈' }}</button>
    </div>
    <div class="two-col" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start">
      <svg :viewBox="`0 0 ${W} ${W}`" style="width:100%;height:auto">
        <line :x1="sx(-R)" :x2="sx(R)" :y1="sy(0)" :y2="sy(0)" style="stroke:var(--line)" />
        <line :x1="sx(0)" :x2="sx(0)" :y1="sy(-R)" :y2="sy(R)" style="stroke:var(--line)" />
        <line v-for="(e, i) in eigs" :key="i" :x1="sx(-R * e.v[0] * 1.5)" :y1="sy(-R * e.v[1] * 1.5)" :x2="sx(R * e.v[0] * 1.5)" :y2="sy(R * e.v[1] * 1.5)" style="stroke:var(--ex);stroke-width:1.5" stroke-dasharray="6 4" />
        <path :d="circle" style="fill:none;stroke:var(--ink-3)" stroke-dasharray="3 3" />
        <path :d="ellipse" style="fill:var(--accent-soft);fill-opacity:.35;stroke:var(--prin);stroke-width:1.5" />
        <path :d="arrow(x)" style="fill:none;stroke:var(--accent);stroke-width:2.5" />
        <path :d="arrow(Ax)" style="fill:none;stroke-width:2.5" :style="{ stroke: hit ? 'var(--ex)' : 'var(--prin)' }" />
        <text :x="sx(x[0] * 1.08)" :y="sy(x[1] * 1.08)" font-size="13" style="fill:var(--accent);font-weight:700">x</text>
        <text :x="sx(Ax[0]) + 6" :y="sy(Ax[1]) - 6" font-size="13" style="font-weight:700" :style="{ fill: hit ? 'var(--ex)' : 'var(--prin)' }">Ax</text>
      </svg>
      <div>
        <div class="stats">
          <div class="stat"><b>{{ angle.toFixed(1) }}°</b><span>x 与 Ax 所在直线的夹角</span></div>
          <div class="stat"><b :class="{ 'ok-c': hit }">{{ hit ? fmt(along) : '—' }}</b><span>共线时 Ax = λx 的 λ</span></div>
        </div>
        <p class="widget-note" style="margin-bottom:6px">特征值：<b>{{ lamText }}</b>{{ isSymmetric(A) ? '（对称矩阵：全是实数，特征方向互相垂直）' : '' }}</p>
        <p class="widget-note" style="margin-bottom:6px">实特征方向：<b>{{ eigs.length ? eigs.map(e => `λ = ${fmt(e.lambda)}`).join('；') : '没有（不存在实的不变方向）' }}</b></p>
        <p class="widget-note">虚线圆是单位圆，彩色椭圆是它在 A 下的像，绿色虚线是实特征方向。x 转到绿色虚线上时 Ax 变绿：此时矩阵乘法只改变长度（λ &lt; 0 时还反向）。</p>
      </div>
    </div>
    <p class="widget-note">对比几种情形：对称矩阵的两条特征方向恰好是椭圆的两条主轴且互相垂直；非对称矩阵 (1 1; 0 2) 的两条特征方向不垂直；剪切矩阵只有一条特征方向（特征值 1 的代数重数 2、几何重数 1，不可对角化）；旋转矩阵没有实的不变方向。</p>
  </Widget>
</template>
