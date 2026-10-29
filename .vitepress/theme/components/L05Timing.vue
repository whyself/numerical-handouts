<script setup lang="ts">
import { ref, computed } from 'vue'
import { fftInPlace, dftNaiveTyped } from '../lib/l05'
import { makeScale, sci } from '../lib/plot'

// 在浏览器里真实计时：直接求和 O(N²) vs 迭代版 radix-2 FFT O(N log N)
interface Row { logN: number; naive: number | null; fft: number; err: number | null }
const rows = ref<Row[]>([])
const running = ref(false)
const MAXN = 16, MAX_NAIVE = 13

// 重复运行直到累计至少 25ms，返回单次平均毫秒数
function timeIt(fn: () => void) {
  let reps = 0
  const t0 = performance.now()
  let t = t0
  do { fn(); reps++; t = performance.now() } while (t - t0 < 25)
  return (t - t0) / reps
}
const tick = () => new Promise(r => setTimeout(r, 0))

async function run() {
  if (running.value) return
  running.value = true
  rows.value = []
  for (let L = 4; L <= MAXN; L++) {
    const N = 1 << L
    const re = new Float64Array(N), im = new Float64Array(N)
    for (let j = 0; j < N; j++) re[j] = Math.sin(j * 0.37) + (j % 7) / 7
    const fr = new Float64Array(N), fi = new Float64Array(N)
    const tf = timeIt(() => { fr.set(re); fi.fill(0); fftInPlace(fr, fi) })
    let tn: number | null = null, err: number | null = null
    if (L <= MAX_NAIVE) {
      const nr = new Float64Array(N), ni = new Float64Array(N)
      tn = timeIt(() => dftNaiveTyped(re, im, nr, ni))
      err = 0
      let scale = 0
      for (let k = 0; k < N; k++) { err = Math.max(err, Math.hypot(nr[k] - fr[k], ni[k] - fi[k])); scale = Math.max(scale, Math.hypot(nr[k], ni[k])) }
      err /= scale
    }
    rows.value.push({ logN: L, naive: tn, fft: tf, err })
    await tick()
  }
  running.value = false
}

const W = 640, H = 280
const sx = makeScale(4, MAXN, 56, W - 16)
const sy = computed(() => makeScale(-4, 4, H - 30, 12))
const yOf = (ms: number) => sy.value(Math.log10(Math.max(ms, 1e-4)))
const line = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${sx(x).toFixed(1)},${yOf(y).toFixed(1)}`).join('')
const naivePts = computed(() => rows.value.filter(r => r.naive !== null).map(r => [r.logN, r.naive!] as [number, number]))
const fftPts = computed(() => rows.value.map(r => [r.logN, r.fft] as [number, number]))
const fmt = (ms: number | null) => (ms === null ? '—' : ms < 1 ? `${(ms * 1000).toFixed(1)} μs` : `${ms.toFixed(2)} ms`)
</script>

<template>
  <Widget title="计时对比：O(N²) 直接求和 vs O(N log N) FFT">
    <div class="ctrl">
      <button class="btn primary" :disabled="running" @click="run">{{ running ? '计算中…' : rows.length ? '重新计时' : '开始计时' }}</button>
      <span class="muted" style="font-size:13px">N = 2⁴ … 2¹⁶；直接求和只算到 2¹³（再大要等太久）。时间取多次运行的平均值，会受浏览器和机器影响。</span>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
      <g v-for="p in [-4, -2, 0, 2, 4]" :key="p">
        <line :x1="sx(4)" :x2="sx(MAXN)" :y1="sy(p)" :y2="sy(p)" style="stroke:var(--line-2)" />
        <text :x="sx(4) - 6" :y="sy(p) + 4" font-size="11" text-anchor="end" style="fill:var(--ink-3)">{{ p === 0 ? '1 ms' : `10${p < 0 ? '⁻' : ''}${'⁰¹²³⁴'[Math.abs(p)]} ms` }}</text>
      </g>
      <g v-for="L in [4, 6, 8, 10, 12, 14, 16]" :key="L">
        <text :x="sx(L)" :y="H - 10" font-size="11" text-anchor="middle" style="fill:var(--ink-3)">2<tspan baseline-shift="super" font-size="8">{{ L }}</tspan></text>
      </g>
      <path :d="line(naivePts)" style="fill:none;stroke:var(--warn);stroke-width:2.2" />
      <circle v-for="(p, i) in naivePts" :key="'n' + i" :cx="sx(p[0])" :cy="yOf(p[1])" r="3" style="fill:var(--warn)" />
      <path :d="line(fftPts)" style="fill:none;stroke:var(--ex);stroke-width:2.2" />
      <circle v-for="(p, i) in fftPts" :key="'f' + i" :cx="sx(p[0])" :cy="yOf(p[1])" r="3" style="fill:var(--ex)" />
      <text :x="sx(4) + 8" y="24" font-size="12" style="fill:var(--warn);font-weight:700">● 直接求和 O(N²)</text>
      <text :x="sx(4) + 8" y="42" font-size="12" style="fill:var(--ex);font-weight:700">● FFT O(N log N)</text>
      <text v-if="!rows.length" :x="W / 2" :y="H / 2" font-size="14" text-anchor="middle" style="fill:var(--ink-3)">点“开始计时”</text>
    </svg>
    <table v-if="rows.length" class="mini-table" style="font-variant-numeric:tabular-nums">
      <thead><tr><th>N</th><th>直接求和</th><th>FFT</th><th>倍数</th><th>两者结果的相对差</th></tr></thead>
      <tbody>
        <tr v-for="r in rows.filter(r => r.logN % 2 === 0 || r.logN === MAX_NAIVE)" :key="r.logN">
          <td>2<sup>{{ r.logN }}</sup> = {{ 1 << r.logN }}</td><td>{{ fmt(r.naive) }}</td><td>{{ fmt(r.fft) }}</td>
          <td>{{ r.naive === null ? '—' : `${(r.naive / r.fft).toFixed(0)}×` }}</td><td>{{ r.err === null ? '—' : sci(r.err) }}</td>
        </tr>
      </tbody>
    </table>
    <p class="widget-note">纵轴是对数刻度：N 每翻一倍，O(N²) 的时间约乘 4（每格两倍 N 上升 log₁₀4 ≈ 0.6），FFT 只约乘 2 多一点。倍数一列大致按 N/log₂N 增长。最后一列说明两种算法算的是同一个 DFT，差别只是舍入误差。</p>
  </Widget>
</template>
