<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { chebT, chebExtrema, supNorm } from '../lib/l03'
import { makeScale, pathOf, sci } from '../lib/plot'

// 极小极大定理的“证书”：p = T̂_n + q（deg q < n），q 不可能在 n+1 个交替极值点上都与 T̂_n 反号
const n = ref(5)
const cs = ref<number[]>([0, 0, 0, 0, 0]) // q = a·Σ c_k T_k，k = 0..n−1，a = 2^{1−n}
watch(n, v => { cs.value = new Array(v).fill(0) })
const a = computed(() => 2 ** (1 - n.value))
const That = (x: number) => a.value * chebT(n.value, x)
const q = (x: number) => a.value * cs.value.reduce((s, c, k) => s + c * chebT(k, x), 0)
const p = (x: number) => That(x) + q(x)
const sup = computed(() => supNorm(p, -1, 1, 4000))
const ys = computed(() => chebExtrema(n.value))
// 证人点：q(y_k) 与 T̂_n(y_k) 同号或为 0，于是 |p(y_k)| ≥ a
const pts = computed(() => ys.value.map((y, k) => {
  const t = That(y), r = q(y)
  return { y, k, t, pv: p(y), witness: r * t >= -1e-15 }
}))
const nW = computed(() => pts.value.filter(u => u.witness).length)
function rand() { cs.value = cs.value.map(() => Math.round((Math.random() * 2 - 1) * 20) / 20) }

const W = 640, H = 280
const sx = makeScale(-1, 1, 36, W - 14)
const sy = computed(() => { const m = Math.max(sup.value.max, a.value) * 1.15; return makeScale(-m, m, H - 16, 12) })
const sub = (k: number) => String(k).replace(/./g, c => '₀₁₂₃₄₅₆₇₈₉'[Number(c)])
</script>

<template>
  <Widget title="最优性证书：任何首一多项式都不比 T̂<sub>n</sub> 更矮">
    <div class="ctrl">
      <label>n = <b>{{ n }}</b><input v-model.number="n" type="range" min="2" max="6" step="1"></label>
      <button class="btn" @click="rand">随机扰动</button>
      <button class="btn" @click="cs = cs.map(() => 0)">归零</button>
    </div>
    <div class="ctrl" style="flex-wrap:wrap">
      <label v-for="(c, k) in cs" :key="k">c{{ sub(k) }} = <b>{{ c.toFixed(2) }}</b><input v-model.number="cs[k]" type="range" min="-1" max="1" step="0.01"></label>
    </div>
    <p class="widget-note" style="margin-bottom:4px">p(x) = T̂{{ sub(n) }}(x) + a·Σ c<sub>k</sub>T<sub>k</sub>(x)，a = 2<sup>1−n</sup> = {{ sci(a, 3) }}。p 仍然首一（低次项随便改）。</p>
    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
      <rect :x="sx(-1)" :y="sy(a)" :width="sx(1) - sx(-1)" :height="sy(-a) - sy(a)" style="fill:var(--ex-bg)" />
      <line :x1="sx(-1)" :x2="sx(1)" :y1="sy(0)" :y2="sy(0)" style="stroke:var(--ink-3)" />
      <line v-for="v in [1, -1]" :key="v" :x1="sx(-1)" :x2="sx(1)" :y1="sy(v * a)" :y2="sy(v * a)" style="stroke:var(--ex)" stroke-dasharray="5 4" />
      <text :x="sx(-1) - 4" :y="sy(a) + 4" font-size="11" text-anchor="end" style="fill:var(--ex)">+a</text>
      <text :x="sx(-1) - 4" :y="sy(-a) + 4" font-size="11" text-anchor="end" style="fill:var(--ex)">−a</text>
      <path :d="pathOf(That, -1, 1, sx, sy, [-Infinity, Infinity], 500)" style="fill:none;stroke:var(--ink-3);stroke-width:1.6" stroke-dasharray="6 4" />
      <path :d="pathOf(p, -1, 1, sx, sy, [-Infinity, Infinity], 500)" style="fill:none;stroke:var(--prin);stroke-width:2.4" />
      <g v-for="u in pts" :key="u.k">
        <line :x1="sx(u.y)" :x2="sx(u.y)" :y1="sy(u.t)" :y2="sy(u.pv)" :style="`stroke:var(${u.witness ? '--warn' : '--line'});stroke-width:2`" />
        <circle :cx="sx(u.y)" :cy="sy(u.t)" r="3.5" style="fill:var(--ink-3)" />
        <circle :cx="sx(u.y)" :cy="sy(u.pv)" :r="u.witness ? 6 : 4" :style="`fill:var(${u.witness ? '--warn' : '--prin'})`" />
      </g>
    </svg>
    <div class="stats">
      <div class="stat"><b>{{ sci(sup.max, 3) }}</b><span>max |p(x)|</span></div>
      <div class="stat"><b>{{ sci(a, 3) }}</b><span>a = max |T̂<sub>n</sub>|</span></div>
      <div class="stat"><b>{{ nW }} / {{ n + 1 }}</b><span>证人点个数（|p(y<sub>k</sub>)| ≥ a）</span></div>
    </div>
    <p class="widget-note">虚线是 T̂<sub>n</sub>，实线是 p。在 n + 1 个极值点 y<sub>k</sub> = cos(kπ/n) 上，若 p 与 T̂<sub>n</sub> 的差 r = p − T̂<sub>n</sub> 和 T̂<sub>n</sub>(y<sub>k</sub>) 同号（或为 0），就有 |p(y<sub>k</sub>)| ≥ a，标成<span style="color:var(--warn)">橙色证人点</span>。怎么调系数，证人点都至少有一个：要让它们全部消失，r 就得在 n + 1 个点上正负交替、有 n 个零点，而 r 的次数 &lt; n。</p>
  </Widget>
</template>
