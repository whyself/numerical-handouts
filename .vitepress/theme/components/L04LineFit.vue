<script setup lang="ts">
import { ref, computed } from 'vue'
import { makeScale, pathOf, sci } from '../lib/plot'
import { householderQR, applyQt, solveUpper, matvec, transpose, svgPoint, type Mat } from '../lib/l04'

// 拖动数据点做最小二乘多项式拟合：A 的第 i 行是 (1, xᵢ, xᵢ², …)，用 Householder QR 求解
const W = 600, H = 320
const sx = makeScale(0, 10, 34, W - 14)
const sy = makeScale(-1, 9, H - 24, 12)
const INIT = [[0.8, 1.6], [1.9, 2.2], [3.1, 3.9], [4.0, 3.7], [5.2, 5.1], [6.1, 5.0], [7.3, 6.6], [8.5, 6.9], [9.3, 8.1]]
const pts = ref(INIT.map(([x, y]) => ({ x, y })))
const deg = ref(1)
const svg = ref<SVGSVGElement | null>(null)
const drag = ref(-1)

// 把 x 先缩放到 [−1, 1] 再取幂，避免列的量级差得太远（同一个多项式空间，换了一组基）
const u = (x: number) => (x - 5) / 5
const fit = computed(() => {
  const n = deg.value + 1
  if (pts.value.length < n) return null
  const A: Mat = pts.value.map(p => Array.from({ length: n }, (_, j) => u(p.x) ** j))
  const b = pts.value.map(p => p.y)
  const { R, vs } = householderQR(A)
  const c = applyQt(vs, b)
  const x = solveUpper(R, c.slice(0, n))
  const r = b.map((bi, i) => bi - matvec(A, x)[i])
  const Atr = matvec(transpose(A), r)
  return { x, r, sse: r.reduce((s, v) => s + v * v, 0), atr: Math.max(...Atr.map(Math.abs)), tail: Math.hypot(...c.slice(n)) ** 2 }
})
const poly = (x: number) => fit.value ? fit.value.x.reduce((s, c, j) => s + c * u(x) ** j, 0) : NaN

function down(i: number, e: PointerEvent) {
  drag.value = i
  try { (e.target as Element).setPointerCapture(e.pointerId) } catch {}
}
function move(e: PointerEvent) {
  if (drag.value < 0 || !svg.value) return
  const p = svgPoint(e, svg.value)
  pts.value[drag.value] = { x: Math.min(9.9, Math.max(0.1, sx.inv(p.x))), y: Math.min(8.8, Math.max(-0.8, sy.inv(p.y))) }
}
function add(e: MouseEvent) {
  if (!svg.value || (e.target as Element).tagName === 'circle') return
  const p = svgPoint(e, svg.value)
  pts.value.push({ x: sx.inv(p.x), y: sy.inv(p.y) })
}
const outlier = () => pts.value.push({ x: 5.5, y: 0.2 })
const reset = () => { pts.value = INIT.map(([x, y]) => ({ x, y })) }
</script>

<template>
  <Widget title="最小二乘拟合：拖动数据点，看残差">
    <div class="ctrl">
      <div class="seg">
        <button v-for="d in [0, 1, 2, 3, 5]" :key="d" :class="{ on: deg === d }" @click="deg = d">{{ d === 0 ? '常数' : d === 1 ? '直线' : d + ' 次' }}</button>
      </div>
      <button class="btn" @click="outlier">加一个离群点</button>
      <button class="btn" @click="pts.pop()">删去最后一个点</button>
      <button class="btn" @click="reset">⟲ 复原</button>
    </div>
    <svg ref="svg" :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto;touch-action:none" @pointermove="move" @pointerup="drag = -1" @pointerleave="drag = -1" @click="add">
      <rect :x="sx(0)" :y="sy(9)" :width="sx(10) - sx(0)" :height="sy(-1) - sy(9)" style="fill:transparent;stroke:var(--line-2)" />
      <line :x1="sx(0)" :x2="sx(10)" :y1="sy(0)" :y2="sy(0)" style="stroke:var(--line)" />
      <path v-if="fit" :d="pathOf(poly, 0, 10, sx, sy, [-1, 9])" style="fill:none;stroke:var(--accent);stroke-width:2.5" />
      <g v-if="fit">
        <line v-for="(p, i) in pts" :key="'r' + i" :x1="sx(p.x)" :x2="sx(p.x)" :y1="sy(p.y)" :y2="sy(p.y - fit.r[i])" style="stroke:var(--warn);stroke-width:2" />
      </g>
      <circle v-for="(p, i) in pts" :key="i" :cx="sx(p.x)" :cy="sy(p.y)" r="7" style="fill:var(--prin);cursor:grab;stroke:var(--vp-c-bg);stroke-width:2" @pointerdown="down(i, $event)" />
    </svg>
    <div v-if="fit" class="stats">
      <div class="stat"><b>{{ fit.sse.toFixed(4) }}</b><span>‖r‖² = Σ 残差²</span></div>
      <div class="stat"><b>{{ fit.tail.toFixed(4) }}</b><span>‖Qᵀb 的后 m − n 个分量‖²</span></div>
      <div class="stat"><b>{{ sci(fit.atr) }}</b><span>max |(Aᵀr)ⱼ|：残差 ⟂ 列空间</span></div>
      <div class="stat"><b>{{ pts.length }} × {{ deg + 1 }}</b><span>A 的形状 m × n</span></div>
    </div>
    <p v-else class="widget-note bad-c">点数少于未知系数个数，A 不再列满秩，最小二乘解不唯一。</p>
    <p class="widget-note">红色竖线是残差 rᵢ = bᵢ − p(xᵢ)，最小二乘让它们的平方和最小。点击空白处可以加点。第三个数字说明 Aᵀr 在舍入误差范围内为 0——这就是法线方程；第二个数字与第一个相同，说明残差的长度可以直接从 Qᵀb 读出来（4.13 节）。点数等于系数个数时（例如只剩 2 个点拟合直线），曲线正好穿过所有点，残差为 0。</p>
  </Widget>
</template>
