<script setup lang="ts">
import { ref, computed } from 'vue'
import { makeScale, pathOf, sci } from '../lib/plot'
import { fourierCoeffs, fourierEval, chebCoeffs, chebEval, simpson } from '../lib/l04'

// 函数空间里的正交投影：傅里叶（[−π, π]，权 1）与 Chebyshev（[−1, 1]，权 1/√(1−x²)）
type F = (x: number) => number
const basis = ref<'fourier' | 'cheb'>('fourier')
const FOURIER: { name: string; f: F }[] = [
  { name: '锯齿 f(x) = x', f: x => x },
  { name: '方波 sign(x)', f: x => Math.sign(x) },
  { name: '|x|', f: x => Math.abs(x) },
  { name: 'e^{x/2}', f: x => Math.exp(x / 2) }
]
const CHEB: { name: string; f: F }[] = [
  { name: '|x|', f: x => Math.abs(x) },
  { name: '阶跃 sign(x)', f: x => Math.sign(x) },
  { name: 'eˣ', f: x => Math.exp(x) },
  { name: '1/(1 + 25x²)', f: x => 1 / (1 + 25 * x * x) }
]
const fi = ref(0)
const n = ref(3)
const list = computed(() => basis.value === 'fourier' ? FOURIER : CHEB)
const fn = computed(() => list.value[Math.min(fi.value, list.value.length - 1)].f)
const lo = computed(() => basis.value === 'fourier' ? -Math.PI : -1)
const hi = computed(() => -lo.value)

const NMAX = 15
const coef = computed(() => basis.value === 'fourier' ? fourierCoeffs(fn.value, NMAX) : { c: chebCoeffs(fn.value, NMAX) })
const approx = (k: number): F => {
  const c = coef.value as any
  if (basis.value === 'fourier') { const a = c.a.slice(0, k + 1), b = c.b.slice(0, k + 1); return x => fourierEval(a, b, x) }
  const cc = c.c.slice(0, k + 1); return x => chebEval(cc, x)
}
// 加权 L² 误差的平方：直接积分，与“‖f‖² − Σ 投影系数²·‖φ‖²”核对
const err2 = (k: number) => {
  const g = approx(k)
  if (basis.value === 'fourier') return simpson(x => (fn.value(x) - g(x)) ** 2, -Math.PI, Math.PI, 4000)
  return simpson(t => (fn.value(Math.cos(t)) - g(Math.cos(t))) ** 2, 0, Math.PI, 4000)
}
const errs = computed(() => Array.from({ length: NMAX + 1 }, (_, k) => err2(k)))
// 投影系数表：显示前几项
const table = computed(() => {
  const c = coef.value as any
  return Array.from({ length: Math.min(n.value, 7) + 1 }, (_, k) => basis.value === 'fourier'
    ? { k, a: c.a[k], b: k ? c.b[k] : NaN }
    : { k, a: c.c[k], b: NaN })
})

const W = 600, H = 260
const sx = computed(() => makeScale(lo.value, hi.value, 30, W - 12))
const yr = computed(() => {
  const vs = Array.from({ length: 201 }, (_, i) => fn.value(lo.value + (hi.value - lo.value) * i / 200))
  const a = Math.min(...vs), b = Math.max(...vs), pad = 0.25 * (b - a || 1)
  return [a - pad, b + pad] as [number, number]
})
const sy = computed(() => makeScale(yr.value[0], yr.value[1], H - 14, 12))
const ex = makeScale(0, NMAX, 40, W - 12)
const ey = (v: number) => 100 - 84 * (Math.log10(Math.max(v, 1e-12)) + 12) / 13
const fmt = (v: number) => Number.isNaN(v) ? '—' : Math.abs(v) < 1e-10 ? '0' : v.toFixed(5)
</script>

<template>
  <Widget title="函数空间里的投影：傅里叶与 Chebyshev 部分和">
    <div class="ctrl">
      <div class="seg">
        <button :class="{ on: basis === 'fourier' }" @click="basis = 'fourier'; fi = 0">傅里叶 [−π, π]</button>
        <button :class="{ on: basis === 'cheb' }" @click="basis = 'cheb'; fi = 0">Chebyshev [−1, 1]，权 1/√(1−x²)</button>
      </div>
      <select v-model.number="fi"><option v-for="(c, i) in list" :key="i" :value="i">{{ c.name }}</option></select>
    </div>
    <div class="ctrl">
      <label>{{ basis === 'fourier' ? '最高频率' : '最高次数' }} n = <b>{{ n }}</b><input v-model.number="n" type="range" min="0" :max="NMAX" step="1"></label>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
      <line :x1="sx(lo)" :x2="sx(hi)" :y1="sy(0)" :y2="sy(0)" style="stroke:var(--line)" />
      <path :d="pathOf(fn, lo, hi, sx, sy, yr, 600)" style="fill:none;stroke:var(--ink-3);stroke-width:2" />
      <path :d="pathOf(approx(n), lo, hi, sx, sy, yr, 600)" style="fill:none;stroke:var(--accent);stroke-width:2.4" />
    </svg>
    <p class="widget-note" style="margin:0 0 6px"><span style="color:var(--ink-3);font-weight:700">—</span> f　<span style="color:var(--accent);font-weight:700">—</span> 投影（部分和）</p>
    <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start">
      <table class="mini-table" style="width:auto;font-variant-numeric:tabular-nums">
        <thead v-if="basis === 'fourier'"><tr><th>k</th><th>aₖ = ⟨f, cos kx⟩/π</th><th>bₖ = ⟨f, sin kx⟩/π</th></tr></thead>
        <thead v-else><tr><th>k</th><th>cₖ = ⟨f, Tₖ⟩_w / ⟨Tₖ, Tₖ⟩_w</th></tr></thead>
        <tbody><tr v-for="r in table" :key="r.k"><td>{{ r.k }}</td><td>{{ fmt(r.a) }}</td><td v-if="basis === 'fourier'">{{ fmt(r.b) }}</td></tr></tbody>
      </table>
      <div style="flex:1;min-width:260px">
        <div class="widget-note" style="margin:0">误差平方 ‖f − 部分和‖² 随 n 的变化（对数纵轴）</div>
        <svg :viewBox="`0 0 ${W} 112`" style="width:100%;height:auto">
          <line v-for="(e, k) in errs" :key="k" :x1="ex(k)" :x2="ex(k)" :y1="100" :y2="ey(e)" :style="{ stroke: k === n ? 'var(--accent)' : 'var(--line)', strokeWidth: 10 }" />
          <text v-for="k in [0, 5, 10, 15]" :key="'t' + k" :x="ex(k)" y="111" font-size="10" text-anchor="middle" style="fill:var(--ink-3)">{{ k }}</text>
        </svg>
        <div class="stats" style="margin:0"><div class="stat"><b>{{ sci(errs[n], 3) }}</b><span>当前 n 的误差平方</span></div></div>
      </div>
    </div>
    <p class="widget-note">系数一个一个独立地读出来（正交性让它们解耦）；加一项不会改变前面的系数，误差平方只会单调不增。锯齿 f(x) = x 的 bₖ 应为 2(−1)ᵏ⁺¹/k（2, −1, 0.667, −0.5, …），可以核对。方波在跳跃处的过冲不会随 n 消失（Gibbs 现象），但它的 L² 误差仍然趋于 0——L² 投影只保证“平方平均意义下”最好，不保证逐点最好。</p>
  </Widget>
</template>
