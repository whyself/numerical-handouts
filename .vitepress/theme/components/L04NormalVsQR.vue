<script setup lang="ts">
import { ref, computed } from 'vue'
import { makeScale, sci } from '../lib/plot'
import { lsqNormal, lsqHouseholder, lsqMGS, cond2, vandermonde, linspace, matvec, norm2, sub, transpose, matmul, type Mat } from '../lib/l04'

// 法线方程 vs QR：真解已知（x* = 全 1，b = A x* 精确相容），比较算出来的系数误差
const mode = ref<'poly' | 'eps'>('poly')
const U = 2 ** -53
const NS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
const xs = linspace(0, 1, 30)
const relErr = (x: number[] | null, xt: number[]) => x ? norm2(sub(x, xt)) / norm2(xt) : NaN
const data = computed(() => NS.map(n => {
  const A = vandermonde(xs, n), xt = new Array(n).fill(1), b = matvec(A, xt)
  return { n, k: cond2(A), ne: relErr(lsqNormal(A, b), xt), mgs: relErr(lsqMGS(A, b), xt), hh: relErr(lsqHouseholder(A, b), xt) }
}))
const SER = [
  { key: 'ne', name: '法线方程 + Cholesky', color: 'var(--warn)' },
  { key: 'mgs', name: 'MGS（b 作为增广列）', color: 'var(--accent)' },
  { key: 'hh', name: 'Householder QR', color: 'var(--ex)' }
] as const
const W = 620, H = 300
const sx = makeScale(2, 16, 50, W - 16)
const sy = makeScale(1, -17, 14, H - 30)
const ly = (v: number) => sy(Math.max(-17, Math.min(1, Math.log10(Math.max(v, 1e-17)))))
const pathOfSeries = (vals: number[]) => {
  let d = '', pen = false
  vals.forEach((v, i) => {
    if (!Number.isFinite(v)) { pen = false; return }
    d += `${pen ? 'L' : 'M'}${sx(NS[i]).toFixed(1)},${ly(v).toFixed(1)}`; pen = true
  })
  return d
}
const sel = ref(8)
const row = computed(() => data.value[sel.value])

// P15 的例子换成两列几乎平行的 Läuchli 形式：A = [1 1; ε 0; 0 ε]
const le = ref(-6)
const lauch = computed(() => {
  const e = 10 ** le.value
  const A: Mat = [[1, 1], [e, 0], [0, e]], xt = [0.3, 0.7], b = matvec(A, xt)
  const G = matmul(transpose(A), A)
  return {
    e, k: cond2(A), g11: G[0][0], lost: G[0][0] === 1,
    ne: lsqNormal(A, b), hh: lsqHouseholder(A, b),
    neErr: relErr(lsqNormal(A, b), xt), hhErr: relErr(lsqHouseholder(A, b), xt)
  }
})
const f = (v: number) => Number.isFinite(v) ? v.toPrecision(12) : String(v)
</script>

