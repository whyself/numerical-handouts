<script setup lang="ts">
import { ref, computed } from 'vue'
import { mv, inv2, svd2, vnorm, type Mat2, type Vec2 } from '../lib/l06'
import { makeScale, sci } from '../lib/plot'

// 条件数：扰动右端项 b → b + e，看解 x = A⁻¹b 变了多少。两条直线越接近平行，交点越敏感
const eps = ref(0.05) // A = [[1, 1], [1, 1 + ε]]，ε 越小越接近奇异
const useWell = ref(false)
const A = computed<Mat2>(() => useWell.value ? [3, 1, 1, 2] : [1, 1, 1, 1 + eps.value])
const psi = ref(45)   // b 的方向角（度），‖b‖₂ = 2
const phi = ref(100)  // e 的方向角
const logDelta = ref(-2) // ‖e‖/‖b‖ = 10^logDelta

const dir = (deg: number): Vec2 => [Math.cos(deg * Math.PI / 180), Math.sin(deg * Math.PI / 180)]
const b = computed<Vec2>(() => dir(psi.value).map(t => 2 * t) as Vec2)
const e = computed<Vec2>(() => dir(phi.value).map(t => 2 * 10 ** logDelta.value * t) as Vec2)
const Ai = computed(() => inv2(A.value))
const x = computed(() => mv(Ai.value, b.value))
const xt = computed(() => mv(Ai.value, [b.value[0] + e.value[0], b.value[1] + e.value[1]]))
const relB = computed(() => vnorm(e.value, 2) / vnorm(b.value, 2))
const relX = computed(() => Math.hypot(xt.value[0] - x.value[0], xt.value[1] - x.value[1]) / vnorm(x.value, 2))
const sv = computed(() => svd2(A.value))
const cond = computed(() => sv.value.s1 / sv.value.s2)

// 最坏情形：b 沿 u₁（A⁻¹ 压缩最多，‖x‖ 最小），e 沿 u₂（A⁻¹ 放大最多）
// 不取整：病态时 b 的方向差 0.5° 就会让 ‖A⁻¹b‖ 差很多
const ang = (u: Vec2) => ((Math.atan2(u[1], u[0]) * 180 / Math.PI) + 360) % 360
function worst() { psi.value = ang(sv.value.u1); phi.value = ang(sv.value.u2) }
function best() { psi.value = ang(sv.value.u2); phi.value = ang(sv.value.u1) }

// 画两行方程对应的直线 a_i1 x + a_i2 y = b_i，原方程实线、扰动后虚线
const W = 640, H = 300
const view = computed(() => {
  const cx = (x.value[0] + xt.value[0]) / 2, cy = (x.value[1] + xt.value[1]) / 2
  const r = Math.max(1.5, 0.7 * Math.hypot(xt.value[0] - x.value[0], xt.value[1] - x.value[1]))
  const ry = r, rx = r * W / H
  return { sx: makeScale(cx - rx, cx + rx, 0, W), sy: makeScale(cy - ry, cy + ry, H, 0), cx, cy, rx, ry }
})
function seg(a1: number, a2: number, rhs: number) {
  const { sx, sy, cx, cy, rx, ry } = view.value
  // 直线上离视窗中心最近的点 + 方向 (−a2, a1)，取足够长的一段
  const n2 = a1 * a1 + a2 * a2, t = (rhs - a1 * cx - a2 * cy) / n2
  const px = cx + t * a1, py = cy + t * a2, L = 3 * (rx + ry) / Math.sqrt(n2)
  return { x1: sx(px - L * a2), y1: sy(py + L * a1), x2: sx(px + L * a2), y2: sy(py - L * a1) }
}
const lines = computed(() => {
  const [a, bb, c, d] = A.value
  const bp: Vec2 = [b.value[0] + e.value[0], b.value[1] + e.value[1]]
  return [
    { ...seg(a, bb, b.value[0]), dash: '', col: 'var(--prin)' },
    { ...seg(c, d, b.value[1]), dash: '', col: 'var(--ex)' },
    { ...seg(a, bb, bp[0]), dash: '6 4', col: 'var(--prin)' },
    { ...seg(c, d, bp[1]), dash: '6 4', col: 'var(--ex)' }
  ]
})
const fmt = (v: number) => Number(v.toFixed(4)).toString()
</script>

