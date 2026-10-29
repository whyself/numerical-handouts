<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { iterate2, type Sys2 } from '../lib/l06'
import { makeScale, sci } from '../lib/plot'

// Jacobi / Gauss-Seidel 逐步迭代：课件 P15、P16、P19 的两个 2×2 方程组，真解都是 (1, 2)
const PRESETS: { name: string; s: Sys2 }[] = [
  { name: '3u + v = 5, u + 2v = 5（P15 / P19）', s: { a: 3, b: 1, c: 1, d: 2, e: 5, f: 5 } },
  { name: 'u + 2v = 5, 3u + v = 5（P16，换了方程顺序）', s: { a: 1, b: 2, c: 3, d: 1, e: 5, f: 5 } },
  { name: '自定义（右端自动取为使真解 = (1, 2)）', s: { a: 2, b: 1, c: 1.5, d: 2, e: 4, f: 5.5 } }
]
const pi = ref(0)
const s = ref<Sys2>({ ...PRESETS[0].s })
watch(pi, i => { s.value = { ...PRESETS[i].s }; shown.value = 0 })
// 自定义时保持真解为 (1, 2)
watch(() => [s.value.a, s.value.b, s.value.c, s.value.d], () => {
  if (pi.value === 2) { s.value.e = s.value.a + 2 * s.value.b; s.value.f = s.value.c + 2 * s.value.d; shown.value = 0 }
})
const method = ref<'jacobi' | 'gs'>('jacobi')
const shown = ref(0)
watch(method, () => { shown.value = 0 })
const K = 40
const its = computed(() => iterate2(s.value, method.value, K))
const cur = computed(() => Math.min(shown.value, its.value.length - 1))
const sol = computed(() => {
  const { a, b, c, d, e, f } = s.value, D = a * d - b * c
  return [(e * d - b * f) / D, (a * f - c * e) / D]
})
const rows = computed(() => its.value.slice(0, cur.value + 1).map((p, k) => ({ k, ...p, err: Math.max(Math.abs(p.u - sol.value[0]), Math.abs(p.v - sol.value[1])) })).slice(-8))

// 谱半径：Jacobi 迭代矩阵 [[0, −b/a], [−c/d, 0]] 的特征值 ±√(bc/(ad))；
// Gauss-Seidel 迭代矩阵 (L+D)⁻¹U 的特征值为 0 和 bc/(ad)
const q = computed(() => (s.value.b * s.value.c) / (s.value.a * s.value.d))
const rhoJ = computed(() => Math.sqrt(Math.abs(q.value)))
const rhoG = computed(() => Math.abs(q.value))
const rho = computed(() => method.value === 'jacobi' ? rhoJ.value : rhoG.value)
const sdd = computed(() => Math.abs(s.value.a) > Math.abs(s.value.b) && Math.abs(s.value.d) > Math.abs(s.value.c))

const W = 360, H = 360
const span = computed(() => {
  const pts = its.value.slice(0, cur.value + 1)
  const m = Math.max(2.6, ...pts.map(p => Math.max(Math.abs(p.u - 1), Math.abs(p.v - 2)) * 1.1))
  return Math.min(m, 1e6)
})
const sx = computed(() => makeScale(1 - span.value, 1 + span.value, 10, W - 10))
const sy = computed(() => makeScale(2 - span.value, 2 + span.value, H - 10, 10))
// 方程 i：a_i1 u + a_i2 v = rhs，画成穿过视窗的线段
function lineOf(p: number, r: number, rhs: number) {
  const L = span.value * 4, n2 = p * p + r * r, t = (rhs - p * 1 - r * 2) / n2
  const cx = 1 + t * p, cy = 2 + t * r, k = L / Math.sqrt(n2)
  return { x1: sx.value(cx - k * r), y1: sy.value(cy + k * p), x2: sx.value(cx + k * r), y2: sy.value(cy - k * p) }
}
const path = computed(() => {
  const pts = its.value.slice(0, cur.value + 1)
  let d = `M${sx.value(pts[0].u)},${sy.value(pts[0].v)}`
  for (let k = 1; k < pts.length; k++) {
    const m = pts[k].mid
    if (m) d += `L${sx.value(m[0])},${sy.value(m[1])}`
    d += `L${sx.value(pts[k].u)},${sy.value(pts[k].v)}`
  }
  return d
})
let timer: ReturnType<typeof setInterval> | undefined
function play() {
  clearInterval(timer); shown.value = 0
  timer = setInterval(() => { if (shown.value >= Math.min(its.value.length - 1, 20)) clearInterval(timer); else shown.value++ }, 600)
}
onBeforeUnmount(() => clearInterval(timer))
const show = (x: number, f?: string) => f ?? (Math.abs(x) < 1e5 ? Number(x.toFixed(6)).toString() : sci(x))
</script>

