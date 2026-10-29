<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { root, cstr, cadd, cx, type C } from '../lib/l05'

// 单位根的两个性质：① 平方后成对合并、规模减半；② Σ ω^{kr} 在 N∤r 时首尾相接、精确抵消
const mode = ref<'sq' | 'sum'>('sq')
const N = ref(8)
const sel = ref(1)
const r = ref(1)
watch(N, n => { sel.value = Math.min(sel.value, n - 1); r.value = Math.min(r.value, n) })

const W = 640, H = 316, R = 110
const L0 = { x: 160, y: 166 }, R0 = { x: 480, y: 166 }
const P = (c: { x: number; y: number }, z: C, rad = R) => ({ x: c.x + rad * z.re, y: c.y - rad * z.im })

const roots = computed(() => Array.from({ length: N.value }, (_, k) => ({ k, z: root(N.value, k) })))
const even = computed(() => N.value % 2 === 0)
const partner = computed(() => (even.value ? (sel.value + N.value / 2) % N.value : -1))
// 平方后的点集：N 偶数时是 N/2 次单位根，N 奇数时仍是全部 N 次单位根（只是换了顺序）
const squares = computed(() => {
  const M = even.value ? N.value / 2 : N.value
  return Array.from({ length: M }, (_, k) => ({ k, z: root(M, k) }))
})
const selSq = computed(() => (even.value ? sel.value % (N.value / 2) : (2 * sel.value) % N.value))

// 求和：部分和折线
const chain = computed(() => {
  const pts: C[] = [cx(0)]
  let s = cx(0)
  for (let k = 0; k < N.value; k++) { s = cadd(s, root(N.value, k * r.value)); pts.push(s) }
  return pts
})
// 按折线的包围盒自动缩放，放在右半边居中
const box = computed(() => {
  const xs = chain.value.map(z => z.re), ys = chain.value.map(z => z.im)
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
})
const unit = computed(() => Math.min(240 / Math.max(box.value.x1 - box.value.x0, 1e-9), 220 / Math.max(box.value.y1 - box.value.y0, 1e-9), 150))
const C0 = computed(() => ({
  x: R0.x - unit.value * (box.value.x0 + box.value.x1) / 2,
  y: 172 + unit.value * (box.value.y0 + box.value.y1) / 2
}))
const chainPts = computed(() => chain.value.map(z => ({ x: C0.value.x + unit.value * z.re, y: C0.value.y - unit.value * z.im })))
const S = computed(() => chain.value[chain.value.length - 1])
const visited = computed(() => new Set(Array.from({ length: N.value }, (_, k) => (k * r.value) % N.value)))
</script>

