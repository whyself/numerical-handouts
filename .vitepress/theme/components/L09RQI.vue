<script setup lang="ts">
import { ref, computed } from 'vue'
import { diag, symWithEigs, eigSym, inverseIteration, rqi, rayleigh, sinAngle, normalize, matvec, shift, norm, type Vec } from '../lib/l09'
import { makeScale, sci } from '../lib/plot'

// Rayleigh 商迭代：(1) 课件 P33 的 2×2 精确关系 tan θ_new = tan³θ；(2) 4×4 上与幂迭代、固定位移逆迭代比较
const tab = ref(0)

// ---- 2×2 ----
const th = ref(0.5)
const two = computed(() => {
  const A = diag([1, 3])
  const { xs, mus } = rqi(A, [Math.cos(th.value), Math.sin(th.value)], 6)
  return xs.map((x, k) => {
    const t = Math.abs(x[1] / x[0])
    const prev = k ? Math.abs(xs[k - 1][1] / xs[k - 1][0]) : NaN
    return { k, t, pred: prev ** 3, mu: mus[k] ?? rayleigh(A, x) }
  })
})

// ---- 4×4 ----
const LAMS = [10, 6, 3, 1]
const A4 = symWithEigs(LAMS, 5)
const E4 = eigSym(A4)
const tgt = ref(2)
const pert = ref(0.6)
const N = 14
const x0 = computed(() => {
  const v = E4.vecs[tgt.value].map(a => a)
  E4.vecs.forEach((w, i) => { if (i !== tgt.value) w.forEach((a, r) => { v[r] += pert.value * a * (i + 1) / 4 }) })
  return normalize(v)
})
// 误差：与“离当前向量最近”的特征向量的夹角（RQI 可能收敛到别的特征向量）
const errTo = (x: Vec) => Math.min(...E4.vecs.map(v => sinAngle(x, v)))
const nearest = (x: Vec) => { const e = E4.vecs.map(v => sinAngle(x, v)); return E4.vals[e.indexOf(Math.min(...e))] }
const q0 = computed(() => rayleigh(A4, x0.value))
const run = computed(() => rqi(A4, x0.value, N))
const series = computed(() => {
  const r = run.value
  return [
    { name: '幂迭代', color: 'var(--ink-3)', es: inverseIteration(A4, null, x0.value, N).map(errTo) },
    { name: `固定位移逆迭代 q = R(x₀) = ${q0.value.toFixed(3)}`, color: 'var(--prin)', es: inverseIteration(A4, q0.value, x0.value, N).map(errTo) },
    { name: 'Rayleigh 商迭代', color: 'var(--accent)', es: r.xs.map(errTo) }
  ]
})
const rqiRows = computed(() => {
  const r = run.value
  return r.xs.map((x, k) => {
    const mu = rayleigh(A4, x), e = errTo(x), ep = k ? errTo(r.xs[k - 1]) : NaN
    return { k, mu, res: norm(matvec(shift(A4, mu), x)), e, cub: k && ep > 1e-5 ? e / ep ** 3 : NaN }
  })
})
const lam = computed(() => nearest(run.value.xs[run.value.xs.length - 1]))
const W = 640, H = 240
const sx = makeScale(0, N, 44, W - 12)
const sy = makeScale(0, -16, 12, H - 26)
const yOf = (e: number) => sy(Math.log10(Math.max(e, 1e-16)))
const line = (es: number[]) => es.map((e, k) => `${k ? 'L' : 'M'}${sx(k).toFixed(1)},${yOf(e).toFixed(1)}`).join('')
</script>

