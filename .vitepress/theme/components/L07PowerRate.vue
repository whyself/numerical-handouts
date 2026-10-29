<script setup lang="ts">
import { ref, computed } from 'vue'
import { powerIteration, sinToLine, diag, matMul, type Mat } from '../lib/l07'
import { makeScale } from '../lib/plot'

// 收敛速度 = |λ₂/λ₁|：对角矩阵 diag(4, λ₂, 1)，初值 (1, 1, 1)（课件 P28、P33）
const l2 = ref(2)
const sym = ref(true)
const K = 120, KMAX = 4000
// 非对称版本：A = S D S⁻¹，特征值相同，主特征向量仍是 e₁，但特征向量不再正交
const S: Mat = [[1, 0.5, 0], [0, 1, 0.5], [0, 0, 1]]
const Sinv: Mat = [[1, -0.5, 0.25], [0, 1, -0.5], [0, 0, 1]]
const A = computed<Mat>(() => {
  const D = diag([4, l2.value, 1])
  return sym.value ? D : matMul(matMul(S, D), Sinv)
})
const v1 = [1, 0, 0]
const run = computed(() => {
  const { xs, mus } = powerIteration(A.value, [1, 1, 1], KMAX)
  return { dir: xs.map(x => sinToLine(x, v1)), val: mus.map(m => Math.abs(m - 4) / 4) }
})
const rho = computed(() => Math.abs(l2.value / 4))
const firstBelow = (a: number[], tol: number) => { const i = a.findIndex(v => v < tol); return i < 0 ? `> ${KMAX}` : String(i) }
const need = computed(() => ({ dir: firstBelow(run.value.dir, 1e-8), val: firstBelow(run.value.val, 1e-8), pred: Math.ceil(8 / -Math.log10(rho.value)) }))

const W = 640, H = 300
const sx = makeScale(0, K, 46, W - 12), sy = makeScale(-17, 1, H - 26, 10)
const lg = (v: number) => Math.max(-17, Math.log10(Math.max(v, 1e-300)))
const line = (a: number[]) => a.slice(0, K + 1).map((v, k) => `${k ? 'L' : 'M'}${sx(k).toFixed(1)},${sy(lg(v)).toFixed(1)}`).join('')
const ref1 = computed(() => line(Array.from({ length: K + 1 }, (_, k) => rho.value ** k)))
const ref2 = computed(() => line(Array.from({ length: K + 1 }, (_, k) => rho.value ** (2 * k))))
const yt = [[0, '10⁰'], [-4, '10⁻⁴'], [-8, '10⁻⁸'], [-12, '10⁻¹²'], [-16, '10⁻¹⁶']] as const
</script>

<template>
  <Widget title="收敛速度由 |λ₂/λ₁| 决定">
    <div class="ctrl">
      <button class="btn" :class="{ primary: l2 === 3.9 }" @click="l2 = 3.9">课件 A = diag(4, 3.9, 1)</button>
      <button class="btn" :class="{ primary: l2 === 2 }" @click="l2 = 2">课件 B = diag(4, 2, 1)</button>
      <label>λ₂ = <b>{{ l2.toFixed(2) }}</b><input v-model.number="l2" type="range" min="0.1" max="3.98" step="0.01"></label>
    </div>
    <div class="ctrl">
      <div class="seg">
        <button :class="{ on: sym }" @click="sym = true">对称：A = diag(4, λ₂, 1)</button>
        <button :class="{ on: !sym }" @click="sym = false">非对称：S·diag·S⁻¹（特征值相同）</button>
      </div>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
      <g v-for="[t, lab] in yt" :key="t">
        <line :x1="sx(0)" :x2="sx(K)" :y1="sy(t)" :y2="sy(t)" style="stroke:var(--line-2)" />
        <text :x="sx(0) - 6" :y="sy(t) + 4" font-size="11" text-anchor="end" style="fill:var(--ink-3)">{{ lab }}</text>
      </g>
      <line :x1="sx(0)" :x2="sx(K)" :y1="sy(-17)" :y2="sy(-17)" style="stroke:var(--ink-3)" />
      <text v-for="k in [0, 20, 40, 60, 80, 100, 120]" :key="k" :x="sx(k)" :y="H - 8" font-size="11" text-anchor="middle" style="fill:var(--ink-3)">{{ k }}</text>
      <path :d="ref1" style="fill:none;stroke:var(--ink-3);stroke-width:1.2" stroke-dasharray="6 4" />
      <path :d="ref2" style="fill:none;stroke:var(--ink-3);stroke-width:1.2" stroke-dasharray="2 3" />
      <path :d="line(run.dir)" style="fill:none;stroke:var(--accent);stroke-width:2.4" />
      <path :d="line(run.val)" style="fill:none;stroke:var(--prin);stroke-width:2.4" />
    </svg>
    <div class="widget-note" style="display:flex;flex-wrap:wrap;gap:4px 18px;margin:2px 0 0">
      <span><span style="display:inline-block;width:22px;border-top:2.4px solid var(--accent);vertical-align:middle"></span> 方向误差 sin∠(x<sub>k</sub>, v₁)</span>
      <span><span style="display:inline-block;width:22px;border-top:2.4px solid var(--prin);vertical-align:middle"></span> 特征值误差 |R<sub>A</sub>(x<sub>k</sub>) − λ₁| / |λ₁|</span>
      <span><span style="display:inline-block;width:22px;border-top:1.5px dashed var(--ink-3);vertical-align:middle"></span> |λ₂/λ₁|<sup>k</sup></span>
      <span><span style="display:inline-block;width:22px;border-top:1.5px dotted var(--ink-3);vertical-align:middle"></span> |λ₂/λ₁|<sup>2k</sup></span>
      <span>横轴：迭代步数 k</span>
    </div>
    <div class="stats">
      <div class="stat"><b>{{ rho.toFixed(3) }}</b><span>|λ₂/λ₁|</span></div>
      <div class="stat"><b>{{ need.dir }}</b><span>方向误差 &lt; 10⁻⁸ 的步数</span></div>
      <div class="stat"><b>{{ need.val }}</b><span>特征值误差 &lt; 10⁻⁸ 的步数</span></div>
      <div class="stat"><b>{{ need.pred }}</b><span>预测 8 / log₁₀|λ₁/λ₂|</span></div>
    </div>
    <p class="widget-note">纵轴是对数刻度，直线的斜率就是 log₁₀|λ₂/λ₁|。方向误差（橙线）贴着 |λ₂/λ₁|ᵏ 走；对称时 Rayleigh 商给出的特征值误差（蓝线）贴着 |λ₂/λ₁|²ᵏ，快一倍；切换到非对称矩阵，蓝线退回到 |λ₂/λ₁|ᵏ 的斜率。课件的 A = diag(4, 3.9, 1) 要七百多步才能让方向误差降到 10⁻⁸，B = diag(4, 2, 1) 只要二十几步。误差到 10⁻¹⁶ 附近就停在双精度的舍入水平。</p>
  </Widget>
</template>