<template>
  <Widget title="法线方程 vs QR：同一个最小二乘问题，精度差多少">
    <div class="ctrl">
      <div class="seg">
        <button :class="{ on: mode === 'poly' }" @click="mode = 'poly'">多项式拟合（单项式基）</button>
        <button :class="{ on: mode === 'eps' }" @click="mode = 'eps'">两列几乎平行</button>
      </div>
    </div>
    <template v-if="mode === 'poly'">
      <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
        <g v-for="p in [0, -4, -8, -12, -16]" :key="p">
          <line :x1="sx(2)" :x2="sx(16)" :y1="sy(p)" :y2="sy(p)" style="stroke:var(--line-2)" />
          <text :x="44" :y="sy(p) + 4" font-size="11" text-anchor="end" style="fill:var(--ink-3)">1e{{ p }}</text>
        </g>
        <g v-for="(d, i) in data" :key="d.n" style="cursor:pointer" @click="sel = i">
          <text :x="sx(d.n)" :y="H - 12" font-size="11" text-anchor="middle" :style="{ fill: i === sel ? 'var(--accent)' : 'var(--ink-3)', fontWeight: i === sel ? 700 : 400 }">{{ d.n }}</text>
          <rect :x="sx(d.n) - 10" :y="10" width="20" :height="H - 40" style="fill:transparent" />
        </g>
        <line :x1="sx(row.n)" :x2="sx(row.n)" :y1="12" :y2="H - 28" style="stroke:var(--accent);opacity:.3;stroke-width:6" />
        <path :d="pathOfSeries(data.map(d => d.k * U))" style="fill:none;stroke:var(--ink-3)" stroke-dasharray="5 4" />
        <path :d="pathOfSeries(data.map(d => d.k * d.k * U))" style="fill:none;stroke:var(--ink-3)" stroke-dasharray="1 4" />
        <g v-for="s in SER" :key="s.key">
          <path :d="pathOfSeries(data.map(d => d[s.key]))" :style="{ fill: 'none', stroke: s.color, strokeWidth: 2.4 }" />
          <template v-for="(d, i) in data" :key="d.n">
            <circle v-if="Number.isFinite(d[s.key])" :cx="sx(d.n)" :cy="ly(d[s.key])" r="3" :style="{ fill: s.color }" />
            <text v-else :x="sx(d.n)" :y="sy(0) - 6" font-size="13" text-anchor="middle" :style="{ fill: s.color, fontWeight: 700 }">×</text>
          </template>
        </g>
        <text :x="W - 16" :y="H - 12" font-size="11" text-anchor="end" style="fill:var(--ink-3)" dy="-14">未知系数个数 n（点击选择）</text>
      </svg>
      <p class="widget-note" style="margin-bottom:6px">
        <span v-for="s in SER" :key="s.key" style="margin-right:14px"><span :style="{ color: s.color, fontWeight: 700 }">●</span> {{ s.name }}</span>
        <span style="margin-right:14px">- - κ(A)·u</span><span>· · · κ(A)²·u</span>
      </p>
      <table class="mini-table" style="font-variant-numeric:tabular-nums">
        <thead><tr><th>n = {{ row.n }}</th><th>κ₂(A)</th><th>κ₂(AᵀA) = κ₂(A)²</th><th>法线方程</th><th>MGS</th><th>Householder</th></tr></thead>
        <tbody><tr><td>‖x̂ − x*‖ / ‖x*‖</td><td>{{ sci(row.k) }}</td><td>{{ sci(row.k * row.k) }}</td><td>{{ Number.isFinite(row.ne) ? sci(row.ne) : 'Cholesky 失败' }}</td><td>{{ sci(row.mgs) }}</td><td>{{ sci(row.hh) }}</td></tr></tbody>
      </table>
      <p class="widget-note">A 是 30 个等距点上的 30 × n Vandermonde 矩阵，b = A·(1, …, 1)ᵀ 精确相容。法线方程的误差随 κ² 增长（两条虚线是最坏情形的量级，实际误差在它们下方），n = 12 时只剩一两位有效数字，n ≥ 13 时 AᵀA 在浮点意义下不再正定，Cholesky 直接失败（×）；两种 QR 的误差只随 κ 增长，同样的 n 下还有 8–9 位有效数字。注意 QR 也挡不住 κ(A) 本身的增长——那是问题的敏感性。</p>
    </template>
    <template v-else>
      <div class="ctrl">
        <label>ε = <b>{{ sci(lauch.e, 0) }}</b><input v-model.number="le" type="range" min="-12" max="-1" step="1"></label>
      </div>
      <div class="out prose">A = [1 1; ε 0; 0 ε]，b = A·(0.3, 0.7)ᵀ = (1, 0.3ε, 0.7ε)ᵀ（相容），真解 x* = (0.3, 0.7)。AᵀA = [1+ε² 1; 1 1+ε²]，浮点中算得 1 + ε² = <b :class="lauch.lost ? 'bad-c' : ''">{{ f(lauch.g11) }}</b>{{ lauch.lost ? '——ε² 已低于舍入单位，AᵀA 变成奇异的全 1 矩阵，信息在形成 AᵀA 的那一刻就丢了' : '' }}。</div>
      <div class="stats">
        <div class="stat"><b>{{ sci(lauch.k) }}</b><span>κ₂(A) ≈ √2/ε</span></div>
        <div class="stat"><b :class="!(lauch.neErr < 1e-3) ? 'bad-c' : ''">{{ lauch.ne ? sci(lauch.neErr) : 'Cholesky 失败' }}</b><span>法线方程的相对误差</span></div>
        <div class="stat"><b class="ok-c">{{ sci(lauch.hhErr) }}</b><span>Householder QR 的相对误差</span></div>
      </div>
      <p class="widget-note">ε 从 10⁻¹ 往小拖：法线方程的误差大约按 u/ε² 增长，ε ≈ 10⁻⁸ 时 1 + ε² 在双精度里就等于 1；QR 的误差上界只按 u/ε 增长（这个例子里 b 恰好相容，实际误差一直停在 10⁻¹⁶ 附近），因为它从不形成 ε²。这就是 P15 “ε 方向变成 ε²”在浮点里的后果。</p>
    </template>
  </Widget>
</template>
