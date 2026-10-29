<script setup lang="ts">
import { ref, computed } from 'vue'
import { makeScale } from '../lib/plot'
import { svgPoint } from '../lib/l04'

// 最近点 = 正交投影（P4、P6）：V 是过原点的一条直线 span{a}，b 和试探点 y ∈ V 都可以拖
const W = 560, H = 360
const sx = makeScale(-1, 6, 20, W - 20)
const sy = makeScale(-1, 3.5, H - 16, 14)
const ang = ref(18)           // V 的方向角（度）
const b = ref({ x: 2.4, y: 2.9 })
const t = ref(4.6)            // 试探点 y = t·a
const svg = ref<SVGSVGElement | null>(null)
const drag = ref<'' | 'b' | 'y'>('')

const a = computed(() => ({ x: Math.cos(ang.value * Math.PI / 180), y: Math.sin(ang.value * Math.PI / 180) }))
const that = computed(() => b.value.x * a.value.x + b.value.y * a.value.y)        // b̂ = ⟨a,b⟩a（‖a‖ = 1）
const bh = computed(() => ({ x: that.value * a.value.x, y: that.value * a.value.y }))
const yy = computed(() => ({ x: t.value * a.value.x, y: t.value * a.value.y }))
const r = computed(() => ({ x: b.value.x - bh.value.x, y: b.value.y - bh.value.y }))
const sq = (p: { x: number; y: number }) => p.x * p.x + p.y * p.y
const dY = computed(() => sq({ x: b.value.x - yy.value.x, y: b.value.y - yy.value.y }))   // ‖b − y‖²
const rY = computed(() => (b.value.x - yy.value.x) * a.value.x + (b.value.y - yy.value.y) * a.value.y) // ⟨b − y, a⟩
const gap = computed(() => (that.value - t.value) ** 2)                               // ‖b̂ − y‖²

function down(which: 'b' | 'y', e: PointerEvent) {
  drag.value = which
  try { (e.target as Element).setPointerCapture(e.pointerId) } catch {}
}
function move(e: PointerEvent) {
  if (!drag.value || !svg.value) return
  const p = svgPoint(e, svg.value)
  const X = Math.min(5.8, Math.max(-0.8, sx.inv(p.x))), Y = Math.min(3.3, Math.max(-0.8, sy.inv(p.y)))
  if (drag.value === 'b') b.value = { x: X, y: Y }
  else t.value = Math.min(6, Math.max(-1, X * a.value.x + Y * a.value.y))
}
// 必要性证明里的那一步：沿 v = a 走 t* = ⟨b − y, a⟩/‖a‖²
const improve = () => { t.value = t.value + rY.value }
const P = (p: { x: number; y: number }) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`
// 直角标记
const mark = computed(() => {
  const s = 0.18, u = a.value, n = { x: r.value.x, y: r.value.y }, nl = Math.hypot(n.x, n.y) || 1
  const p1 = { x: bh.value.x - s * u.x, y: bh.value.y - s * u.y }
  const p2 = { x: p1.x + s * n.x / nl, y: p1.y + s * n.y / nl }
  const p3 = { x: bh.value.x + s * n.x / nl, y: bh.value.y + s * n.y / nl }
  return `M${P(p1)}L${P(p2)}L${P(p3)}`
})
</script>

<template>
  <Widget title="最近点就是正交投影：拖动 b 和试探点 y">
    <div class="ctrl">
      <label>子空间 V 的方向 = <b>{{ ang }}°</b><input v-model.number="ang" type="range" min="-10" max="50" step="1"></label>
      <button class="btn primary" @click="improve">沿 V 改进一步（t* = ⟨b − y, a⟩/‖a‖²）</button>
    </div>
    <svg ref="svg" :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto;touch-action:none" @pointermove="move" @pointerup="drag = ''" @pointerleave="drag = ''">
      <line :x1="sx(-1)" :x2="sx(6)" :y1="sy(0)" :y2="sy(0)" style="stroke:var(--line)" />
      <line :x1="sx(0)" :x2="sx(0)" :y1="sy(-1)" :y2="sy(3.5)" style="stroke:var(--line)" />
      <line :x1="sx(-1 * a.x)" :y1="sy(-1 * a.y)" :x2="sx(6.5 * a.x)" :y2="sy(6.5 * a.y)" style="stroke:var(--prin);stroke-width:3;opacity:.55" />
      <text :x="sx(5.6 * a.x)" :y="sy(5.6 * a.y) + 20" font-size="14" style="fill:var(--prin);font-weight:700">V = span{a}</text>
      <!-- b → y：一般的误差向量 -->
      <line :x1="sx(b.x)" :y1="sy(b.y)" :x2="sx(yy.x)" :y2="sy(yy.y)" style="stroke:var(--warn);stroke-width:1.8" stroke-dasharray="6 4" />
      <!-- 投影与残差 -->
      <line :x1="sx(0)" :y1="sy(0)" :x2="sx(b.x)" :y2="sy(b.y)" style="stroke:var(--ink-3);stroke-width:1.5" />
      <line :x1="sx(b.x)" :y1="sy(b.y)" :x2="sx(bh.x)" :y2="sy(bh.y)" style="stroke:var(--accent);stroke-width:2.5" />
      <path :d="mark" style="fill:none;stroke:var(--accent)" />
      <line :x1="sx(bh.x)" :y1="sy(bh.y)" :x2="sx(yy.x)" :y2="sy(yy.y)" style="stroke:var(--ex);stroke-width:4;opacity:.6" />
      <circle :cx="sx(bh.x)" :cy="sy(bh.y)" r="5" style="fill:var(--accent)" />
      <text :x="sx(bh.x) + 8" :y="sy(bh.y) + 18" font-size="14" style="fill:var(--accent);font-weight:700">b̂</text>
      <circle :cx="sx(yy.x)" :cy="sy(yy.y)" r="9" style="fill:var(--ex);cursor:grab" @pointerdown="down('y', $event)" />
      <text :x="sx(yy.x) + 6" :y="sy(yy.y) - 12" font-size="14" style="fill:var(--ex);font-weight:700">y</text>
      <circle :cx="sx(b.x)" :cy="sy(b.y)" r="9" style="fill:var(--ink);cursor:grab" @pointerdown="down('b', $event)" />
      <text :x="sx(b.x) + 12" :y="sy(b.y) + 5" font-size="15" style="fill:var(--ink);font-weight:700">b</text>
    </svg>
    <div class="stats">
      <div class="stat"><b>{{ dY.toFixed(3) }}</b><span>‖b − y‖²（虚线）</span></div>
      <div class="stat"><b>{{ sq(r).toFixed(3) }}</b><span>‖r‖² = ‖b − b̂‖²</span></div>
      <div class="stat"><b>{{ gap.toFixed(3) }}</b><span>‖b̂ − y‖²（绿色段）</span></div>
      <div class="stat"><b :class="Math.abs(rY) < 1e-9 ? 'ok-c' : 'bad-c'">{{ (Math.abs(rY) < 5e-4 ? 0 : rY).toFixed(3) }}</b><span>⟨b − y, a⟩</span></div>
    </div>
    <p class="widget-note">无论 y 在 V 上哪里，总有 ‖b − y‖² = ‖r‖² + ‖b̂ − y‖²（勾股定理，P6 的充分性）：前三个数字始终满足“第一个 = 第二个 + 第三个”。只要 ⟨b − y, a⟩ ≠ 0，按课件必要性证明里的 t* 走一步就能更近；在一维子空间上一步就落到 b̂，此后内积为 0、再也无法改进。</p>
  </Widget>
</template>
