<script setup lang="ts">
import { ref, computed } from 'vue'
import { makeScale, sci } from '../lib/plot'
import { householderQR, orthLoss, factorResidual, svgPoint, type Mat } from '../lib/l04'

// 上半部分：二维里的一次 Householder 反射；下半部分：对一个矩阵逐列反射得到 R
const W = 520, H = 330
const sx = makeScale(-3.2, 3.2, 20, W - 20)
const sy = makeScale(-2, 2, H - 14, 14)
const x = ref({ x: 2.2, y: 1.3 })
const target = ref<1 | -1>(1)       // Hx = target·‖x‖e₁
const svg = ref<SVGSVGElement | null>(null)
const drag = ref(false)

const nx = computed(() => Math.hypot(x.value.x, x.value.y))
// v ∝ x − target·‖x‖e₁
const vRaw = computed(() => ({ x: x.value.x - target.value * nx.value, y: x.value.y }))
const vLen = computed(() => Math.hypot(vRaw.value.x, vRaw.value.y))
// x 已经落在目标轴上时 v = 0，此时取 v = e₂（反射后 x 不变）
const v = computed(() => vLen.value < 1e-12 ? { x: 0, y: 1 } : { x: vRaw.value.x / vLen.value, y: vRaw.value.y / vLen.value })
const Hx = computed(() => {
  const d = 2 * (v.value.x * x.value.x + v.value.y * x.value.y)
  return { x: x.value.x - d * v.value.x, y: x.value.y - d * v.value.y }
})
const stable = computed(() => target.value === -Math.sign(x.value.x || 1))
// 镜面 = v 的正交补
const mirror = computed(() => ({ x: -v.value.y * 4, y: v.value.x * 4 }))

function move(e: PointerEvent) {
  if (!drag.value || !svg.value) return
  const p = svgPoint(e, svg.value)
  x.value = { x: Math.min(3, Math.max(-3, sx.inv(p.x))), y: Math.min(1.9, Math.max(-1.9, sy.inv(p.y))) }
}
const down = (e: PointerEvent) => { drag.value = true; try { (e.target as Element).setPointerCapture(e.pointerId) } catch {} }

// 有限精度下的抵消：x = (1, δ)，v₁ = x₁ − ‖x‖ = 1 − √(1+δ²)
const logd = ref(-6)
const cancel = computed(() => {
  const d = 10 ** logd.value, n = Math.hypot(1, d)
  const naive = 1 - n                              // 相减抵消
  const exact = -d * d / (1 + n)                   // 恒等变形后的精确写法
  return { d, naive, exact, rel: Math.abs(naive - exact) / Math.abs(exact), plus: 1 + n }
})

// 矩阵逐列反射
const M: Mat = [[1, -4], [2, 3], [2, 2]]
const M2: Mat = [[1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1]]
const mi = ref(1)
const mat = computed(() => (mi.value ? M2 : M))
const hq = computed(() => householderQR(mat.value))
const k = ref(0)
const snap = computed(() => hq.value.snaps[Math.min(k.value, hq.value.snaps.length - 1)])
const f = (v: number) => Math.abs(v) < 1e-12 ? '0' : (Math.round(v * 1e4) / 1e4).toString()
const P = (p: { x: number; y: number }) => [sx(p.x), sy(p.y)]
</script>