<template>
  <Widget title="Jacobi 与 Gauss-Seidel：一步一步算">
    <div class="ctrl">
      <select v-model.number="pi"><option v-for="(c, i) in PRESETS" :key="i" :value="i">{{ c.name }}</option></select>
      <div class="seg">
        <button :class="{ on: method === 'jacobi' }" @click="method = 'jacobi'">Jacobi</button>
        <button :class="{ on: method === 'gs' }" @click="method = 'gs'">Gauss-Seidel</button>
      </div>
    </div>
    <div v-if="pi === 2" class="ctrl">
      <label v-for="(k, j) in (['a', 'b', 'c', 'd'] as const)" :key="k">{{ ['a₁₁', 'a₁₂', 'a₂₁', 'a₂₂'][j] }} = <b>{{ s[k] }}</b><input v-model.number="s[k]" type="range" :min="j === 0 || j === 3 ? 0.5 : -3" max="4" step="0.5" style="width:100px"></label>
    </div>
    <div class="ctrl">
      <button class="btn" @click="shown = Math.max(0, shown - 1)">◂</button>
      <button class="btn primary" @click="shown = Math.min(shown + 1, its.length - 1)">迭代一次 ▸</button>
      <button class="btn" @click="play">▶ 自动播放</button>
      <button class="btn" @click="shown = 0">⟲</button>
    </div>
    <div class="two-col" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start">
      <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto;border:1px solid var(--line-2);border-radius:8px">
        <line v-bind="lineOf(s.a, s.b, s.e)" style="stroke:var(--prin);stroke-width:2" />
        <line v-bind="lineOf(s.c, s.d, s.f)" style="stroke:var(--ex);stroke-width:2" />
        <path :d="path" style="fill:none;stroke:var(--accent);stroke-width:1.6" />
        <circle v-for="(p, k) in its.slice(0, cur + 1)" :key="k" :cx="sx(p.u)" :cy="sy(p.v)" r="3.5" style="fill:var(--accent)" />
        <circle :cx="sx(1)" :cy="sy(2)" r="5" style="fill:var(--ink)" />
        <text :x="sx(1) + 8" :y="sy(2) - 8" font-size="12" style="fill:var(--ink)">(1, 2)</text>
        <text x="14" y="24" font-size="12" style="fill:var(--prin)">第 1 个方程（解出 u）</text>
        <text x="14" y="42" font-size="12" style="fill:var(--ex)">第 2 个方程（解出 v）</text>
      </svg>
      <div>
        <div class="stats">
          <div class="stat"><b>{{ rhoJ.toFixed(4) }}</b><span>ρ(Jacobi 迭代矩阵)</span></div>
          <div class="stat"><b>{{ rhoG.toFixed(4) }}</b><span>ρ(G-S 迭代矩阵)</span></div>
        </div>
        <p class="widget-note" style="margin-bottom:6px">
          严格对角占优：<b :class="sdd ? 'ok-c' : 'bad-c'">{{ sdd ? '是' : '否' }}</b>；当前方法 ρ = {{ rho.toFixed(4) }}，<b :class="rho < 1 ? 'ok-c' : 'bad-c'">{{ rho < 1 ? '收敛' : '发散' }}</b>
        </p>
        <table class="mini-table" style="font-variant-numeric:tabular-nums">
          <thead><tr><th>k</th><th>u<sub>k</sub></th><th>v<sub>k</sub></th><th>误差 (∞-范数)</th></tr></thead>
          <tbody>
            <tr v-for="r in rows" :key="r.k" :class="{ best: r.k === cur }"><td>{{ r.k }}</td><td>{{ show(r.u, r.uf) }}</td><td>{{ show(r.v, r.vf) }}</td><td>{{ sci(r.err) }}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="widget-note">整数系数时 u<sub>k</sub>、v<sub>k</sub> 用分数精确计算，可以直接和课件 P15、P16、P19 的表对照。Jacobi 每步同时用旧的 (u<sub>k</sub>, v<sub>k</sub>)；Gauss-Seidel 先算出 u<sub>k+1</sub>（水平移到蓝线上），马上用它算 v<sub>k+1</sub>（竖直移到绿线上），所以轨迹是阶梯形。2×2 时 ρ(G-S) = ρ(Jacobi)²：误差每步缩小的倍数恰好平方。</p>
  </Widget>
</template>
