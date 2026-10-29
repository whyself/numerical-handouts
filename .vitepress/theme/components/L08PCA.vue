<script setup lang="ts">
import { ref, computed } from 'vue'
import { svd, rng } from '../lib/l08'
import { makeScale, pathOf, fix } from '../lib/plot'

// PCA：中心化的数据矩阵 X（N×2）做 SVD，右奇异向量就是主方向；任选一个方向，看丢掉的平方误差
const mode = ref<'cloud' | 'slide'>('cloud')
const angle = ref(30)    // 点云长轴方向（度）
const ratio = ref(0.35)  // 短轴 / 长轴
const shift = ref(0)     // 均值离原点的距离
const seed = ref(1)
const center = ref(true)
const showProj = ref(true)
const theta = ref(90)    // 读者自己选的投影方向（度）

const pts = computed<number[][]>(() => {
  if (mode.value === 'slide') return [[2, 0], [-2, 0], [0, 1], [0, -1]]
  const R = rng(seed.value), a = angle.value * Math.PI / 180, c = Math.cos(a), s = Math.sin(a)
  const mx = shift.value * Math.cos(a + 1.3), my = shift.value * Math.sin(a + 1.3)
  return Array.from({ length: 60 }, () => {
    const u = 1.4 * R.g(), v = 1.4 * ratio.value * R.g()
    return [mx + c * u - s * v, my + s * u + c * v]
  })
})
const mean = computed(() => {
  const n = pts.value.length
  return [pts.value.reduce((a, p) => a + p[0], 0) / n, pts.value.reduce((a, p) => a + p[1], 0) / n]
})
// 是否中心化，决定 X 的行
const origin = computed(() => (center.value ? mean.value : [0, 0]))
const X = computed(() => pts.value.map(p => [p[0] - origin.value[0], p[1] - origin.value[1]]))
const dec = computed(() => svd(X.value))
const v1 = computed(() => [dec.value.V[0][0], dec.value.V[1][0]])
const s = computed(() => dec.value.s)
const N = computed(() => pts.value.length)

// 沿单位方向 d 投影（一维表示）时丢掉的平方误差 Σ (x_i · d⊥)²
const lost = (deg: number) => {
  const t = deg * Math.PI / 180, nx = -Math.sin(t), ny = Math.cos(t)
  return X.value.reduce((a, p) => a + (p[0] * nx + p[1] * ny) ** 2, 0)
}
const v1deg = computed(() => ((Math.atan2(v1.value[1], v1.value[0]) * 180 / Math.PI) + 360) % 180)
const total = computed(() => s.value[0] ** 2 + s.value[1] ** 2)
// 未中心化时 v1 与“真正的”主方向（中心化后）差多少度
const trueDeg = computed(() => {
  const m = mean.value, d = svd(pts.value.map(p => [p[0] - m[0], p[1] - m[1]]))
  return ((Math.atan2(d.V[1][0], d.V[0][0]) * 180 / Math.PI) + 360) % 180
})
const gap = computed(() => { const d = Math.abs(v1deg.value - trueDeg.value) % 180; return Math.min(d, 180 - d) })

const W = 380, L = 4.2
const sx = makeScale(-L, L, 8, W - 8), sy = makeScale(-L, L, W - 8, 8)
const dir = (deg: number) => [Math.cos(deg * Math.PI / 180), Math.sin(deg * Math.PI / 180)]
const lineThrough = (o: number[], d: number[]) => ({ x1: sx(o[0] - 9 * d[0]), y1: sy(o[1] - 9 * d[1]), x2: sx(o[0] + 9 * d[0]), y2: sy(o[1] + 9 * d[1]) })
const projs = computed(() => {
  const d = dir(theta.value), o = origin.value
  return X.value.map((p, i) => {
    const t = p[0] * d[0] + p[1] * d[1]
    return { i, x: pts.value[i], y: [o[0] + t * d[0], o[1] + t * d[1]] }
  })
})

// 右图：丢失误差关于方向角的曲线
const CW = 300, CH = 220
const cx = makeScale(0, 180, 40, CW - 8)
const cmax = computed(() => Math.max(lost(v1deg.value + 90), 1e-9) * 1.1)
const cy = computed(() => makeScale(0, cmax.value, CH - 26, 10))
</script>

