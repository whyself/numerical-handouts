<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { gramSchmidt, orthLoss, factorResidual, lauchli, type Mat } from '../lib/l04'
import { sci } from '../lib/plot'

// Gram–Schmidt 逐步构造 QR：每一步只做一件事——算一个 r_ij、减掉一个投影，或者归一化
const CASES: { name: string; A: Mat }[] = [
  { name: '3 × 2 小例子', A: [[1, -4], [2, 3], [2, 2]] },
  { name: '4 × 3 的 0/1 矩阵', A: [[1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1]] },
  { name: 'Läuchli 矩阵（ε = 10⁻⁸）', A: lauchli(3, 1e-8) }
]
const ci = ref(0)
const kind = ref<'cgs' | 'mgs'>('cgs')
const s = ref(0)
watch([ci, kind], () => { s.value = 0 })

const A = computed(() => CASES[ci.value].A)
const res = computed(() => gramSchmidt(A.value, kind.value, true))
const steps = computed(() => res.value.steps)
const m = computed(() => A.value.length)
const n = computed(() => A.value[0].length)
const done = computed(() => steps.value.slice(0, s.value))
const filled = computed(() => new Set(done.value.map(t => `${t.i},${t.j}`)))
const qDone = computed(() => done.value.filter(t => t.i === t.j).length)
const cur = computed(() => s.value ? steps.value[s.value - 1] : null)

const f = (v: number) => v === 0 ? '0' : Math.abs(v) < 1e-3 || Math.abs(v) >= 1e4 ? sci(v, 3) : (Math.round(v * 1e4) / 1e4).toString()
const vec = (v: number[]) => '(' + v.map(f).join(', ') + ')'
const sub = (k: number) => String(k + 1).replace(/\d/g, d => '₀₁₂₃₄₅₆₇₈₉'[+d])

const desc = computed(() => {
  const t = cur.value
  if (!t) return '从 y ← A₁ 开始。点“下一步”。'
  const i = sub(t.i), j = sub(t.j)
  if (t.i < t.j) {
    const src = kind.value === 'cgs' ? `A${j}` : 'y'
    return `r${i}${j} = ⟨q${i}, ${src}⟩ = ${f(t.rij)}；y ← y − r${i}${j} q${i} = ${vec(t.y)}`
  }
  return `r${j}${j} = ‖y‖₂ = ${f(t.rij)}；q${j} = y / r${j}${j} = ${vec(res.value.Q.map(r => r[t.j]))}`
})
const finished = computed(() => s.value === steps.value.length)
const checks = computed(() => ({ orth: orthLoss(res.value.Q), fac: factorResidual(A.value, res.value.Q, res.value.R) }))
</script>

<template>
  <Widget title="Gram–Schmidt 逐步构造 A = QR">
    <div class="ctrl">
      <select v-model.number="ci"><option v-for="(c, i) in CASES" :key="i" :value="i">{{ c.name }}</option></select>
      <div class="seg">
        <button :class="{ on: kind === 'cgs' }" @click="kind = 'cgs'">CGS：投影原列 Aⱼ</button>
        <button :class="{ on: kind === 'mgs' }" @click="kind = 'mgs'">MGS：投影当前 y</button>
      </div>
    </div>
    <div class="ctrl">
      <button class="btn" @click="s = Math.max(0, s - 1)">◂</button>
      <button class="btn primary" @click="s = Math.min(steps.length, s + 1)">下一步 ▸</button>
      <button class="btn" @click="s = steps.length">到最后</button>
      <button class="btn" @click="s = 0">⟲</button>
      <span class="muted" style="font-size:13px">第 {{ s }} / {{ steps.length }} 步</span>
    </div>
    <div class="out prose">{{ desc }}</div>
    <div style="display:flex;flex-wrap:wrap;gap:18px;margin-top:12px;overflow-x:auto">
      <div>
        <div class="widget-note" style="margin:0 0 4px">A（{{ m }} × {{ n }}）</div>
        <table class="mini-table" style="width:auto;font-variant-numeric:tabular-nums">
          <tbody><tr v-for="(r, i) in A" :key="i"><td v-for="(v, j) in r" :key="j" :style="cur && cur.j === j ? 'background:var(--accent-soft)' : ''">{{ f(v) }}</td></tr></tbody>
        </table>
      </div>
      <div>
        <div class="widget-note" style="margin:0 0 4px">Q（已完成 {{ qDone }} 列）</div>
        <table class="mini-table" style="width:auto;font-variant-numeric:tabular-nums">
          <tbody><tr v-for="(r, i) in res.Q" :key="i"><td v-for="(v, j) in r" :key="j" :style="j < qDone ? '' : 'color:var(--line)'">{{ j < qDone ? f(v) : '·' }}</td></tr></tbody>
        </table>
      </div>
      <div>
        <div class="widget-note" style="margin:0 0 4px">R（上三角）</div>
        <table class="mini-table" style="width:auto;font-variant-numeric:tabular-nums">
          <tbody><tr v-for="(r, i) in res.R" :key="i">
            <td v-for="(v, j) in r" :key="j" :style="cur && cur.i === i && cur.j === j ? 'background:var(--ex-bg);font-weight:700' : ''">{{ i > j ? '0' : filled.has(`${i},${j}`) ? f(v) : '·' }}</td>
          </tr></tbody>
        </table>
      </div>
    </div>
    <div v-if="finished" class="stats">
      <div class="stat"><b :class="checks.orth < 1e-8 ? 'ok-c' : 'bad-c'">{{ sci(checks.orth) }}</b><span>‖I − QᵀQ‖_F（正交性）</span></div>
      <div class="stat"><b>{{ sci(checks.fac) }}</b><span>‖A − QR‖_F / ‖A‖_F</span></div>
    </div>
    <p class="widget-note">第一个例子：q₁ = (1, 2, 2)/3，r₁₁ = 3，r₁₂ = ⟨q₁, A₂⟩ = 2，y₂ = A₂ − 2q₁ = (−14, 5, 2)/3，r₂₂ = 5，可以手算核对。前两个例子里 CGS 与 MGS 每一步的数字完全一样（精确算术下等价）；换到 Läuchli 矩阵（第一行全 1、下面 εI，三列几乎平行）对比 r₂₃ 和最后的正交性：CGS 的 q₂、q₃ 夹角约 60°，而不是 90°。</p>
  </Widget>
</template>
