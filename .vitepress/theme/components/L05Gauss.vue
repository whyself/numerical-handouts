<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { gaussSteps, eye, matMul, type Mat } from '../lib/l05'

// 高斯消元逐步动画：每一步是左乘一个初等矩阵；消元乘子 ℓ 原样落进 L，行交换记进 P
const PRESETS: { name: string; A: Mat }[] = [
  { name: '3×3 例子', A: [[2, 1, 1], [4, 3, 3], [8, 7, 9]] },
  { name: '主元为 0（P38）', A: [[0, 1], [1, 1]] },
  { name: '4×4 例子', A: [[1, 2, 1, 0], [2, 2, 3, 1], [-1, -3, 0, 2], [1, 0, 2, 5]] },
  { name: '奇异矩阵', A: [[1, 2, 3], [2, 4, 7], [3, 6, 10]] }
]
const pi = ref(0)
const pivot = ref<'none' | 'partial'>('none')
const shown = ref(0)
watch([pi, pivot], () => { shown.value = 0 })

const A = computed(() => PRESETS[pi.value].A)
const n = computed(() => A.value.length)
const steps = computed(() => gaussSteps(A.value, pivot.value))
const cur = computed(() => (shown.value ? steps.value[shown.value - 1] : null))
const U = computed(() => (cur.value ? cur.value.U : A.value))
const L = computed(() => (cur.value ? cur.value.L : eye(n.value)))
const perm = computed(() => (cur.value ? cur.value.perm : A.value.map((_, i) => i)))
const done = computed(() => shown.value === steps.value.length)
const failed = computed(() => steps.value.some(s => s.kind === 'zero'))
const singular = computed(() => steps.value.some(s => s.kind === 'singular'))

// 有理数显示：分母不大时写成分数
function fmt(v: number) {
  if (Math.abs(v) < 1e-12) return '0'
  for (let d = 1; d <= 12; d++) {
    const nmr = Math.round(v * d)
    if (Math.abs(nmr / d - v) < 1e-9) return d === 1 ? String(nmr).replace('-', '−') : `${nmr < 0 ? '−' : ''}${Math.abs(nmr)}/${d}`
  }
  return Number(v.toFixed(4)).toString().replace('-', '−')
}
const SUB = '₀₁₂₃₄₅₆₇₈₉'
const sub = (i: number) => String(i).replace(/\d/g, d => SUB[+d])

const desc = computed(() => {
  const s = cur.value
  if (!s) return '初始状态：U = A，L = I，P = I。点“下一步”开始消元。'
  const R = (i: number) => `R${sub(i + 1)}`
  if (s.kind === 'swap') return `第 ${s.col + 1} 列：选主元，交换 ${R(s.i!)} ↔ ${R(s.j!)}（左乘置换矩阵；L 中已记下的乘子跟着换行）`
  if (s.kind === 'elim') return `${R(s.j!)} ← ${R(s.j!)} − (${fmt(s.l!)})·${R(s.i!)}：左乘 E = I − ℓ e${sub(s.j! + 1)}e${sub(s.i! + 1)}ᵀ，乘子 ℓ${sub(s.j! + 1)}${sub(s.i! + 1)} = ${fmt(s.l!)} 写进 L 的 (${s.j! + 1}, ${s.i! + 1}) 位置`
  if (s.kind === 'zero') return `第 ${s.col + 1} 列主元为 0，不换行就无法继续——必须选主元（切换到“部分选主元”再试）`
  return `第 ${s.col + 1} 列在未消元的行里全是 0：没有非零主元可选，矩阵奇异（U 的对角线上会出现 0）`
})
// 当前步高亮：主元位置、被修改的行
const hl = computed(() => {
  const s = cur.value
  if (!s) return { piv: [-1, -1], rows: [] as number[] }
  return { piv: [s.i ?? s.col, s.col], rows: s.kind === 'swap' ? [s.i!, s.j!] : s.kind === 'elim' ? [s.j!] : [] }
})
const PA = computed(() => perm.value.map(i => A.value[i]))
const upper = computed(() => U.value.every((r, i) => r.every((v, j) => j >= i || Math.abs(v) < 1e-12)))
const resid = computed(() => {
  const LU = matMul(L.value, U.value)
  return Math.max(...PA.value.flatMap((r, i) => r.map((v, j) => Math.abs(v - LU[i][j]))))
})
const Pm = computed(() => perm.value.map(i => eye(n.value)[i]))
</script>

