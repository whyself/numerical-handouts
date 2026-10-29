<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { svd, lowRank, sub, fro, norm2, makeImage, mul, transpose, type ImgKind, type Mat } from '../lib/l08'
import { makeScale, fix, sci } from '../lib/plot'

// 图像的低秩逼近：保留前 k 个奇异值，看重构效果；误差直接计算，与 σ_{k+1} 对照
const N = 96
const KINDS: { id: ImgKind; name: string }[] = [
  { id: 'scene', name: '简笔画场景' },
  { id: 'smooth', name: '光滑函数' },
  { id: 'plaid', name: '格纹（秩 4）' },
  { id: 'noise', name: '白噪声' }
]
const kind = ref<ImgKind>('scene')
const k = ref(5)
const img = computed(() => makeImage(kind.value, N))
const dec = computed(() => svd(img.value))
const Ak = computed(() => lowRank(dec.value, k.value))
const R = computed(() => sub(img.value, Ak.value))
const s = computed(() => dec.value.s)

const stats = computed(() => {
  const sv = s.value, kk = k.value
  const tail2 = sv.slice(kk).reduce((a, v) => a + v * v, 0), all2 = sv.reduce((a, v) => a + v * v, 0)
  return {
    e2: norm2(R.value), s2: sv[kk] ?? 0,
    eF: fro(R.value), sF: Math.sqrt(tail2),
    energy: 1 - tail2 / all2,
    store: kk * (N + N + 1), full: N * N
  }
})

// 对照：只保留 k 个“原始列”张成的子空间（列子集投影 P_S A，秩也 ≤ k），看它是否能胜过截断 SVD
const rival = computed(() => {
  const A = img.value, kk = k.value
  if (kk === 0) return null
  const At = transpose(A)
  // 贪心选列：每次选残差最大的列，做 Gram–Schmidt
  const Q: number[][] = []
  const cols = At.map(c => c.slice())
  for (let t = 0; t < kk; t++) {
    let best = -1, bn = 0
    cols.forEach((c, j) => { const n = c.reduce((a, v) => a + v * v, 0); if (n > bn) { bn = n; best = j } })
    if (best < 0 || bn < 1e-20) break
    const q = cols[best].map(v => v / Math.sqrt(bn))
    Q.push(q)
    for (const c of cols) { const d = c.reduce((a, v, i) => a + v * q[i], 0); for (let i = 0; i < N; i++) c[i] -= d * q[i] }
  }
  const Qm = transpose(Q) // N×k
  const B = mul(Qm, mul(Q, A))
  const E = sub(A, B)
  return { e2: norm2(E), eF: fro(E) }
})

const c0 = ref<HTMLCanvasElement>(), c1 = ref<HTMLCanvasElement>(), c2 = ref<HTMLCanvasElement>()
function paint(c: HTMLCanvasElement | undefined, M: Mat, f: (v: number) => number) {
  if (!c) return
  const ctx = c.getContext('2d')
  if (!ctx) return
  const im = ctx.createImageData(N, N)
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const g = Math.round(255 * Math.min(1, Math.max(0, f(M[i][j])))), p = 4 * (i * N + j)
    im.data[p] = im.data[p + 1] = im.data[p + 2] = g; im.data[p + 3] = 255
  }
  ctx.putImageData(im, 0, 0)
}
const amp = ref(4)
function draw() {
  paint(c0.value, img.value, v => v)
  paint(c1.value, Ak.value, v => v)
  paint(c2.value, R.value, v => 0.5 + amp.value * v)
}
onMounted(() => nextTick(draw))
watch([img, Ak, amp], () => nextTick(draw))

// 奇异值谱（对数纵轴）
const SW = 640, SH = 210
const sx = computed(() => makeScale(0.5, N + 0.5, 46, SW - 10))
const lo = computed(() => Math.max(1e-4, Math.min(...s.value.filter(v => v > 0)) / 2))
const sy = computed(() => makeScale(Math.log10(lo.value), Math.log10(s.value[0] * 1.5), SH - 24, 10))
const ticks = computed(() => {
  const out: number[] = []
  for (let e = Math.ceil(Math.log10(lo.value)); e <= Math.log10(s.value[0] * 1.5); e++) out.push(e)
  return out
})
const bar = (i: number) => {
  const v = s.value[i]
  return v > 0 ? sy.value(Math.log10(v)) : SH - 24
}
</script>

