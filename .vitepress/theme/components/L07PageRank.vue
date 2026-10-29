<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { pagerank, transitionMatrix } from '../lib/l07'
import { sci } from '../lib/plot'

// 随机游走 / PageRank：在列随机矩阵上做幂迭代，主特征值 λ₁ = 1，不需要归一化
const NAMES = ['A', 'B', 'C', 'D', 'E']
const POS = [[110, 60], [250, 40], [300, 160], [170, 230], [50, 190]]
const EDGES: [number, number][] = [[0, 1], [0, 2], [1, 2], [1, 3], [2, 0], [3, 2], [3, 4], [4, 3], [4, 0]]
const P = transitionMatrix(5, EDGES)
const d = ref(0.85)
const shown = ref(0)
watch(d, () => { shown.value = 0 })
const xs = computed(() => pagerank(P, d.value, 300))
const cur = computed(() => xs.value[shown.value])
const final = computed(() => xs.value[xs.value.length - 1])
const diffs = computed(() => xs.value.map((x, k) => k ? x.reduce((s, v, i) => s + Math.abs(v - xs.value[k - 1][i]), 0) : NaN))
const rows = computed(() => Array.from({ length: Math.min(shown.value + 1, 300) }, (_, k) => k).slice(-6).map(k => ({
  k, x: xs.value[k], diff: diffs.value[k], ratio: k > 1 && diffs.value[k - 1] > 1e-300 ? diffs.value[k] / diffs.value[k - 1] : NaN
})))

// 后期相邻两步差的比值 ≈ G 的第二大特征值的模 |λ₂(G)| = d·|λ₂(P)|
const lateRatio = computed(() => {
  const k = diffs.value.findIndex((v, i) => i > 2 && v < 1e-11)
  const j = k > 4 ? k - 2 : 60
  return diffs.value[j] / diffs.value[j - 1]
})

const R = (v: number) => 12 + 70 * Math.sqrt(v)
function edgePath(i: number, j: number) {
  const [x1, y1] = POS[i], [x2, y2] = POS[j]
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L
  // 往右侧弯一点，双向边就不会重叠
  const mx = (x1 + x2) / 2 - uy * 18, my = (y1 + y2) / 2 + ux * 18
  const ri = R(cur.value[i]) + 2, rj = R(cur.value[j]) + 4
  const sx = x1 + ux * ri - uy * 6, sy = y1 + uy * ri + ux * 6
  const ex = x2 - ux * rj - uy * 6, ey = y2 - uy * rj + ux * 6
  const tx = ex - mx, ty = ey - my, tl = Math.hypot(tx, ty), ax = tx / tl, ay = ty / tl
  return { d: `M${sx},${sy}Q${mx},${my} ${ex},${ey}`, head: `M${ex - 8 * ax + 4 * ay},${ey - 8 * ay - 4 * ax}L${ex},${ey}L${ex - 8 * ax - 4 * ay},${ey - 8 * ay + 4 * ax}` }
}
let timer: ReturnType<typeof setInterval> | undefined
function play() {
  clearInterval(timer); shown.value = 0
  timer = setInterval(() => { if (shown.value >= 40) clearInterval(timer); else shown.value++ }, 300)
}
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <Widget title="补充：随机游走的平稳分布（PageRank）也是幂迭代">
    <div class="ctrl">
      <label>阻尼系数 d = <b>{{ d.toFixed(2) }}</b><input v-model.number="d" type="range" min="0" max="1" step="0.01"></label>
      <button class="btn" @click="shown = Math.max(0, shown - 1)">◂</button>
      <button class="btn primary" @click="shown = Math.min(shown + 1, 300)">走一步 ▸</button>
      <button class="btn" @click="play">▶ 自动播放</button>
      <button class="btn" @click="shown = 0">⟲</button>
    </div>
    <div class="two-col" style="display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,0.7fr);gap:14px;align-items:center">
      <svg viewBox="0 0 360 280" style="width:100%;height:auto">
        <g v-for="([i, j], e) in EDGES" :key="e">
          <path :d="edgePath(i, j).d" style="fill:none;stroke:var(--ink-3);stroke-width:1.4" />
          <path :d="edgePath(i, j).head" style="fill:none;stroke:var(--ink-3);stroke-width:1.4" />
        </g>
        <g v-for="(p, i) in POS" :key="i">
          <circle :cx="p[0]" :cy="p[1]" :r="R(cur[i])" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2" />
          <text :x="p[0]" :y="p[1] - 1" font-size="14" text-anchor="middle" style="fill:var(--ink);font-weight:700">{{ NAMES[i] }}</text>
          <text :x="p[0]" :y="p[1] + 14" font-size="11" text-anchor="middle" style="fill:var(--ink-2)">{{ cur[i].toFixed(3) }}</text>
        </g>
      </svg>
      <div>
        <div class="stats">
          <div class="stat"><b>{{ final.map(v => v.toFixed(3)).join(' ') }}</b><span>平稳分布（迭代 300 步）</span></div>
          <div class="stat"><b>{{ Number.isFinite(lateRatio) ? lateRatio.toFixed(3) : '—' }}</b><span>后期收缩比 ≈ |λ₂(G)|</span></div>
        </div>
      </div>
    </div>
    <div style="overflow-x:auto">
        <table class="mini-table" style="font-variant-numeric:tabular-nums">
        <thead><tr><th>k</th><th v-for="n in NAMES" :key="n">{{ n }}</th><th>‖x<sub>k</sub> − x<sub>k−1</sub>‖₁</th><th>比值</th></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.k" :class="{ best: r.k === shown }">
            <td>{{ r.k }}</td><td v-for="(v, i) in r.x" :key="i">{{ v.toFixed(3) }}</td>
            <td>{{ Number.isNaN(r.diff) ? '—' : sci(r.diff) }}</td><td>{{ Number.isNaN(r.ratio) ? '—' : r.ratio.toFixed(3) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="widget-note">x<sub>k</sub> 是“随机冲浪者”第 k 步位于各网页的概率：以概率 d 沿出边随机走一步，以概率 1 − d 随机跳到任意一页。迭代矩阵 G = dP + (1 − d)/n · 𝟙𝟙ᵀ 的每一列和为 1，所以 λ₁ = 1、各分量之和始终是 1，不需要归一化（对应课件 P26 “λ₁ = 1 时 A<sup>k</sup>x → α₁v₁”）。收缩比 |λ₂(G)| = d·|λ₂(P)| ≤ d（这张图里 |λ₂(P)| ≈ 0.809，d = 0.85 时约 0.688）：d 越接近 1，越接近“纯”随机游走，收敛越慢。</p>
  </Widget>
</template>
