<script setup lang="ts">
import { ref, computed } from 'vue'
import { rayleigh, residual, eigSym, type Mat } from '../lib/l07'
import { makeScale, pathOf, sci } from '../lib/plot'

// Rayleigh 商与残差界：对称矩阵时 [μ − ‖r‖, μ + ‖r‖] 里一定有特征值；非正规矩阵时未必（课件 P18–19、P30、P36）
const mode = ref<'sym' | 'nn'>('sym')
const a = ref(3), b = ref(1), d = ref(1)
const theta = ref(60)
const logM = ref(2), logEps = ref(-2)

const A = computed<Mat>(() => mode.value === 'sym' ? [[a.value, b.value], [b.value, d.value]] : [[0, 10 ** logM.value], [0, 0]])
const x = computed(() => {
  if (mode.value === 'sym') { const t = theta.value * Math.PI / 180; return [Math.cos(t), Math.sin(t)] }
  const e = 10 ** logEps.value, n = Math.hypot(1, e)
  return [1 / n, e / n]
})
const mu = computed(() => rayleigh(A.value, x.value))
const r = computed(() => residual(A.value, x.value, mu.value))
const lams = computed(() => mode.value === 'sym' ? eigSym(A.value).values : [0])
const dist = computed(() => Math.min(...lams.value.map(l => Math.abs(l - mu.value))))
const ok = computed(() => dist.value <= r.value * (1 + 1e-12) + 1e-14)

// 上图：R_A(θ)，θ ∈ [0°, 180°]（只在对称模式下画）
const W = 640, H = 220
const sxT = makeScale(0, 180, 40, W - 12)
const yr = computed(() => {
  const [l1, l2] = [lams.value[0], lams.value[lams.value.length - 1]], pad = Math.max(0.5, (l2 - l1) * 0.25)
  return [l1 - pad, l2 + pad]
})
const syT = computed(() => makeScale(yr.value[0], yr.value[1], H - 22, 12))
const Rtheta = (t: number) => rayleigh(A.value, [Math.cos(t * Math.PI / 180), Math.sin(t * Math.PI / 180)])
const vAngles = computed(() => mode.value === 'sym' ? eigSym(A.value).vectors.map(v => ((Math.atan2(v[1], v[0]) * 180 / Math.PI) % 180 + 180) % 180) : [])

// 下图：数轴上的 μ、区间 [μ − ‖r‖, μ + ‖r‖] 与谱
const H2 = 86
const nl = computed(() => {
  const pts = [...lams.value, mu.value - r.value, mu.value + r.value]
  const lo = Math.min(...pts), hi = Math.max(...pts), pad = Math.max(0.3, (hi - lo) * 0.12)
  return makeScale(lo - pad, hi + pad, 20, W - 20)
})
const f3 = (v: number) => (Math.abs(v) < 5e-13 ? 0 : v).toFixed(3)
</script>