<template>
  <Widget title="高斯消元 = 一串初等矩阵；乘子就是 L">
    <div class="ctrl">
      <select v-model.number="pi"><option v-for="(p, i) in PRESETS" :key="i" :value="i">{{ p.name }}</option></select>
      <div class="seg">
        <button :class="{ on: pivot === 'none' }" @click="pivot = 'none'">不选主元</button>
        <button :class="{ on: pivot === 'partial' }" @click="pivot = 'partial'">部分选主元</button>
      </div>
    </div>
    <div class="ctrl">
      <button class="btn" @click="shown = Math.max(0, shown - 1)">◂</button>
      <button class="btn primary" @click="shown = Math.min(shown + 1, steps.length)">下一步 ▸</button>
      <button class="btn" @click="shown = steps.length">跳到最后</button>
      <button class="btn" @click="shown = 0">⟲</button>
      <span class="muted" style="font-size:13px">第 {{ shown }} / {{ steps.length }} 步</span>
    </div>
    <div class="out prose" style="margin-bottom:12px">{{ desc }}</div>
    <div style="display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start">
      <div>
        <div class="muted" style="font-size:12.5px;margin-bottom:4px">P（行的顺序）</div>
        <table class="mini-table gm"><tbody><tr v-for="(r, i) in Pm" :key="i"><td v-for="(v, j) in r" :key="j" :style="{ color: v ? 'var(--ink)' : 'var(--ink-3)' }">{{ v }}</td></tr></tbody></table>
      </div>
      <div>
        <div class="muted" style="font-size:12.5px;margin-bottom:4px">L（单位下三角，记录乘子）</div>
        <table class="mini-table gm"><tbody><tr v-for="(r, i) in L" :key="i">
          <td v-for="(v, j) in r" :key="j" :class="{ hot: cur && cur.kind === 'elim' && i === cur.j && j === cur.i }" :style="{ color: j < i ? 'var(--prin)' : j === i ? 'var(--ink)' : 'var(--ink-3)', fontWeight: j < i && v ? 700 : 400 }">{{ fmt(v) }}</td>
        </tr></tbody></table>
      </div>
      <div>
        <div class="muted" style="font-size:12.5px;margin-bottom:4px">当前矩阵（最终是 U）</div>
        <table class="mini-table gm"><tbody><tr v-for="(r, i) in U" :key="i" :class="{ rowhl: hl.rows.includes(i) }">
          <td v-for="(v, j) in r" :key="j" :class="{ piv: hl.piv[0] === i && hl.piv[1] === j }" :style="{ color: j < i && Math.abs(v) < 1e-12 ? 'var(--ink-3)' : 'var(--ink)' }">{{ fmt(v) }}</td>
        </tr></tbody></table>
      </div>
    </div>
    <div class="stats">
      <div class="stat"><b :class="resid < 1e-12 && upper ? 'ok-c' : ''">{{ resid >= 1e-12 ? '不成立' : upper ? '成立' : '还不是上三角' }}</b><span>PA = LU 且 U 上三角？</span></div>
      <div class="stat"><b>{{ steps.filter(s => s.kind === 'elim').length }}</b><span>全过程消元次数（每次左乘一个 E）</span></div>
      <div class="stat"><b>{{ steps.filter(s => s.kind === 'swap').length }}</b><span>全过程行交换次数</span></div>
    </div>
    <p v-if="done && failed" class="widget-note bad-c">不选主元在这里卡住了：主元恰好为 0。部分选主元会先把这一列绝对值最大的元素换到主元位置。</p>
    <p v-else-if="done && singular" class="widget-note bad-c">消元仍然能做完，PA = LU 也成立，但 U 的对角线上有 0：Ux = y 不能回代，A 奇异。</p>
    <p class="widget-note">注意 L 的严格下三角部分就是每一步的乘子 ℓ<sub>ji</sub>，原样照抄、不需要任何额外运算（证明见正文）。部分选主元时，每次换行要把 L 里已经写下的那几列乘子一起换行，最后得到的正是 PA = LU。</p>
  </Widget>
</template>

<style scoped>
.gm { width: auto !important; font-family: var(--vp-font-family-mono); }
.gm td { text-align: right !important; min-width: 44px; padding: 4px 8px !important; }
.gm td.hot { background: var(--prin-bg); }
.gm td.piv { outline: 2px solid var(--accent); outline-offset: -2px; }
.gm tr.rowhl td { background: var(--accent-soft); }
</style>
