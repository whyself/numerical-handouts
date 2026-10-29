<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { symWithEigs, eigSym, qr, orthStep, matmul, transpose, dot, col, norm2, sinAngle, type Mat } from '../lib/l09'
import { makeScale, sci } from '../lib/plot'

// 同时迭代（正交迭代）：r 个向量一起乘 A，再 QR 正交化；对比“只乘 A 不正交化”
const LAMS = [10, 6, 3, 1]
const A = symWithEigs(LAMS, 3)
const E = eigSym(A)
const n = 4
// 固定的随机初始正交基
const Q0full = qr(symWithEigs([4, 3, 2, 1], 29).map((r, i) => r.map((v, j) => v + (i === j ? 0.3 : 0.1 * (i - j))))).Q
const r = ref(3)
const orth = ref(true)
const K = 40
const k = ref(0)
watch([r, orth], () => { k.value = 0 })

const hist = computed(() => {
  let Q: Mat = Q0full.map(row => row.slice(0, r.value))
  const out = [Q]
  for (let i = 0; i < K; i++) { Q = orthStep(A, Q, orth.value); out.push(Q) }
  return out
})
const Q = computed(() => hist.value[k.value])
// |vᵢᵀ qⱼ|：第 j 列在各特征方向上的分量
const C = computed(() => E.vecs.map(v => Q.value[0].map((_, j) => Math.abs(dot(v, col(Q.value, j))))))
// T = QᵀAQ
const T = computed(() => matmul(matmul(transpose(Q.value), A), Q.value))
const ritz = computed(() => eigSym(T.value).vals)
// 课件 P19 的可验证误差界 ‖(I − QQᵀ)AQ‖₂
const resBound = computed(() => {
  const AQ = matmul(A, Q.value), P = matmul(Q.value, matmul(transpose(Q.value), AQ))
  return norm2(AQ.map((row, i) => row.map((v, j) => v - P[i][j])))
})
const ritzErr = computed(() => ritz.value.map(t => Math.min(...LAMS.map(l => Math.abs(t - l)))))

