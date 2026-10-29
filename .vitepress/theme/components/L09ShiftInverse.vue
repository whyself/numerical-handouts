<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { diag, symWithEigs, eigSym, inverseIteration, sinAngle, type Mat, type Vec } from '../lib/l09'
import { makeScale, sci } from '../lib/plot'

// 位移逆迭代：拖动 q，看哪个特征值“离 q 最近”从而占优，以及收敛比 γ(q) = |λj − q| / min_{i≠j} |λi − q|
interface Case { name: string; A: Mat; x0: Vec; lo: number; hi: number; q: number }
const CASES: Case[] = [
  { name: 'diag(1, 3, 8)（课件 P7）', A: diag([1, 3, 8]), x0: [1, 1, 1], lo: -1, hi: 10, q: 2.8 },
  { name: '对称 4×4，特征值 7, −5, 3, 1', A: symWithEigs([7, -5, 3, 1], 11), x0: [1, 1, 1, 1], lo: -8, hi: 9, q: 0 }
]
const ci = ref(0)
const c = computed(() => CASES[ci.value])
const q = ref(2.8)
watch(ci, () => { q.value = c.value.q })

const eig = computed(() => eigSym(c.value.A))
// 离 q 最近的特征值（目标）及收敛比
const info = computed(() => {
  const ls = eig.value.vals, d = ls.map(l => Math.abs(l - q.value))
  const order = [...d.keys()].sort((a, b) => d[a] - d[b])
  const j = order[0], gamma = d[j] / d[order[1]]
  const singular = d[j] < 1e-12
  const kappa = Math.max(...d) / d[j]
  return { j, gamma, singular, tie: Math.abs(d[order[0]] - d[order[1]]) < 1e-9, kappa, d }
})
const N = 30
const inv = computed(() => info.value.singular ? [] : inverseIteration(c.value.A, q.value, c.value.x0, N))
const pow = computed(() => inverseIteration(c.value.A, null, c.value.x0, N))
// 误差：与目标特征向量夹角的正弦（只看方向，忽略正负号）
const errInv = computed(() => inv.value.map(x => sinAngle(x, eig.value.vecs[info.value.j])))
const domIdx = computed(() => { const a = eig.value.vals.map(Math.abs); return a.indexOf(Math.max(...a)) })
const errPow = computed(() => pow.value.map(x => sinAngle(x, eig.value.vecs[domIdx.value])))
const hit = computed(() => errInv.value.findIndex(e => e < 1e-10))

// 数轴
const W = 640, H = 92
const sx = computed(() => makeScale(c.value.lo, c.value.hi, 24, W - 24))
// 目标特征值“最近点区域”：相邻特征值中点之间
const cell = computed(() => {
  const s = [...eig.value.vals].sort((a, b) => a - b), t = eig.value.vals[info.value.j], i = s.indexOf(t)
  return [i > 0 ? (s[i - 1] + t) / 2 : c.value.lo, i < s.length - 1 ? (s[i + 1] + t) / 2 : c.value.hi]
})

// 收敛曲线
const PW = 640, PH = 230
const px = makeScale(0, N, 44, PW - 12)
const py = makeScale(0, -16, 12, PH - 26)
const yOf = (e: number) => py(Math.log10(Math.max(e, 1e-16)))
const line = (es: number[]) => es.map((e, k) => `${k ? 'L' : 'M'}${px(k).toFixed(1)},${yOf(e).toFixed(1)}`).join('')
const theory = computed(() => {
  const e0 = errInv.value[1] ?? 1, g = info.value.gamma
  return [...Array(N).keys()].map(k => e0 * g ** (k - 1)).map((e, k) => (k ? `${k > 1 ? 'L' : 'M'}${px(k).toFixed(1)},${yOf(e).toFixed(1)}` : '')).join('')
})
</script>