<template>
  <Widget title="Householder 反射：一次消掉一整列的尾部">
    <div class="ctrl">
      <span style="font-size:13.5px">目标</span>
      <div class="seg">
        <button :class="{ on: target === 1 }" @click="target = 1">Hx = +‖x‖e₁</button>
        <button :class="{ on: target === -1 }" @click="target = -1">Hx = −‖x‖e₁</button>
      </div>
      <span :class="stable ? 'ok-c' : 'bad-c'" style="font-size:13px;font-weight:700">{{ stable ? '与 x₁ 反号：v = x ± ‖x‖e₁ 是两个同号数相加，没有抵消' : '与 x₁ 同号：x 靠近目标轴时 v 很短，会相减抵消' }}</span>
    </div>
    <svg ref="svg" :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto;touch-action:none" @pointermove="move" @pointerup="drag = false" @pointerleave="drag = false">
      <line :x1="sx(-3.2)" :x2="sx(3.2)" :y1="sy(0)" :y2="sy(0)" style="stroke:var(--line)" />
      <line :x1="sx(0)" :x2="sx(0)" :y1="sy(-2)" :y2="sy(2)" style="stroke:var(--line)" />
      <circle :cx="sx(0)" :cy="sy(0)" :r="sx(nx) - sx(0)" style="fill:none;stroke:var(--line-2)" stroke-dasharray="3 4" />
      <line :x1="sx(-mirror.x)" :y1="sy(-mirror.y)" :x2="sx(mirror.x)" :y2="sy(mirror.y)" style="stroke:var(--ink-3);stroke-width:1.5" stroke-dasharray="7 5" />
      <text :x="P({ x: mirror.x * 0.42, y: mirror.y * 0.42 })[0] + 8" :y="P({ x: mirror.x * 0.42, y: mirror.y * 0.42 })[1]" font-size="12" style="fill:var(--ink-3)">镜面 v⊥</text>
      <line :x1="sx(0)" :y1="sy(0)" :x2="sx(v.x * 0.9)" :y2="sy(v.y * 0.9)" style="stroke:var(--prin);stroke-width:2.5" />
      <text :x="sx(v.x * 0.9) + 6" :y="sy(v.y * 0.9) + 4" font-size="13" style="fill:var(--prin);font-weight:700">v</text>
      <line :x1="sx(x.x)" :y1="sy(x.y)" :x2="sx(Hx.x)" :y2="sy(Hx.y)" style="stroke:var(--prin);opacity:.5" stroke-dasharray="3 3" />
      <line :x1="sx(0)" :y1="sy(0)" :x2="sx(Hx.x)" :y2="sy(Hx.y)" style="stroke:var(--accent);stroke-width:3" />
      <circle :cx="sx(Hx.x)" :cy="sy(Hx.y)" r="5" style="fill:var(--accent)" />
      <text :x="sx(Hx.x)" :y="sy(Hx.y) + 20" font-size="14" text-anchor="middle" style="fill:var(--accent);font-weight:700">Hx</text>
      <line :x1="sx(0)" :y1="sy(0)" :x2="sx(x.x)" :y2="sy(x.y)" style="stroke:var(--warn);stroke-width:3" />
      <circle :cx="sx(x.x)" :cy="sy(x.y)" r="9" style="fill:var(--warn);cursor:grab" @pointerdown="down" />
      <text :x="sx(x.x) + 12" :y="sy(x.y) - 8" font-size="14" style="fill:var(--warn);font-weight:700">x（拖我）</text>
    </svg>
    <div class="stats">
      <div class="stat"><b>{{ nx.toFixed(4) }}</b><span>‖x‖₂</span></div>
      <div class="stat"><b>({{ f(Hx.x) }}, {{ f(Hx.y) }})</b><span>Hx：第二个分量被消成 0</span></div>
      <div class="stat"><b :class="vLen < 0.2 ? 'bad-c' : ''">{{ vLen.toFixed(4) }}</b><span>未归一化的 ‖x ∓ ‖x‖e₁‖</span></div>
    </div>
    <div class="ctrl">
      <label>抵消实验：x = (1, δ)，δ = <b>{{ sci(cancel.d, 0) }}</b><input v-model.number="logd" type="range" min="-12" max="-1" step="1"></label>
    </div>
    <p class="widget-note">选 Hx = +‖x‖e₁ 时 v₁ = 1 − √(1+δ²)，直接相减算得 <b>{{ sci(cancel.naive, 3) }}</b>，真值 −δ²/(1+√(1+δ²)) = <b>{{ sci(cancel.exact, 3) }}</b>，相对误差 <b :class="cancel.rel > 1e-6 ? 'bad-c' : 'ok-c'">{{ sci(cancel.rel) }}</b>；选反号目标时 v₁ = 1 + √(1+δ²) = {{ cancel.plus.toFixed(6) }}，没有抵消。所以实际实现总取 v = x + sign(x₁)‖x‖e₁。</p>
    <hr style="border:0;border-top:1px dashed var(--line);margin:14px 0">
    <div class="ctrl">
      <div class="seg">
        <button :class="{ on: mi === 0 }" @click="mi = 0; k = 0">3 × 2</button>
        <button :class="{ on: mi === 1 }" @click="mi = 1; k = 0">4 × 3</button>
      </div>
      <button class="btn" @click="k = Math.max(0, k - 1)">◂</button>
      <button class="btn primary" @click="k = Math.min(hq.snaps.length - 1, k + 1)">再反射一次 ▸</button>
      <span class="muted" style="font-size:13px">{{ k === 0 ? 'A' : `H${'₁₂₃'[k - 1]}⋯ 作用后` }}</span>
    </div>
    <div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start">
      <table class="mini-table" style="width:auto;font-variant-numeric:tabular-nums">
        <tbody><tr v-for="(r, i) in snap" :key="i">
          <td v-for="(v2, j) in r" :key="j" :style="j < k && i > j ? 'color:var(--ex);font-weight:700' : j === k && i >= k ? 'background:var(--accent-soft)' : ''">{{ f(v2) }}</td>
        </tr></tbody>
      </table>
      <div class="stats" style="margin:0">
        <div class="stat"><b>{{ sci(orthLoss(hq.Q)) }}</b><span>‖I − QᵀQ‖_F</span></div>
        <div class="stat"><b>{{ sci(factorResidual(mat, hq.Q, hq.R)) }}</b><span>‖A − QR‖_F / ‖A‖_F</span></div>
      </div>
    </div>
    <p class="widget-note">高亮的是下一步要处理的列（从对角元往下）：一次反射把它变成 (∓‖x‖, 0, …, 0)，再对右下角子矩阵重复。和 Gram–Schmidt 的结果比较：R 的某些行可能差一个正负号（Householder 这里取了 −sign(x₁)‖x‖），这对应 Q 的对应列也变号，A = QR 不变。</p>
  </Widget>
</template>
