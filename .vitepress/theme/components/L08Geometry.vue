<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { svd, type Mat } from '../lib/l08'
import { makeScale, fix } from '../lib/plot'

// 2×2 矩阵 = 正交变换 Vᵀ · 沿坐标轴伸缩 Σ · 正交变换 U：单位圆一步步变成椭圆
const PRESETS: { name: string; A: number[] }[] = [
  { name: '剪切 [[1.5, 1], [0, 1]]', A: [1.5, 1, 0, 1] },
  { name: '对称不定 [[1, 2], [2, 1]]（含反射）', A: [1, 2, 2, 1] },
  { name: '病态 [[2, 1.9], [1, 1]]', A: [2, 1.9, 1, 1] },
  { name: '秩一 [[1, 2], [0.5, 1]]', A: [1, 2, 0.5, 1] },
  { name: '旋转 45°', A: [Math.SQRT1_2, -Math.SQRT1_2, Math.SQRT1_2, Math.SQRT1_2] }
]
const a = ref([...PRESETS[0].A])
const pi = ref(0)
function pick(i: number) { pi.value = i; a.value = [...PRESETS[i].A]; t.value = 0 }

const A = computed<Mat>(() => [[a.value[0], a.value[1]], [a.value[2], a.value[3]]])
const det2 = (M: Mat) => M[0][0] * M[1][1] - M[0][1] * M[1][0]

// 选符号：尽量让 U、V 都是旋转；det A < 0 时反射只能留在 U 里
const dec = computed(() => {
  const { U, s, V } = svd(A.value)
  if (det2(V) < 0) { for (const M of [U, V]) { M[0][1] = -M[0][1]; M[1][1] = -M[1][1] } }
  return { U, s, V }
})
// 正交矩阵 Q 的“从 I 到 Q”的连续路径：旋转按角度插值；反射写成 R(φ)·diag(1, −1)，第二轴连续翻转
function orthPath(Q: Mat, t: number): Mat {
  const phi = Math.atan2(Q[1][0], Q[0][0])
  const c = Math.cos(t * phi), s = Math.sin(t * phi)
  const f = det2(Q) < 0 ? 1 - 2 * t : 1
  return [[c, -s * f], [s, c * f]]
}
const ap = (M: Mat, p: number[]) => [M[0][0] * p[0] + M[0][1] * p[1], M[1][0] * p[0] + M[1][1] * p[1]]
const Vt = computed<Mat>(() => [[dec.value.V[0][0], dec.value.V[1][0]], [dec.value.V[0][1], dec.value.V[1][1]]])

// 阶段 t ∈ [0, 3]：0 输入，1 经过 Vᵀ，2 经过 Σ，3 经过 U（= Ax）
const t = ref(0)
function stageMap(p: number[]): number[] {
  const T = t.value, { U, s } = dec.value
  const s1 = Math.min(1, T), s2 = Math.min(1, Math.max(0, T - 1)), s3 = Math.min(1, Math.max(0, T - 2))
  let q = ap(orthPath(Vt.value, s1), p)
  q = [q[0] * (1 + s2 * (s[0] - 1)), q[1] * (1 + s2 * (s[1] - 1))]
  return ap(orthPath(U, s3), q)
}
const R = computed(() => Math.max(2.2, dec.value.s[0] * 1.15))
const W = 380
const sx = computed(() => makeScale(-R.value, R.value, 10, W - 10))
const sy = computed(() => makeScale(-R.value, R.value, W - 10, 10))
const circle = computed(() => {
  let d = ''
  for (let i = 0; i <= 120; i++) {
    const th = 2 * Math.PI * i / 120, q = stageMap([Math.cos(th), Math.sin(th)])
    d += `${i ? 'L' : 'M'}${sx.value(q[0]).toFixed(1)},${sy.value(q[1]).toFixed(1)}`
  }
  return d + 'Z'
})
const ghost = computed(() => {
  let d = ''
  for (let i = 0; i <= 120; i++) {
    const th = 2 * Math.PI * i / 120, q = ap(A.value, [Math.cos(th), Math.sin(th)])
    d += `${i ? 'L' : 'M'}${sx.value(q[0]).toFixed(1)},${sy.value(q[1]).toFixed(1)}`
  }
  return d + 'Z'
})
const vecs = computed(() => [0, 1].map(j => {
  const v = [dec.value.V[0][j], dec.value.V[1][j]]
  return { j, p: stageMap(v) }
}))
const stageName = computed(() => ['输入：单位圆与右奇异向量 v₁, v₂', '经过 Vᵀ：v₁, v₂ 转到坐标轴 e₁, e₂', '经过 Σ：沿坐标轴伸缩 σ₁, σ₂', '经过 U：得到 Ax，v_i ↦ σ_i u_i'][Math.min(3, Math.round(t.value))])

let timer: ReturnType<typeof setInterval> | undefined
function play() {
  clearInterval(timer); t.value = 0
  timer = setInterval(() => { t.value = Math.min(3, +(t.value + 0.03).toFixed(2)); if (t.value >= 3) clearInterval(timer) }, 30)
}
onBeforeUnmount(() => clearInterval(timer))