<template>
  <Widget title="PCA：哪个方向最值得保留？">
    <div class="ctrl">
      <div class="seg">
        <button :class="{ on: mode === 'cloud' }" @click="mode = 'cloud'">随机点云</button>
        <button :class="{ on: mode === 'slide' }" @click="mode = 'slide'; center = true">课件 P29 的 4 个点</button>
      </div>
      <label><input v-model="center" type="checkbox"> 先中心化</label>
      <label><input v-model="showProj" type="checkbox"> 画出投影</label>
    </div>
    <div v-if="mode === 'cloud'" class="ctrl">
      <label>长轴方向 <b>{{ angle }}°</b><input v-model.number="angle" type="range" min="0" max="180" step="1"></label>
      <label>短轴/长轴 <b>{{ ratio.toFixed(2) }}</b><input v-model.number="ratio" type="range" min="0.05" max="1" step="0.05"></label>
      <label>均值偏离原点 <b>{{ shift.toFixed(1) }}</b><input v-model.number="shift" type="range" min="0" max="2.5" step="0.1"></label>
      <button class="btn" @click="seed++">换一批点</button>
    </div>
    <div class="ctrl">
      <label>试一个投影方向 θ = <b>{{ theta }}°</b><input v-model.number="theta" type="range" min="0" max="179" step="1"></label>
      <button class="btn primary" @click="theta = Math.round(v1deg) % 180">跳到 v₁</button>
    </div>
    <div class="two-col" style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:14px;align-items:start">
      <svg :viewBox="`0 0 ${W} ${W}`" style="width:100%;height:auto">
        <line :x1="sx(-L)" :x2="sx(L)" :y1="sy(0)" :y2="sy(0)" style="stroke:var(--line)" />
        <line :x1="sx(0)" :x2="sx(0)" :y1="sy(-L)" :y2="sy(L)" style="stroke:var(--line)" />
        <line v-bind="lineThrough(origin, v1)" style="stroke:var(--prin);stroke-width:2;stroke-opacity:.55" />
        <line v-bind="lineThrough(origin, dir(theta))" style="stroke:var(--accent);stroke-width:2.5" />
        <template v-if="showProj">
          <line v-for="p in projs" :key="'p' + p.i" :x1="sx(p.x[0])" :y1="sy(p.x[1])" :x2="sx(p.y[0])" :y2="sy(p.y[1])" style="stroke:var(--warn);stroke-opacity:.6" />
        </template>
        <circle v-for="(p, i) in pts" :key="i" :cx="sx(p[0])" :cy="sy(p[1])" r="3.6" style="fill:var(--ink-2)" />
        <circle :cx="sx(mean[0])" :cy="sy(mean[1])" r="5" style="fill:none;stroke:var(--ex);stroke-width:2" />
        <text :x="sx(origin[0] + 3.4 * v1[0]) + 4" :y="sy(origin[1] + 3.4 * v1[1]) - 4" font-size="13" style="fill:var(--prin);font-weight:700">v₁</text>
      </svg>
      <div>
        <svg :viewBox="`0 0 ${CW} ${CH}`" style="width:100%;height:auto">
          <line :x1="cx(0)" :x2="cx(180)" :y1="cy(0)" :y2="cy(0)" style="stroke:var(--ink-3)" />
          <path :d="pathOf(lost, 0, 180, cx, cy)" style="fill:none;stroke:var(--prin);stroke-width:2" />
          <line :x1="cx(v1deg)" :x2="cx(v1deg)" :y1="cy(0)" :y2="cy(lost(v1deg))" style="stroke:var(--prin);stroke-dasharray:3 3" />
          <circle :cx="cx(theta)" :cy="cy(lost(theta))" r="5" style="fill:var(--accent)" />
          <text v-for="d in [0, 45, 90, 135, 180]" :key="d" :x="cx(d)" :y="CH - 10" font-size="11" text-anchor="middle" style="fill:var(--ink-3)">{{ d }}°</text>
          <text :x="cx(0)" y="14" font-size="11" style="fill:var(--ink-3)">丢失的平方误差（随方向 θ）</text>
        </svg>
        <div class="stats">
          <div class="stat"><b>{{ fix(lost(theta), 3) }}</b><span>θ 方向丢失的平方误差</span></div>
          <div class="stat"><b>{{ fix(s[1] ** 2, 3) }}</b><span>最小值 σ₂²</span></div>
          <div class="stat"><b>{{ (100 * s[0] ** 2 / total).toFixed(1) }}%</b><span>v₁ 保留的能量 σ₁²/(σ₁²+σ₂²)</span></div>
        </div>
        <p class="widget-note" style="margin:4px 0">σ₁² = {{ fix(s[0] ** 2, 3) }}，σ₂² = {{ fix(s[1] ** 2, 3) }}；v₁ = ({{ fix(v1[0], 3) }}, {{ fix(v1[1], 3) }})。<template v-if="center">样本协方差的特征值 σ<sub>i</sub>²/(N−1) = {{ fix(s[0] ** 2 / (N - 1), 3) }}，{{ fix(s[1] ** 2 / (N - 1), 3) }}。</template></p>
        <p v-if="!center" class="widget-note" style="margin:4px 0;color:var(--warn)">未中心化：v₁ 与中心化后的真正主方向相差 {{ gap.toFixed(1) }}°（绿色圆圈是均值）。</p>
      </div>
    </div>
    <p class="widget-note">右图曲线的最低点正好在 v₁ 处，最低值等于 σ₂²：沿 v₁ 的一维表示就是数据矩阵的最佳秩一逼近。选课件的 4 个点时，θ = 0° 丢失 2、θ = 90° 丢失 8。把“均值偏离原点”调大并取消中心化，最大奇异方向会被拉向均值所在的方向。</p>
  </Widget>
</template>