<template>
  <Widget title="低秩逼近：前 k 个奇异值能留下多少？">
    <div class="ctrl">
      <div class="seg"><button v-for="t in KINDS" :key="t.id" :class="{ on: kind === t.id }" @click="kind = t.id">{{ t.name }}</button></div>
    </div>
    <div class="ctrl">
      <label>保留 k = <b>{{ k }}</b><input v-model.number="k" type="range" min="0" max="40" step="1"></label>
      <label>误差图放大 ×<b>{{ amp }}</b><input v-model.number="amp" type="range" min="1" max="16" step="1"></label>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">
      <figure style="margin:0;text-align:center">
        <canvas ref="c0" :width="N" :height="N" class="l08-img" />
        <figcaption class="widget-note" style="margin:2px 0 0">原图 A（{{ N }}×{{ N }}）</figcaption>
      </figure>
      <figure style="margin:0;text-align:center">
        <canvas ref="c1" :width="N" :height="N" class="l08-img" />
        <figcaption class="widget-note" style="margin:2px 0 0">A<sub>k</sub>（k = {{ k }}）</figcaption>
      </figure>
      <figure style="margin:0;text-align:center">
        <canvas ref="c2" :width="N" :height="N" class="l08-img" />
        <figcaption class="widget-note" style="margin:2px 0 0">误差 A − A<sub>k</sub>（灰 = 0）</figcaption>
      </figure>
    </div>
    <svg :viewBox="`0 0 ${SW} ${SH}`" style="width:100%;height:auto;margin-top:8px">
      <g v-for="e in ticks" :key="e">
        <line :x1="sx(0.5)" :x2="sx(N + 0.5)" :y1="sy(e)" :y2="sy(e)" style="stroke:var(--line)" />
        <text :x="sx(0.5) - 4" :y="sy(e) + 4" font-size="11" text-anchor="end" style="fill:var(--ink-3)">1e{{ e }}</text>
      </g>
      <rect v-for="(v, i) in s" :key="i" :x="sx(i + 1) - 2.2" :width="4.4" :y="bar(i)" :height="Math.max(0, SH - 24 - bar(i))" :style="`fill:${i < k ? 'var(--accent)' : 'var(--ink-3)'}`" />
      <line :x1="sx(k + 0.5)" :x2="sx(k + 0.5)" :y1="10" :y2="SH - 24" style="stroke:var(--warn);stroke-dasharray:4 3" />
      <text :x="sx(k + 0.5) + 4" y="22" font-size="12" style="fill:var(--warn)">截断处：σ<tspan baseline-shift="sub" font-size="9">{{ k + 1 }}</tspan> = {{ sci(stats.s2, 3) }}</text>
      <text :x="sx(N / 2)" :y="SH - 6" font-size="11" text-anchor="middle" style="fill:var(--ink-3)">奇异值序号 i（彩色为保留的前 k 个，纵轴对数）</text>
    </svg>
    <table class="mini-table" style="font-variant-numeric:tabular-nums">
      <thead><tr><th></th><th>‖A − B‖₂</th><th>‖A − B‖<sub>F</sub></th></tr></thead>
      <tbody>
        <tr class="best"><td>截断 SVD：B = A<sub>k</sub>（直接算）</td><td>{{ fix(stats.e2, 6) }}</td><td>{{ fix(stats.eF, 6) }}</td></tr>
        <tr><td>理论值：σ<sub>k+1</sub> 与 √(Σ<sub>i&gt;k</sub> σ<sub>i</sub>²)</td><td>{{ fix(stats.s2, 6) }}</td><td>{{ fix(stats.sF, 6) }}</td></tr>
        <tr v-if="rival"><td>对照：投影到 k 个原始列张成的空间</td><td>{{ fix(rival.e2, 6) }}</td><td>{{ fix(rival.eF, 6) }}</td></tr>
      </tbody>
    </table>
    <div class="stats">
      <div class="stat"><b>{{ (100 * stats.energy).toFixed(2) }}%</b><span>保留的平方能量 Σ<sub>i≤k</sub>σ<sub>i</sub>² / ‖A‖<sub>F</sub>²</span></div>
      <div class="stat"><b>{{ stats.store }}</b><span>存储 k(m+n+1) 个数</span></div>
      <div class="stat"><b>{{ stats.full }}</b><span>原图 mn 个数</span></div>
    </div>
    <p class="widget-note">“对照”一行用的是另一种也很自然的秩 ≤ k 近似（贪心挑 k 列、把 A 投影到它们张成的空间），两种范数下都不会比截断 SVD 更好——这就是 Eckart–Young–Mirsky。光滑的水波纹图奇异值按指数衰减，k ≈ 10 时肉眼已看不出差别；格纹图恰好由 4 个“行图案 × 列图案”叠加而成，k = 4 时误差降到舍入误差；白噪声的奇异值几乎不衰减，低秩逼近就不划算了。</p>
  </Widget>
</template>

<style scoped>
.l08-img { width: 100%; image-rendering: pixelated; border: 1px solid var(--line); border-radius: 6px; }
</style>