// 第 j 列与 vⱼ 的夹角正弦，随迭代次数的变化
const err = computed(() => [...Array(r.value).keys()].map(j => hist.value.map(Qk => sinAngle(col(Qk, j), E.vecs[j]))))
const W = 640, H = 220
const sx = makeScale(0, K, 44, W - 12)
const sy = makeScale(0, -16, 12, H - 26)
const yOf = (e: number) => sy(Math.log10(Math.max(e, 1e-16)))
const line = (es: number[]) => es.map((e, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${yOf(e).toFixed(1)}`).join('')
const COLORS = ['var(--accent)', 'var(--ex)', 'var(--prin)', 'var(--warn)']
// 第 j 列的理论收敛比 max(λⱼ₊₁/λⱼ, λⱼ/λⱼ₋₁)（只计入 r 列以内的相邻比；最后一列取 λ_{r+1}/λ_r）
const rate = (j: number) => {
  const a = j + 1 < n ? LAMS[j + 1] / LAMS[j] : 0, b = j > 0 ? LAMS[j] / LAMS[j - 1] : 0
  return Math.max(a, b).toFixed(3)
}

let timer: ReturnType<typeof setInterval> | undefined
function play() {
  clearInterval(timer); k.value = 0
  timer = setInterval(() => { if (k.value >= 30) clearInterval(timer); else k.value++ }, 260)
}
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <Widget title="同时迭代：多个向量一起做幂迭代，每步用 QR 保持正交">
    <div class="ctrl">
      <span>A = V·diag(10, 6, 3, 1)·Vᵀ（4×4 对称）</span>
      <div class="seg"><button v-for="m in [1, 2, 3, 4]" :key="m" :class="{ on: r === m }" @click="r = m">r = {{ m }}</button></div>
      <label><input v-model="orth" type="checkbox"> 每步 QR 正交化</label>
    </div>
    <div class="ctrl">
      <button class="btn" @click="k = Math.max(0, k - 1)">◂</button>
      <button class="btn primary" @click="k = Math.min(K, k + 1)">迭代一步 ▸</button>
      <button class="btn" @click="play">▶ 自动播放</button>
      <button class="btn" @click="k = 0">⟲</button>
      <span>k = <b>{{ k }}</b></span>
    </div>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start">
      <div>
        <p class="widget-note" style="margin-bottom:4px">|vᵢᵀ qⱼ|：第 j 列落在第 i 个特征方向上的多少</p>
        <table class="mini-table" style="font-variant-numeric:tabular-nums;text-align:center">
          <thead><tr><th></th><th v-for="j in r" :key="j">q{{ j }}</th></tr></thead>
          <tbody>
            <tr v-for="(row, i) in C" :key="i">
              <th>v{{ i + 1 }}（λ = {{ LAMS[i] }}）</th>
              <td v-for="(v, j) in row" :key="j" :style="{ background: `color-mix(in srgb, var(--accent) ${Math.round(v * 70)}%, transparent)`, color: v > 0.6 ? '#fff' : 'var(--ink)' }">{{ v.toFixed(3) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div>
        <template v-if="orth">
          <p class="widget-note" style="margin-bottom:4px">T = QᵀAQ 的对角元（各列的 Rayleigh 商）与 Ritz 值</p>
          <table class="mini-table" style="font-variant-numeric:tabular-nums">
            <thead><tr><th>j</th><th>Tⱼⱼ</th><th>Ritz 值 θ</th><th>min |θ − λᵢ|</th></tr></thead>
            <tbody>
              <tr v-for="j in r" :key="j"><td>{{ j }}</td><td>{{ T[j - 1][j - 1].toFixed(6) }}</td><td>{{ ritz[j - 1].toFixed(6) }}</td><td>{{ sci(ritzErr[j - 1]) }}</td></tr>
            </tbody>
          </table>
          <div class="stats"><div class="stat"><b>{{ sci(resBound) }}</b><span>可验证误差界 ‖(I − QQᵀ)AQ‖₂</span></div></div>
        </template>
        <p v-else class="widget-note" style="color:var(--warn)"><b>不正交化：每一列都是独立的幂迭代，全部倒向 v₁（看左表第一行）。列之间几乎平行，这组向量已经张不出 r 维子空间。</b></p>
      </div>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
      <g v-for="p in [0, -4, -8, -12, -16]" :key="p">
        <line :x1="sx(0)" :x2="sx(K)" :y1="sy(p)" :y2="sy(p)" style="stroke:var(--line-2)" />
        <text :x="sx(0) - 6" :y="sy(p) + 4" font-size="11" text-anchor="end" style="fill:var(--ink-3)">1e{{ p }}</text>
      </g>
      <g v-for="t in [0, 10, 20, 30, 40]" :key="t"><text :x="sx(t)" :y="H - 8" font-size="11" text-anchor="middle" style="fill:var(--ink-3)">{{ t }}</text></g>
      <line :x1="sx(k)" :x2="sx(k)" :y1="sy(0)" :y2="sy(-16)" style="stroke:var(--ink-3)" stroke-dasharray="3 3" />
      <path v-for="(es, j) in err" :key="j" :d="line(es)" :style="{ fill: 'none', stroke: COLORS[j], strokeWidth: 2.2 }" />
    </svg>
    <p class="widget-note"><span v-for="j in r" :key="j" style="margin-right:12px"><b :style="{ color: COLORS[j - 1] }">●</b> q{{ j }} 与 v{{ j }} 的夹角正弦（理论比 ≈ {{ rate(j - 1) }}）</span><br>正交化时第 j 列以大约 max(λⱼ₊₁/λⱼ, λⱼ/λⱼ₋₁) 的比例线性收敛（9.9 节补充说明）：q₁ 的直线斜率是 0.6，q₂ 受 6/10 和 3/6 共同影响。取 r = 1 就是普通幂迭代。</p>
  </Widget>
</template>
