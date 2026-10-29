<script setup lang="ts">
import { ref, computed } from 'vue'
import { pNorm } from '../lib/l03'
import { makeScale } from '../lib/plot'

// 左：ℝ² 中 ‖x‖_p = 1 的“单位球”；右：一个固定向量的 ‖x‖_p 随 p 的变化
const PS = [0.5, 1, 1.25, 1.5, 2, 3, 4, 6, 10, 20, 50, Infinity]
const pi = ref(4)
const p = computed(() => PS[pi.value])
const pLabel = (v: number) => Number.isFinite(v) ? String(v) : '∞'

function ballPath(q: number, s: (v: number) => number, t: (v: number) => number) {
  let d = ''
  for (let i = 0; i <= 720; i++) {
    const a = 2 * Math.PI * i / 720, u = [Math.cos(a), Math.sin(a)]
    const r = 1 / pNorm(u, q)
    d += `${i ? 'L' : 'M'}${s(r * u[0]).toFixed(1)},${t(r * u[1]).toFixed(1)}`
  }
  return d + 'Z'
}
const BW = 260
const bx = makeScale(-1.3, 1.3, 10, BW - 10)
const by = makeScale(-1.3, 1.3, BW - 10, 10)

const text = ref('3, -1, 2, 0.5')
const vec = computed(() => text.value.split(/[,，\s]+/).map(Number).filter(Number.isFinite))
const inf = computed(() => vec.value.length ? pNorm(vec.value, Infinity) : 0)
const nrm = computed(() => vec.value.length ? pNorm(vec.value, p.value) : 0)
const two = computed(() => vec.value.length ? pNorm(vec.value, 2) : 0)

const CW = 360, CH = 260, PMAX = 30
const cx = makeScale(1, PMAX, 40, CW - 10)
const yTop = computed(() => Math.max(1e-9, (vec.value.length ? pNorm(vec.value, 1) : 1)) * 1.08)
const cy = computed(() => makeScale(0, yTop.value, CH - 24, 10))
const curve = computed(() => {
  if (!vec.value.length) return ''
  let d = ''
  for (let i = 0; i <= 300; i++) {
    const q = 1 + (PMAX - 1) * i / 300
    d += `${i ? 'L' : 'M'}${cx(q).toFixed(1)},${cy.value(pNorm(vec.value, q)).toFixed(1)}`
  }
  return d
})
</script>

<template>
  <Widget title="p-范数：同一个空间，不同的“尺子”">
    <div class="ctrl">
      <label>p = <b>{{ pLabel(p) }}</b><input v-model.number="pi" type="range" min="0" :max="PS.length - 1" step="1"></label>
      <label>向量 x = <input v-model="text" style="width:12em"></label>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;align-items:start">
      <div>
        <svg :viewBox="`0 0 ${BW} ${BW}`" style="width:100%;max-width:300px;height:auto;display:block;margin:auto">
          <line :x1="bx(-1.3)" :x2="bx(1.3)" :y1="by(0)" :y2="by(0)" style="stroke:var(--line)" />
          <line :x1="bx(0)" :x2="bx(0)" :y1="by(-1.3)" :y2="by(1.3)" style="stroke:var(--line)" />
          <path v-for="q in [1, 2, Infinity]" :key="q" :d="ballPath(q, bx, by)" style="fill:none;stroke:var(--ink-3);stroke-width:1" stroke-dasharray="3 3" />
          <path :d="ballPath(p, bx, by)" :style="`fill:var(${p < 1 ? '--warn-bg' : '--accent-soft'});stroke:var(${p < 1 ? '--warn' : '--accent'});stroke-width:2.4`" />
          <text :x="bx(1) + 3" :y="by(0) + 14" font-size="11" style="fill:var(--ink-3)">1</text>
        </svg>
        <p class="widget-note" style="text-align:center">{{ p < 1 ? 'p < 1：“单位球”不是凸的，三角不等式失效，这不是范数' : `p = ${pLabel(p)}：‖x‖ₚ = 1 的点集（虚线：p = 1, 2, ∞）` }}</p>
      </div>
      <div>
        <svg :viewBox="`0 0 ${CW} ${CH}`" style="width:100%;height:auto">
          <line :x1="cx(1)" :x2="cx(PMAX)" :y1="cy(0)" :y2="cy(0)" style="stroke:var(--ink-3)" />
          <line :x1="cx(1)" :x2="cx(PMAX)" :y1="cy(inf)" :y2="cy(inf)" style="stroke:var(--ex)" stroke-dasharray="5 4" />
          <text :x="cx(PMAX)" :y="cy(inf) + 14" font-size="11" text-anchor="end" style="fill:var(--ex)">‖x‖∞ = {{ inf.toFixed(3) }}</text>
          <path :d="curve" style="fill:none;stroke:var(--prin);stroke-width:2.2" />
          <circle v-if="Number.isFinite(p) && p >= 1 && p <= PMAX" :cx="cx(p)" :cy="cy(nrm)" r="5" style="fill:var(--accent)" />
          <text v-for="t in [1, 5, 10, 20, 30]" :key="t" :x="cx(t)" :y="CH - 8" font-size="11" text-anchor="middle" style="fill:var(--ink-3)">{{ t }}</text>
          <text :x="cx(PMAX)" :y="CH - 8 - 12" font-size="11" text-anchor="end" style="fill:var(--ink-3)">p →</text>
        </svg>
      </div>
    </div>
    <div class="stats">
      <div class="stat"><b>{{ nrm.toFixed(4) }}</b><span>‖x‖<sub>p</sub>（p = {{ pLabel(p) }}）</span></div>
      <div class="stat"><b>{{ inf.toFixed(4) }}</b><span>‖x‖<sub>∞</sub></span></div>
      <div class="stat"><b>{{ two.toFixed(4) }}</b><span>‖x‖<sub>2</sub></span></div>
      <div class="stat"><b>{{ (Math.sqrt(vec.length) * inf).toFixed(4) }}</b><span>√n · ‖x‖<sub>∞</sub>（n = {{ vec.length }}）</span></div>
    </div>
    <p class="widget-note">左图：p 从 1 增大到 ∞，单位球从菱形鼓成圆、再鼓成正方形；p &lt; 1 时凹进去，不满足三角不等式。右图：对输入的向量，‖x‖<sub>p</sub> 随 p 增大单调不增、并逐渐贴近 ‖x‖<sub>∞</sub>。改改向量（例如把所有分量设成一样，或只留一个非零分量），看看 ‖x‖<sub>2</sub> 什么时候碰到 √n‖x‖<sub>∞</sub>、什么时候碰到 ‖x‖<sub>∞</sub>。</p>
  </Widget>
</template>
