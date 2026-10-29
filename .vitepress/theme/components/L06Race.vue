<script setup lang="ts">
import { ref, computed } from 'vue'
import { tridiagRun, rhoJacobiTridiag } from '../lib/l06'
import { makeScale, sci } from '../lib/plot'

// n×n 三对角方程组 tridiag(−1, d, −1) x = b：误差曲线的斜率由迭代矩阵的谱半径决定
const n = ref(20)
const d = ref(2.5)
const K = 200
const runJ = computed(() => tridiagRun(n.value, d.value, 'jacobi', K))
const runG = computed(() => tridiagRun(n.value, d.value, 'gs', K))
const rhoJ = computed(() => rhoJacobiTridiag(n.value, d.value))
const rhoG = computed(() => rhoJ.value ** 2)
const sdd = computed(() => d.value > 2)
// 实测的渐近收敛因子：最后 20 步误差的几何平均比值
function observed(es: number[]) {
  let j = es.length - 1
  while (j > 20 && es[j] < 1e-14) j--
  if (j < 21) return NaN
  return (es[j] / es[j - 20]) ** (1 / 20)
}
const obsJ = computed(() => observed(runJ.value))
const obsG = computed(() => observed(runG.value))
const steps = (es: number[]) => { const i = es.findIndex(e => e <= 1e-10); return i < 0 ? `> ${es.length - 1}` : String(i) }

const W = 640, H = 300
const LO = -16, HI = 2
const sx = makeScale(0, K, 46, W - 14)
const sy = makeScale(HI, LO, 12, H - 28)
const yOf = (e: number) => sy(Math.min(HI, Math.max(LO, Math.log10(Math.max(e, 1e-300)))))
const line = (es: number[]) => es.map((e, k) => `${k ? 'L' : 'M'}${sx(k).toFixed(1)},${yOf(e).toFixed(1)}`).join('')
const ref_ = (rho: number) => Array.from({ length: K + 1 }, (_, k) => `${k ? 'L' : 'M'}${sx(k).toFixed(1)},${yOf(rho ** k).toFixed(1)}`).join('')
</script>

<template>
  <Widget title="误差曲线：Jacobi 与 Gauss-Seidel 赛跑">
    <div class="ctrl">
      <label>维数 n = <b>{{ n }}</b><input v-model.number="n" type="range" min="3" max="60" step="1"></label>
      <label>对角元 d = <b>{{ d.toFixed(2) }}</b><input v-model.number="d" type="range" min="1.5" max="4" step="0.05"></label>
    </div>
    <p class="widget-note" style="margin-bottom:4px">方程组 A x = b，A 的对角元为 d、紧邻对角线的元素为 −1，取 b 使真解为全 1 向量，初值 x₀ = 0。
      严格对角占优（d &gt; 2）：<b :class="sdd ? 'ok-c' : 'bad-c'">{{ sdd ? '是' : '否' }}</b></p>
    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
      <g v-for="p in [0, -4, -8, -12, -16]" :key="p">
        <line :x1="sx(0)" :x2="sx(K)" :y1="sy(p)" :y2="sy(p)" style="stroke:var(--line-2)" />
        <text :x="sx(0) - 6" :y="sy(p) + 4" font-size="11" text-anchor="end" style="fill:var(--ink-3)">1e{{ p }}</text>
      </g>
      <g v-for="k in [0, 50, 100, 150, 200]" :key="k">
        <text :x="sx(k)" :y="H - 10" font-size="11" text-anchor="middle" style="fill:var(--ink-3)">{{ k }}</text>
      </g>
      <path :d="ref_(rhoJ)" style="fill:none;stroke:var(--prin);stroke-width:1" stroke-dasharray="4 4" />
      <path :d="ref_(rhoG)" style="fill:none;stroke:var(--accent);stroke-width:1" stroke-dasharray="4 4" />
      <path :d="line(runJ)" style="fill:none;stroke:var(--prin);stroke-width:2.2" />
      <path :d="line(runG)" style="fill:none;stroke:var(--accent);stroke-width:2.2" />
      <text :x="W - 16" y="24" font-size="12" text-anchor="end" style="fill:var(--prin)">Jacobi（虚线 ρ<tspan font-size="9" dy="4">J</tspan><tspan dy="-4">ᵏ</tspan>）</text>
      <text :x="W - 16" y="42" font-size="12" text-anchor="end" style="fill:var(--accent)">Gauss-Seidel（虚线 ρ<tspan font-size="9" dy="4">GS</tspan><tspan dy="-4">ᵏ</tspan>）</text>
    </svg>
    <table class="mini-table" style="font-variant-numeric:tabular-nums">
      <thead><tr><th>方法</th><th>谱半径 ρ（理论）</th><th>实测每步误差缩小因子</th><th>误差 ≤ 10⁻¹⁰ 的步数</th><th>第 {{ K }} 步误差</th></tr></thead>
      <tbody>
        <tr><td><span style="color:var(--prin);font-weight:700">●</span> Jacobi</td><td>{{ rhoJ.toFixed(4) }}</td><td>{{ Number.isNaN(obsJ) ? '—' : obsJ.toFixed(4) }}</td><td>{{ steps(runJ) }}</td><td>{{ sci(runJ[runJ.length - 1]) }}</td></tr>
        <tr><td><span style="color:var(--accent);font-weight:700">●</span> Gauss-Seidel</td><td>{{ rhoG.toFixed(4) }}</td><td>{{ Number.isNaN(obsG) ? '—' : obsG.toFixed(4) }}</td><td>{{ steps(runG) }}</td><td>{{ sci(runG[runG.length - 1]) }}</td></tr>
      </tbody>
    </table>
    <p class="widget-note">这个矩阵的 Jacobi 迭代矩阵特征值是 (2/d)·cos(jπ/(n+1))，谱半径 ρ<sub>J</sub> = (2/d)cos(π/(n+1))；对这类三对角矩阵还有 ρ<sub>GS</sub> = ρ<sub>J</sub>²（补充说明，Young 的经典结果），所以 Gauss-Seidel 达到同样精度大约只要一半步数。把 d 调到 2：不再严格对角占优，但 ρ<sub>J</sub> = cos(π/(n+1)) &lt; 1 仍然收敛，只是 n 越大越慢——严格对角占优是充分条件，不是必要条件。d &lt; 2 时 ρ 可能超过 1，迭代发散。</p>
  </Widget>
</template>
