<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { symWithEigs, eigSym, qrStep, orthStep, matmul, eye, norm2, frob, type Mat } from '../lib/l09'
import { sci } from '../lib/plot'

// 无位移 QR 迭代 A_{k+1} = R_k Q_k：热力图看非对角元一格一格消失；同时核对 P25 “累积 Z_k = 同时迭代的正交基”
interface Case { name: string; A: Mat }
const CASES: Case[] = [
  { name: '2×2 课件例子 (2 1; 1 2)', A: [[2, 1], [1, 2]] },
  { name: '4×4 对称，特征值 10, 6, 3, 1', A: symWithEigs([10, 6, 3, 1], 3) },
  { name: '5×5 对称，特征值 5, −4, 3, −2, 1', A: symWithEigs([5, -4, 3, -2, 1], 17) },
  { name: '反例 (0 1; 1 0)（P37）', A: [[0, 1], [1, 0]] }
]
const ci = ref(0)
const c = computed(() => CASES[ci.value])
const K = 60
const k = ref(0)
watch(ci, () => { k.value = 0 })

// 预先算好 A_k、累积 Z_k 与同时迭代的 Q̃_k
const hist = computed(() => {
  const A0 = c.value.A, n = A0.length
  let A = A0, Z = eye(n), S = eye(n)
  const out = [{ A, zdiff: 0 }]
  for (let i = 0; i < K; i++) {
    const st = qrStep(A)
    A = st.A; Z = matmul(Z, st.Q); S = orthStep(A0, S)
    out.push({ A, zdiff: Math.max(...Z.flat().map((v, t) => Math.abs(v - S.flat()[t]))) })
  }
  return out
})
const Ak = computed(() => hist.value[k.value].A)
const n = computed(() => c.value.A.length)
const lams = computed(() => eigSym(c.value.A).vals)
const offF = computed(() => frob(Ak.value.map((r, i) => r.map((v, j) => (i === j ? 0 : v)))))
const off2 = computed(() => norm2(Ak.value.map((r, i) => r.map((v, j) => (i === j ? 0 : v)))))
const tr = computed(() => { const t = Ak.value.reduce((s, r, i) => s + r[i], 0); return Math.abs(t) < 1e-12 ? 0 : t })
// 对角元降序 vs 特征值降序（P23 的 Weyl 型误差界）
const dsort = computed(() => Ak.value.map((r, i) => r[i]).sort((a, b) => b - a))
const maxDev = computed(() => Math.max(...dsort.value.map((d, i) => Math.abs(d - lams.value[i]))))
// 颜色：按 log10|a| 相对最大元的比例
const amax = computed(() => Math.max(...c.value.A.flat().map(Math.abs)))
const shade = (v: number) => {
  const t = Math.abs(v) / amax.value
  return t < 1e-15 ? 0 : Math.max(0, 1 + Math.log10(t) / 15)
}
const show = (v: number) => Math.abs(v) >= 1e-3 || v === 0 ? (+v.toFixed(4)).toString() : sci(v, 1)

let timer: ReturnType<typeof setInterval> | undefined
function play() {
  clearInterval(timer); k.value = 0
  timer = setInterval(() => { if (k.value >= 40) clearInterval(timer); else k.value++ }, 220)
}
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <Widget title="QR 迭代：交换因子顺序，矩阵一步步变成对角">
    <div class="ctrl">
      <select v-model.number="ci"><option v-for="(cc, i) in CASES" :key="i" :value="i">{{ cc.name }}</option></select>
    </div>
    <div class="ctrl">
      <button class="btn" @click="k = Math.max(0, k - 1)">◂</button>
      <button class="btn primary" @click="k = Math.min(K, k + 1)">QR 一步 ▸</button>
      <button class="btn" @click="play">▶ 自动播放</button>
      <button class="btn" @click="k = 0">⟲</button>
      <label>k = <b>{{ k }}</b><input v-model.number="k" type="range" min="0" :max="K" step="1"></label>
    </div>
    <div style="display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:14px;align-items:start">
      <div>
        <p class="widget-note" style="margin-bottom:4px">A<sub>{{ k }}</sub>（颜色深浅 ∝ log₁₀|aᵢⱼ|，空白 ≈ 0）</p>
        <div :style="{ display: 'grid', gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, gap: '3px' }">
          <template v-for="(row, i) in Ak" :key="i">
            <div v-for="(v, j) in row" :key="j"
              :style="{ background: `color-mix(in srgb, ${i === j ? 'var(--ex)' : 'var(--accent)'} ${Math.round(shade(v) * 85)}%, var(--vp-c-bg))`, color: shade(v) > 0.55 ? '#fff' : 'var(--ink)', border: '1px solid var(--line)', borderRadius: '6px', padding: '8px 2px', textAlign: 'center', fontSize: n > 4 ? '11px' : '13px', fontVariantNumeric: 'tabular-nums', overflow: 'hidden' }">{{ show(v) }}</div>
          </template>
        </div>
      </div>
      <div>
        <div class="stats">
          <div class="stat"><b>{{ sci(offF) }}</b><span>‖Eₖ‖_F（非对角部分）</span></div>
          <div class="stat"><b>{{ sci(maxDev) }}</b><span>max |λ₍ᵢ₎ − d₍ᵢ₎|（≤ ‖Eₖ‖₂ = {{ sci(off2) }}）</span></div>
          <div class="stat"><b>{{ tr.toFixed(10) }}</b><span>tr Aₖ（不变）</span></div>
          <div class="stat"><b>{{ sci(hist[k].zdiff) }}</b><span>max |Zₖ − 同时迭代 Q̃ₖ|</span></div>
        </div>
        <table class="mini-table" style="font-variant-numeric:tabular-nums">
          <thead><tr><th>对角元（降序）</th><th>真特征值（降序）</th></tr></thead>
          <tbody><tr v-for="(d, i) in dsort" :key="i"><td>{{ d.toFixed(8) }}</td><td>{{ +lams[i].toFixed(8) }}</td></tr></tbody>
        </table>
      </div>
    </div>
    <p class="widget-note">核对课件 P24：2×2 例子 k = 1 时 A₁ = (2.8 0.6; 0.6 1.2)，k = 2, 3, 4 时非对角元 0.2195、0.0740、0.0247（课件 P26 的折线），每步约乘 λ₂/λ₁ = 1/3。4×4、5×5 的例子里 (i, j) 位置大致按 |λᵢ/λⱼ|ᵏ 衰减，最靠近对角线、模最接近的那一对最慢；5×5 的对角元最后按模从大到小排列。反例 (0 1; 1 0) 一步也不动：两个特征值 ±1 模相等。最后一个指标验证 9.14 节：累积的 Zₖ = Q₀Q₁⋯Qₖ₋₁ 与同时迭代（Z₀ = I）的正交基在舍入误差内完全相同。</p>
  </Widget>
</template>