<template>
  <Widget title="Rayleigh 商迭代：位移跟着向量走，误差立方">
    <div class="ctrl">
      <div class="seg">
        <button :class="{ on: tab === 0 }" @click="tab = 0">2×2 精确关系（P33）</button>
        <button :class="{ on: tab === 1 }" @click="tab = 1">4×4：三种方法比较</button>
      </div>
    </div>
    <template v-if="tab === 0">
      <div class="ctrl">
        <span>A = diag(1, 3)，x₀ = (cos θ₀, sin θ₀)ᵀ</span>
        <label>θ₀ = <b>{{ th.toFixed(2) }}</b><input v-model.number="th" type="range" min="0.05" max="0.78" step="0.01"></label>
      </div>
      <table class="mini-table" style="font-variant-numeric:tabular-nums">
        <thead><tr><th>k</th><th>μₖ = R(xₖ)</th><th>μₖ − 1</th><th>tan θₖ（实算）</th><th>tan³θₖ₋₁（预测）</th></tr></thead>
        <tbody>
          <tr v-for="r in two" :key="r.k">
            <td>{{ r.k }}</td><td>{{ r.mu.toFixed(12) }}</td><td>{{ sci(r.mu - 1) }}</td><td>{{ sci(r.t, 6) }}</td><td>{{ Number.isNaN(r.pred) ? '—' : sci(r.pred, 6) }}</td>
          </tr>
        </tbody>
      </table>
      <p class="widget-note">后两列逐行相同：方向误差每步立方。μₖ − 1 = 2 sin²θₖ，比方向误差高一阶（9.7 节的 O(θ²)）。θ₀ 接近 π/4 时 x₀ 离两个特征向量差不多远，前一两步慢；θ₀ ≥ π/4 时会收敛到 e₂。</p>
    </template>
    <template v-else>
      <div class="ctrl">
        <span>A = V·diag(10, 6, 3, 1)·Vᵀ；初值 = 目标特征向量 + 扰动</span>
      </div>
      <div class="ctrl">
        <div class="seg"><button v-for="(l, i) in LAMS" :key="i" :class="{ on: tgt === i }" @click="tgt = i">目标 λ = {{ l }}</button></div>
        <label>扰动大小 <b>{{ pert.toFixed(2) }}</b><input v-model.number="pert" type="range" min="0.02" max="2" step="0.01"></label>
      </div>
      <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
        <g v-for="p in [0, -4, -8, -12, -16]" :key="p">
          <line :x1="sx(0)" :x2="sx(N)" :y1="sy(p)" :y2="sy(p)" style="stroke:var(--line-2)" />
          <text :x="sx(0) - 6" :y="sy(p) + 4" font-size="11" text-anchor="end" style="fill:var(--ink-3)">1e{{ p }}</text>
        </g>
        <g v-for="k in N + 1" :key="k"><text :x="sx(k - 1)" :y="H - 8" font-size="11" text-anchor="middle" style="fill:var(--ink-3)">{{ k - 1 }}</text></g>
        <g v-for="s in series" :key="s.name">
          <path :d="line(s.es)" :style="{ fill: 'none', stroke: s.color, strokeWidth: 2.2 }" />
          <circle v-for="(e, k) in s.es" :key="k" :cx="sx(k)" :cy="yOf(e)" r="2.6" :style="{ fill: s.color }" />
        </g>
      </svg>
      <p class="widget-note"><span v-for="s in series" :key="s.name" style="margin-right:14px"><b :style="{ color: s.color }">●</b> {{ s.name }}</span></p>
      <table class="mini-table" style="font-variant-numeric:tabular-nums">
        <thead><tr><th>k</th><th>μₖ</th><th>残差 ‖Axₖ − μₖxₖ‖₂</th><th>sin θₖ</th><th>sin θₖ / sin³θₖ₋₁</th></tr></thead>
        <tbody>
          <tr v-for="r in rqiRows" :key="r.k"><td>{{ r.k }}</td><td>{{ r.mu.toFixed(12) }}</td><td>{{ sci(r.res) }}</td><td>{{ sci(r.e) }}</td><td>{{ Number.isNaN(r.cub) ? '—' : r.cub.toFixed(3) }}</td></tr>
        </tbody>
      </table>
      <p class="widget-note">纵轴是到最近特征向量的夹角正弦。RQI 收敛到 λ = {{ +lam.toFixed(6) }}。扰动小时 RQI 两三步就到机器精度，最后一列大致稳定（三次收敛）；扰动大时 RQI 可能收敛到别的特征值——它只有局部保证。固定位移逆迭代是一条直线（线性收敛），斜率由 R(x₀) 离各特征值的距离决定。</p>
    </template>
  </Widget>
</template>