<template>
  <Widget title="单位根：平方折半，求和抵消">
    <div class="ctrl">
      <div class="seg">
        <button :class="{ on: mode === 'sq' }" @click="mode = 'sq'">性质 2：平方 / 成对</button>
        <button :class="{ on: mode === 'sum' }" @click="mode = 'sum'">性质 1：几何级数抵消</button>
      </div>
      <label>N = <b>{{ N }}</b><input v-model.number="N" type="range" min="2" max="16" step="1"></label>
    </div>
    <div v-if="mode === 'sq'" class="ctrl">
      <label>选一个根 ω<sub>N</sub><sup>{{ sel }}</sup>：<input v-model.number="sel" type="range" min="0" :max="N - 1" step="1"></label>
      <span class="muted" style="font-size:13px">也可以直接点左图上的点</span>
    </div>
    <div v-else class="ctrl">
      <label>r = <b>{{ r }}</b><input v-model.number="r" type="range" min="0" :max="N" step="1"></label>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
      <!-- 左：N 次单位根 -->
      <line :x1="L0.x - R - 18" :x2="L0.x + R + 18" :y1="L0.y" :y2="L0.y" style="stroke:var(--line)" />
      <line :x1="L0.x" :x2="L0.x" :y1="L0.y - R - 18" :y2="L0.y + R + 18" style="stroke:var(--line)" />
      <circle :cx="L0.x" :cy="L0.y" :r="R" style="fill:none;stroke:var(--ink-3);stroke-width:1.2" />
      <text :x="L0.x" y="16" font-size="13" text-anchor="middle" style="fill:var(--ink-2);font-weight:700">{{ N }} 次单位根 ω<tspan baseline-shift="sub" font-size="9">{{ N }}</tspan><tspan baseline-shift="super" font-size="9">k</tspan></text>
      <g v-for="p in roots" :key="p.k" style="cursor:pointer" @click="sel = p.k">
        <circle :cx="P(L0, p.z).x" :cy="P(L0, p.z).y" r="7"
          :style="{ fill: mode === 'sq' ? (p.k === sel ? 'var(--accent)' : p.k === partner ? 'var(--warn)' : 'var(--ink-3)') : (visited.has(p.k) ? 'var(--accent)' : 'var(--line)') }" />
        <text :x="P(L0, p.z, R + 20).x" :y="P(L0, p.z, R + 20).y + 4" font-size="11" text-anchor="middle" style="fill:var(--ink-2)">{{ p.k }}</text>
      </g>

      <!-- 右：平方后的点 -->
      <template v-if="mode === 'sq'">
        <line :x1="R0.x - R - 18" :x2="R0.x + R + 18" :y1="R0.y" :y2="R0.y" style="stroke:var(--line)" />
        <line :x1="R0.x" :x2="R0.x" :y1="R0.y - R - 18" :y2="R0.y + R + 18" style="stroke:var(--line)" />
        <circle :cx="R0.x" :cy="R0.y" :r="R" style="fill:none;stroke:var(--ink-3);stroke-width:1.2" />
        <text :x="R0.x" y="16" font-size="13" text-anchor="middle" style="fill:var(--ink-2);font-weight:700">平方 z ↦ z²：{{ squares.length }} 个点</text>
        <g v-for="p in squares" :key="p.k">
          <circle :cx="P(R0, p.z).x" :cy="P(R0, p.z).y" r="7" :style="{ fill: p.k === selSq ? 'var(--accent)' : 'var(--ink-3)' }" />
          <text :x="P(R0, p.z, R + 20).x" :y="P(R0, p.z, R + 20).y + 4" font-size="11" text-anchor="middle" style="fill:var(--ink-2)">{{ p.k }}</text>
        </g>
        <text x="320" :y="L0.y + 4" font-size="22" text-anchor="middle" style="fill:var(--ink-3)">⟶</text>
      </template>

      <!-- 右：部分和折线 -->
      <template v-else>
        <text :x="R0.x" y="16" font-size="13" text-anchor="middle" style="fill:var(--ink-2);font-weight:700">部分和 Σ ω<tspan baseline-shift="super" font-size="9">kr</tspan>，k = 0, …, N−1</text>
        <polyline :points="chainPts.map(p => `${p.x},${p.y}`).join(' ')" style="fill:none;stroke:var(--accent);stroke-width:2" />
        <circle v-for="(p, i) in chainPts" :key="i" :cx="p.x" :cy="p.y" r="2.6" style="fill:var(--accent)" />
        <circle :cx="C0.x" :cy="C0.y" r="5" style="fill:none;stroke:var(--ink);stroke-width:1.5" />
        <circle :cx="chainPts[chainPts.length - 1].x" :cy="chainPts[chainPts.length - 1].y" r="5" style="fill:var(--warn)" />
        <text :x="C0.x - 8" :y="C0.y + 18" font-size="11" style="fill:var(--ink-3)">起点 0</text>
      </template>
    </svg>

    <div v-if="mode === 'sq'" class="out prose">
      <template v-if="even">
        ω<sub>{{ N }}</sub><sup>{{ sel }}</sup> = {{ cstr(root(N, sel)) }}，它的相反数 −ω<sub>{{ N }}</sub><sup>{{ sel }}</sup> = ω<sub>{{ N }}</sub><sup>{{ partner }}</sup>（橙色）。二者平方都等于
        ω<sub>{{ N / 2 }}</sub><sup>{{ selSq }}</sup> = {{ cstr(root(N / 2, selSq)) }}。{{ N }} 个点两两合并，只剩 {{ N / 2 }} 个——这正是 FFT 能“规模减半”的原因。
      </template>
      <template v-else>
        N = {{ N }} 是奇数：−z 不在根集里，平方只是把 {{ N }} 个根重新排列（ω<sup>{{ sel }}</sup> ↦ ω<sup>{{ selSq }}</sup>），点数没有减少。radix-2 FFT 的“减半”要求 N 为偶数。
      </template>
    </div>
    <div v-else class="stats">
      <div class="stat"><b>{{ cstr(S, 6) }}</b><span>S<sub>r</sub> = Σ ω<sub>N</sub><sup>kr</sup></span></div>
      <div class="stat"><b :class="r % N === 0 ? 'ok-c' : ''">{{ r % N === 0 ? `N | r ⇒ S = ${N}` : 'N ∤ r ⇒ S = 0' }}</b><span>单位根求和公式（P14）</span></div>
      <div class="stat"><b>{{ visited.size }}</b><span>序列 ω<sup>kr</sup> 实际经过的不同根</span></div>
    </div>
    <p v-if="mode === 'sum'" class="widget-note">N ∤ r 时，N 个单位向量 ω<sup>0</sup>, ω<sup>r</sup>, ω<sup>2r</sup>, … 首尾相接恰好围成闭合的（星形）多边形，终点回到起点；N | r 时每一项都是 1，折线是一条长 N 的直线。取 N = 8，比较 r = 1、2、4：记 d = gcd(r, N)，序列只经过 N/d 个不同的根，折线是一个正 N/d 边形绕了 d 圈（N/d = 2 时退化成来回走的线段）；只要 r 不是 N 的倍数，终点就回到 0。</p>
  </Widget>
</template>
