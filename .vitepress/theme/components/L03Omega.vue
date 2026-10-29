<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { equiNodes, chebNodes, omega, supNorm } from '../lib/l03'
import { makeScale, pathOf, sci } from '../lib/plot'

// 节点因子 |ω_n(x)| = ∏|x − x_j|：可以拖动节点，试着把最高峰压到 2^{1−n} 以下
const n = ref(11)
const kind = ref<'equi' | 'cheb' | 'free'>('equi')
const nodes = ref<number[]>(equiNodes(11))
function preset(k: 'equi' | 'cheb' | 'rand') {
  if (k === 'equi') nodes.value = equiNodes(n.value)
  else if (k === 'cheb') nodes.value = chebNodes(n.value)
  else nodes.value = Array.from({ length: n.value }, () => Math.random() * 2 - 1)
  kind.value = k === 'rand' ? 'free' : k
}
watch(n, () => preset(kind.value === 'free' ? 'equi' : kind.value))

const w = (x: number) => Math.abs(omega(nodes.value, x))
const sup = computed(() => supNorm(w, -1, 1, 6000))
const best = computed(() => 2 ** (1 - n.value))
const ymax = computed(() => Math.max(sup.value.max, best.value) * 1.12)

const W = 640, H = 260, AX = H - 40
const sx = makeScale(-1, 1, 30, W - 20)
const sy = computed(() => makeScale(0, ymax.value, AX, 14))

// 拖动节点
const svg = ref<SVGSVGElement | null>(null)
const drag = ref(-1)
function toX(ev: PointerEvent) {
  const el = svg.value
  if (!el) return 0
  const r = el.getBoundingClientRect()
  const px = (ev.clientX - r.left) * W / r.width
  return Math.max(-1, Math.min(1, sx.inv(px)))
}
function down(i: number, ev: PointerEvent) {
  drag.value = i
  ;(ev.target as Element).setPointerCapture?.(ev.pointerId)
}
function move(ev: PointerEvent) {
  if (drag.value < 0) return
  const a = nodes.value.slice()
  a[drag.value] = toX(ev)
  nodes.value = a
  kind.value = 'free'
}
const up = () => { drag.value = -1 }
</script>

<template>
  <Widget title="节点因子 |ω(x)|：拖动节点，能把最高峰压得多低？">
    <div class="ctrl">
      <label>节点数 n = <b>{{ n }}</b><input v-model.number="n" type="range" min="2" max="15" step="1"></label>
      <div class="seg">
        <button :class="{ on: kind === 'equi' }" @click="preset('equi')">等距</button>
        <button :class="{ on: kind === 'cheb' }" @click="preset('cheb')">Chebyshev</button>
        <button @click="preset('rand')">随机</button>
      </div>
    </div>
    <svg ref="svg" :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto;touch-action:none" @pointermove="move" @pointerup="up" @pointerleave="up">
      <line :x1="sx(-1)" :x2="sx(1)" :y1="AX" :y2="AX" style="stroke:var(--ink-3)" />
      <line :x1="sx(-1)" :x2="sx(1)" :y1="sy(best)" :y2="sy(best)" style="stroke:var(--ex)" stroke-dasharray="6 4" />
      <text :x="sx(1)" :y="sy(best) - 5" font-size="12" text-anchor="end" style="fill:var(--ex)">2¹⁻ⁿ = {{ sci(best, 3) }}（不可能更低）</text>
      <line :x1="sx(-1)" :x2="sx(1)" :y1="sy(sup.max)" :y2="sy(sup.max)" style="stroke:var(--warn)" stroke-dasharray="2 4" />
      <path :d="pathOf(w, -1, 1, sx, sy, [0, Infinity], 800)" style="fill:none;stroke:var(--prin);stroke-width:2.2" />
      <circle :cx="sx(sup.at)" :cy="sy(sup.max)" r="4.5" style="fill:var(--warn)" />
      <text v-for="t in [-1, -0.5, 0, 0.5, 1]" :key="t" :x="sx(t)" :y="AX + 32" font-size="11" text-anchor="middle" style="fill:var(--ink-3)">{{ t }}</text>
      <g v-for="(x, i) in nodes" :key="i" style="cursor:ew-resize" @pointerdown="down(i, $event)">
        <circle :cx="sx(x)" :cy="AX" r="12" style="fill:transparent" />
        <circle :cx="sx(x)" :cy="AX" :r="drag === i ? 7 : 5.5" style="fill:var(--accent);stroke:var(--vp-c-bg);stroke-width:1.5" />
      </g>
    </svg>
    <div class="stats">
      <div class="stat"><b>{{ sci(sup.max, 3) }}</b><span>max |ω(x)|（当前节点）</span></div>
      <div class="stat"><b>{{ sci(best, 3) }}</b><span>下界 2<sup>1−n</sup></span></div>
      <div class="stat"><b>{{ (sup.max / best).toFixed(2) }}</b><span>比值（≥ 1，等号仅 Chebyshev）</span></div>
    </div>
    <p class="widget-note">拖动横轴上的蓝点改变节点位置。n = 11 的等距节点给出 max|ω| ≈ 8.53×10⁻³（课件 P7 的图），最高峰在两端；切到 Chebyshev 节点后所有峰一样高，恰为 2⁻¹⁰ ≈ 9.77×10⁻⁴。无论怎么拖，比值都不会小于 1——这就是 3.8 节要证明的定理。</p>
  </Widget>
</template>