<template>
  <Widget title="位移逆迭代：q 放在哪里，就收敛到哪个特征向量">
    <div class="ctrl">
      <div class="seg"><button v-for="(cc, i) in CASES" :key="i" :class="{ on: ci === i }" @click="ci = i">{{ cc.name }}</button></div>
    </div>
    <div class="ctrl">
      <label>位移 q = <b>{{ q.toFixed(2) }}</b><input v-model.number="q" type="range" :min="c.lo" :max="c.hi" step="0.01" style="width:260px"></label>
      <button class="btn" @click="q = c.q">恢复 q = {{ c.q }}</button>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
      <rect :x="sx(cell[0])" :width="sx(cell[1]) - sx(cell[0])" y="30" height="24" style="fill:var(--accent-soft)" />
      <line :x1="sx(c.lo)" :x2="sx(c.hi)" y1="42" y2="42" style="stroke:var(--ink-3)" />
      <g v-for="(l, i) in eig.vals" :key="i">
        <line :x1="sx(l)" :x2="sx(l)" y1="34" y2="50" :style="{ stroke: i === info.j ? 'var(--accent)' : 'var(--ink-2)', strokeWidth: i === info.j ? 3 : 1.5 }" />
        <text :x="sx(l)" y="24" font-size="13" text-anchor="middle" :style="{ fill: i === info.j ? 'var(--accent)' : 'var(--ink-2)', fontWeight: i === info.j ? 700 : 400 }">λ = {{ +l.toFixed(3) }}</text>
      </g>
      <path :d="`M${sx(q)},52 l-6,14 h12 z`" style="fill:var(--warn)" />
      <text :x="sx(q)" y="84" font-size="13" text-anchor="middle" style="fill:var(--warn);font-weight:700">q</text>
    </svg>
    <div class="stats">
      <div class="stat"><b>{{ info.singular ? '—' : +eig.vals[info.j].toFixed(4) }}</b><span>目标特征值 λⱼ（离 q 最近）</span></div>
      <div class="stat"><b>{{ info.singular ? '—' : info.gamma.toFixed(4) }}</b><span>γ(q)：每步误差约乘这么多</span></div>
      <div class="stat"><b>{{ info.singular ? '∞' : sci(info.kappa) }}</b><span>κ₂(A − qI)</span></div>
      <div class="stat"><b>{{ info.singular ? '—' : hit < 0 ? `> ${N}` : hit }}</b><span>误差 &lt; 10⁻¹⁰ 的步数</span></div>
    </div>
    <p v-if="info.singular" class="widget-note" style="color:var(--warn)"><b>q 恰好是特征值：A − qI 奇异，方程解不出来。实际中把 q 稍微挪开一点即可（见 9.6 节）。</b></p>
    <p v-else-if="info.tie" class="widget-note" style="color:var(--warn)"><b>q 正好在两个特征值的中点：两个方向一样“近”，γ = 1，不收敛到单一方向。</b></p>
    <table class="mini-table" style="font-variant-numeric:tabular-nums;margin-bottom:8px">
      <thead><tr><th>λᵢ</th><th>(A − qI)⁻¹ 的特征值 1/(λᵢ − q)</th><th>|λⱼ − q| / |λᵢ − q|</th></tr></thead>
      <tbody>
        <tr v-for="(l, i) in eig.vals" :key="i" :class="{ best: i === info.j && !info.singular }">
          <td>{{ +l.toFixed(4) }}</td>
          <td>{{ info.d[i] < 1e-12 ? '∞' : (1 / (l - q)).toFixed(4) }}</td>
          <td>{{ info.singular ? '—' : i === info.j ? '1（目标）' : (info.d[info.j] / info.d[i]).toFixed(4) }}</td>
        </tr>
      </tbody>
    </table>
    <svg :viewBox="`0 0 ${PW} ${PH}`" style="width:100%;height:auto">
      <g v-for="p in [0, -4, -8, -12, -16]" :key="p">
        <line :x1="px(0)" :x2="px(N)" :y1="py(p)" :y2="py(p)" style="stroke:var(--line-2)" />
        <text :x="px(0) - 6" :y="py(p) + 4" font-size="11" text-anchor="end" style="fill:var(--ink-3)">1e{{ p }}</text>
      </g>
      <g v-for="k in [0, 5, 10, 15, 20, 25, 30]" :key="k"><text :x="px(k)" :y="PH - 8" font-size="11" text-anchor="middle" style="fill:var(--ink-3)">{{ k }}</text></g>
      <path :d="line(errPow)" style="fill:none;stroke:var(--ink-3);stroke-width:1.8" stroke-dasharray="5 4" />
      <path v-if="!info.singular" :d="theory" style="fill:none;stroke:var(--warn);stroke-width:1.2" stroke-dasharray="2 3" />
      <path :d="line(errInv)" style="fill:none;stroke:var(--accent);stroke-width:2.4" />
      <circle v-for="(e, k) in errInv" :key="k" :cx="px(k)" :cy="yOf(e)" r="2.6" style="fill:var(--accent)" />
    </svg>
    <p class="widget-note"><span style="color:var(--accent);font-weight:700">实线</span>：位移逆迭代与目标特征向量的夹角正弦 sin θₖ；<span style="color:var(--warn)">点线</span>：理论斜率 γ(q)ᵏ；<span style="color:var(--ink-3)">虚线</span>：直接幂迭代（趋向模最大的特征向量）。课件例子 q = 2.8 时 γ = 1/9 ≈ 0.111，幂迭代的比为 3/8。把 q 拖近 3 看实线变陡，拖过中点 2 或 5.5 看目标跳到别的特征值。</p>
  </Widget>
</template>