<template>
  <Widget title="Rayleigh 商估计特征值，残差给出误差界">
    <div class="ctrl">
      <div class="seg">
        <button :class="{ on: mode === 'sym' }" @click="mode = 'sym'">对称 2×2 矩阵</button>
        <button :class="{ on: mode === 'nn' }" @click="mode = 'nn'">非正规反例 (0 M; 0 0)</button>
      </div>
    </div>
    <template v-if="mode === 'sym'">
      <div class="ctrl">
        <label>A = ( a b ; b d )：a <input v-model.number="a" type="range" min="-3" max="4" step="0.1" style="width:110px"><b>{{ a.toFixed(1) }}</b></label>
        <label>b <input v-model.number="b" type="range" min="-2" max="2" step="0.1" style="width:110px"><b>{{ b.toFixed(1) }}</b></label>
        <label>d <input v-model.number="d" type="range" min="-3" max="4" step="0.1" style="width:110px"><b>{{ d.toFixed(1) }}</b></label>
      </div>
      <div class="ctrl">
        <label>x = (cos θ, sin θ)，θ = <b>{{ theta.toFixed(1) }}°</b><input v-model.number="theta" type="range" min="0" max="180" step="0.5"></label>
      </div>
      <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
        <line :x1="sxT(0)" :x2="sxT(180)" :y1="H - 22" :y2="H - 22" style="stroke:var(--ink-3)" />
        <text v-for="t in [0, 45, 90, 135, 180]" :key="t" :x="sxT(t)" :y="H - 6" font-size="11" text-anchor="middle" style="fill:var(--ink-3)">{{ t }}°</text>
        <g v-for="(l, i) in lams" :key="i">
          <line :x1="sxT(0)" :x2="sxT(180)" :y1="syT(l)" :y2="syT(l)" style="stroke:var(--ex)" stroke-dasharray="6 4" />
          <text :x="sxT(0) - 4" :y="syT(l) + 4" font-size="12" text-anchor="end" style="fill:var(--ex);font-weight:700">λ{{ i + 1 }}</text>
        </g>
        <line v-for="(t, i) in vAngles" :key="'v' + i" :x1="sxT(t)" :x2="sxT(t)" :y1="12" :y2="H - 22" style="stroke:var(--ink-3)" stroke-dasharray="2 4" />
        <path :d="pathOf(Rtheta, 0, 180, sxT, syT)" style="fill:none;stroke:var(--accent);stroke-width:2.4" />
        <line :x1="sxT(theta)" :x2="sxT(theta)" :y1="syT(Math.max(yr[0], mu - r))" :y2="syT(Math.min(yr[1], mu + r))" style="stroke:var(--prin);stroke-width:7;stroke-opacity:.35" />
        <circle :cx="sxT(theta)" :cy="syT(mu)" r="5" style="fill:var(--accent)" />
      </svg>
      <p class="widget-note" style="margin:0 0 4px">橙色曲线是 R<sub>A</sub>(x) 随方向 θ 的变化：它总夹在 λ₁ 与 λ₂ 之间，在两个特征方向（灰色竖线）上分别取到最小值和最大值——这就是 Courant–Fischer。蓝色竖条是 μ ± ‖r‖。</p>
    </template>
    <template v-else>
      <div class="ctrl">
        <label>M = <b>{{ sci(10 ** logM, 1) }}</b><input v-model.number="logM" type="range" min="0" max="4" step="0.1"></label>
        <label>ε = <b>{{ sci(10 ** logEps, 2) }}</b><input v-model.number="logEps" type="range" min="-5" max="0" step="0.05"></label>
        <button class="btn" @click="logEps = -logM">取 ε = 1/M（课件）</button>
      </div>
      <p class="widget-note" style="margin:0 0 4px">x = (1, ε)ᵀ/√(1 + ε²)。理论值：μ = Mε/(1 + ε²) = {{ f3(10 ** logM * 10 ** logEps / (1 + 10 ** (2 * logEps))) }}，‖r‖ = Mε²/(1 + ε²) = {{ sci(10 ** logM * 10 ** (2 * logEps) / (1 + 10 ** (2 * logEps)), 3) }}。</p>
    </template>
    <svg :viewBox="`0 0 ${W} ${H2}`" style="width:100%;height:auto">
      <line x1="10" :x2="W - 10" :y1="50" :y2="50" style="stroke:var(--ink-3)" />
      <rect :x="nl(mu - r)" y="40" :width="Math.max(2, nl(mu + r) - nl(mu - r))" height="20" rx="4" style="fill:var(--prin);fill-opacity:.25;stroke:var(--prin)" />
      <g v-for="(l, i) in lams" :key="i">
        <line :x1="nl(l) - 6" :x2="nl(l) + 6" y1="44" y2="56" style="stroke:var(--ex);stroke-width:2.5" />
        <line :x1="nl(l) - 6" :x2="nl(l) + 6" y1="56" y2="44" style="stroke:var(--ex);stroke-width:2.5" />
        <text :x="nl(l)" y="78" font-size="12" text-anchor="middle" style="fill:var(--ex);font-weight:700">{{ mode === 'sym' ? `λ${i + 1}` : 'λ = 0' }}</text>
      </g>
      <circle :cx="nl(mu)" cy="50" r="5" style="fill:var(--accent)" />
      <text :x="nl(mu)" y="30" font-size="12" text-anchor="middle" style="fill:var(--accent);font-weight:700">μ = R(x)</text>
    </svg>
    <div class="stats">
      <div class="stat"><b>{{ f3(mu) }}</b><span>μ = R<sub>A</sub>(x)</span></div>
      <div class="stat"><b>{{ sci(r, 3) }}</b><span>残差 ‖Ax − μx‖₂</span></div>
      <div class="stat"><b>{{ sci(dist, 3) }}</b><span>μ 到最近特征值的距离</span></div>
      <div class="stat"><b :class="ok ? 'ok-c' : 'bad-c'">{{ ok ? '成立' : '不成立' }}</b><span>min |λⱼ − μ| ≤ ‖r‖</span></div>
    </div>
    <p class="widget-note">{{ mode === 'sym'
      ? '对称矩阵：无论 x 取什么方向，蓝色区间里都至少有一个特征值（P30 的定理）。把 θ 拖到某个特征方向，残差变成 0，μ 恰好等于对应的特征值。'
      : '非正规矩阵：谱只有 {0}，但取 ε = 1/M 时 μ ≈ 1、残差 ≈ 1/M —— 残差很小，区间里却没有特征值（P36 的反例）。M 越大越明显。' }}</p>
  </Widget>
</template>