<template>
  <Widget title="条件数：右端项扰动一点，解会变多少">
    <div class="ctrl">
      <div class="seg">
        <button :class="{ on: !useWell }" @click="useWell = false">A = [[1, 1], [1, 1 + ε]]</button>
        <button :class="{ on: useWell }" @click="useWell = true">A = [[3, 1], [1, 2]]</button>
      </div>
      <label v-if="!useWell">ε = <b>{{ eps.toFixed(3) }}</b><input v-model.number="eps" type="range" min="0.005" max="1" step="0.005"></label>
    </div>
    <div class="ctrl">
      <label>b 的方向 <b>{{ psi.toFixed(1) }}°</b><input v-model.number="psi" type="range" min="0" max="359.9" step="any" style="width:130px"></label>
      <label>扰动 e 的方向 <b>{{ phi.toFixed(1) }}°</b><input v-model.number="phi" type="range" min="0" max="359.9" step="any" style="width:130px"></label>
      <label>‖e‖/‖b‖ = <b>{{ sci(10 ** logDelta, 0) }}</b><input v-model.number="logDelta" type="range" min="-4" max="-1" step="1" style="width:90px"></label>
    </div>
    <div class="ctrl">
      <button class="btn primary" @click="worst">最坏组合：b ∥ u₁，e ∥ u₂</button>
      <button class="btn" @click="best">最好组合：b ∥ u₂，e ∥ u₁</button>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto;border:1px solid var(--line-2);border-radius:8px">
      <line v-for="(l, i) in lines" :key="i" :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2" :style="{ stroke: l.col, strokeWidth: 2 }" :stroke-dasharray="l.dash" />
      <line :x1="view.sx(x[0])" :y1="view.sy(x[1])" :x2="view.sx(xt[0])" :y2="view.sy(xt[1])" style="stroke:var(--warn);stroke-width:1.5" />
      <circle :cx="view.sx(x[0])" :cy="view.sy(x[1])" r="5.5" style="fill:var(--ink)" />
      <text :x="view.sx(x[0]) + 8" :y="view.sy(x[1]) + 16" font-size="13" style="fill:var(--ink)">x</text>
      <circle :cx="view.sx(xt[0])" :cy="view.sy(xt[1])" r="5.5" style="fill:var(--warn)" />
      <text :x="view.sx(xt[0]) + 8" :y="view.sy(xt[1]) - 8" font-size="13" style="fill:var(--warn)">x + A⁻¹e</text>
    </svg>
    <div class="stats">
      <div class="stat"><b>{{ sci(relB) }}</b><span>b 的相对误差</span></div>
      <div class="stat"><b>{{ sci(relX) }}</b><span>x 的相对误差</span></div>
      <div class="stat"><b>{{ (relX / relB).toFixed(2) }}</b><span>放大倍数</span></div>
      <div class="stat"><b>{{ cond.toFixed(2) }}</b><span>cond₂(A) = ‖A‖₂‖A⁻¹‖₂</span></div>
    </div>
    <p class="widget-note">x = ({{ fmt(x[0]) }}, {{ fmt(x[1]) }})，扰动后 x̃ = ({{ fmt(xt[0]) }}, {{ fmt(xt[1]) }})。蓝、绿实线是两行方程，虚线是右端加了扰动后的方程，交点就是解。转动两个方向角：放大倍数始终 ≤ cond₂(A)，点“最坏组合”时恰好取等（6.4 节“等号可以取到”）。ε 越小两条直线越接近平行，cond₂(A) 约为 4/ε。</p>
  </Widget>
</template>