const chk = computed(() => {
  const { U, s, V } = dec.value
  // 直接核对 A v_i = σ_i u_i
  return [0, 1].map(j => {
    const Av = ap(A.value, [V[0][j], V[1][j]])
    return Math.hypot(Av[0] - s[j] * U[0][j], Av[1] - s[j] * U[1][j])
  })
})
const f3 = (v: number) => fix(v, 3)
const COLORS = ['var(--accent)', 'var(--ex)']
</script>

<template>
  <Widget title="2×2 矩阵 = 旋转（反射）· 伸缩 · 旋转（反射）">
    <div class="ctrl">
      <select :value="pi" @change="pick(+($event.target as HTMLSelectElement).value)"><option v-for="(p, i) in PRESETS" :key="i" :value="i">{{ p.name }}</option></select>
    </div>
    <div class="ctrl">
      <label v-for="(nm, k) in ['a₁₁', 'a₁₂', 'a₂₁', 'a₂₂']" :key="k">{{ nm }} = <b>{{ a[k].toFixed(2) }}</b><input v-model.number="a[k]" type="range" min="-2" max="2" step="0.05" @input="t = 3"></label>
    </div>
    <div class="ctrl">
      <label>阶段 <b>{{ t.toFixed(2) }}</b><input v-model.number="t" type="range" min="0" max="3" step="0.01"></label>
      <button class="btn" @click="t = 0">输入</button>
      <button class="btn" @click="t = 1">Vᵀ</button>
      <button class="btn" @click="t = 2">Σ</button>
      <button class="btn" @click="t = 3">U</button>
      <button class="btn primary" @click="play">▶ 播放</button>
    </div>
    <div class="two-col" style="display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:14px;align-items:start">
      <svg :viewBox="`0 0 ${W} ${W}`" style="width:100%;height:auto">
        <line :x1="sx(-R)" :x2="sx(R)" :y1="sy(0)" :y2="sy(0)" style="stroke:var(--line)" />
        <line :x1="sx(0)" :x2="sx(0)" :y1="sy(-R)" :y2="sy(R)" style="stroke:var(--line)" />
        <path :d="ghost" style="fill:none;stroke:var(--ink-3);stroke-dasharray:4 4" />
        <path :d="circle" style="fill:var(--accent-soft);fill-opacity:.5;stroke:var(--prin);stroke-width:2.2" />
        <g v-for="v in vecs" :key="v.j">
          <line :x1="sx(0)" :y1="sy(0)" :x2="sx(v.p[0])" :y2="sy(v.p[1])" :style="`stroke:${COLORS[v.j]};stroke-width:3`" />
          <circle :cx="sx(v.p[0])" :cy="sy(v.p[1])" r="4.5" :style="`fill:${COLORS[v.j]}`" />
          <text :x="sx(v.p[0]) + 7" :y="sy(v.p[1]) - 7" font-size="13" :style="`fill:${COLORS[v.j]};font-weight:700`">{{ v.j ? '②' : '①' }}</text>
        </g>
      </svg>
      <div>
        <p class="widget-note" style="margin-top:0"><b>{{ stageName }}</b></p>
        <div class="stats">
          <div class="stat"><b>{{ f3(dec.s[0]) }}</b><span>σ₁ = ‖A‖₂</span></div>
          <div class="stat"><b>{{ f3(dec.s[1]) }}</b><span>σ₂</span></div>
          <div class="stat"><b>{{ dec.s[1] > 1e-12 ? f3(dec.s[0] / dec.s[1]) : '∞' }}</b><span>κ₂ = σ₁/σ₂</span></div>
        </div>
        <table class="mini-table" style="font-variant-numeric:tabular-nums">
          <thead><tr><th></th><th>右奇异向量 v</th><th>左奇异向量 u</th></tr></thead>
          <tbody>
            <tr v-for="j in [0, 1]" :key="j"><td :style="`color:${COLORS[j]};font-weight:700`">{{ j ? '②' : '①' }}</td><td>({{ f3(dec.V[0][j]) }}, {{ f3(dec.V[1][j]) }})</td><td>({{ f3(dec.U[0][j]) }}, {{ f3(dec.U[1][j]) }})</td></tr>
          </tbody>
        </table>
        <p class="widget-note">det V = {{ f3(det2(dec.V)) }}，det U = {{ f3(det2(dec.U)) }}{{ det2(A) < -1e-12 ? '：det A < 0，U 必须带一次反射（看 ① ② 的转向在最后一段翻转）' : '' }}。核对 ‖Av<sub>i</sub> − σ<sub>i</sub>u<sub>i</sub>‖ = {{ chk.map(c => c.toExponential(1)).join('，') }}。</p>
      </div>
    </div>
    <p class="widget-note">虚线是直接画出的 {Ax : ‖x‖ = 1}，播放到最后一段时实线椭圆与它重合。Vᵀ 和 U 只转动（或翻转），不改变圆的形状；只有 Σ 改变长度。秩一时 σ₂ = 0，椭圆被压成线段。</p>
  </Widget>
</template>
