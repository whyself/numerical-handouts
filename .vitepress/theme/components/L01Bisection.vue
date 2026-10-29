<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { bisection, SQRT2, DOTTIE, CUBIC_ROOT, type Fn } from '../lib/l01'
import { makeScale, pathOf, sci, fix } from '../lib/plot'

// 二分法：每步只用 f(m_k) 的符号（1 个比特），区间长度减半
const CASES: { name: string; f: Fn; a: number; b: number; r: number }[] = [
  { name: 'x² − 2 on [1, 2]', f: x => x * x - 2, a: 1, b: 2, r: SQRT2 },
  { name: 'cos x − x on [0, 1]', f: x => Math.cos(x) - x, a: 0, b: 1, r: DOTTIE },
  { name: 'x³ − 2x + 2 on [−3, 0]', f: x => x ** 3 - 2 * x + 2, a: -3, b: 0, r: CUBIC_ROOT }
]
const ci = ref(0)
const c = computed(() => CASES[ci.value])
const logEps = ref(-6)
const eps = computed(() => 10 ** logEps.value)
const shown = ref(0)

const need = computed(() => Math.max(0, Math.ceil(Math.log2((c.value.b - c.value.a) / (2 * eps.value)))))
const steps = computed(() => bisection(c.value.f, c.value.a, c.value.b, 60))
const cur = computed(() => steps.value[Math.min(shown.value, steps.value.length - 1)])
watch([ci, logEps], () => { shown.value = 0 })

const W = 640, H = 230
const sx = computed(() => makeScale(c.value.a, c.value.b, 30, W - 20))
const yr = computed(() => {
  const ys = Array.from({ length: 50 }, (_, i) => c.value.f(c.value.a + (c.value.b - c.value.a) * i / 49))
  return [Math.min(...ys), Math.max(...ys)]
})
const sy = computed(() => makeScale(yr.value[0], yr.value[1], 150, 14))
// 下方“区间条”：前几步的区间一层层叠下去
const bars = computed(() => steps.value.slice(0, Math.min(shown.value + 1, 7)))
</script>

<template>
  <Widget title="二分法：用 1 个比特换一半区间">
    <div class="ctrl">
      <select v-model.number="ci"><option v-for="(cc, i) in CASES" :key="i" :value="i">{{ cc.name }}</option></select>
      <label>精度 ε = <b>{{ sci(eps, 0) }}</b><input v-model.number="logEps" type="range" min="-12" max="-1" step="1"></label>
    </div>
    <div class="ctrl">
      <button class="btn" @click="shown = 0">⟲ 重来</button>
      <button class="btn primary" :disabled="shown >= need" @click="shown = Math.min(shown + 1, need)">下一步 ▸</button>
      <button class="btn" @click="shown = need">跳到第 {{ need }} 步</button>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
      <line :x1="30" :x2="W - 20" :y1="sy(0)" :y2="sy(0)" style="stroke:var(--ink-3)" />
      <path :d="pathOf(c.f, c.a, c.b, sx, sy)" style="fill:none;stroke:var(--prin);stroke-width:2.5" />
      <rect :x="sx(cur.a)" y="10" :width="Math.max(1, sx(cur.b) - sx(cur.a))" height="144" style="fill:var(--accent-soft)" opacity=".7" />
      <line :x1="sx(cur.m)" :x2="sx(cur.m)" y1="10" y2="154" style="stroke:var(--accent)" stroke-dasharray="4 3" />
      <circle :cx="sx(cur.m)" :cy="sy(cur.fm)" r="5" :style="{ fill: cur.fm > 0 ? 'var(--warn)' : 'var(--ex)' }" />
      <g v-for="(s, i) in bars" :key="i">
        <line :x1="sx(s.a)" :x2="sx(s.b)" :y1="168 + i * 9" :y2="168 + i * 9" style="stroke:var(--accent);stroke-width:5" :opacity="i === bars.length - 1 ? 1 : .35" />
      </g>
    </svg>
    <div class="stats">
      <div class="stat"><b>{{ shown }}</b><span>已二分次数 k</span></div>
      <div class="stat"><b style="font-family:var(--vp-font-family-mono)">{{ fix(cur.m, 12) }}</b><span>当前中点 m<sub>k</sub></span></div>
      <div class="stat"><b>{{ sci((cur.b - cur.a) / 2) }}</b><span>误差上界 (b<sub>k</sub> − a<sub>k</sub>)/2</span></div>
      <div class="stat"><b>{{ sci(Math.abs(cur.m - c.r)) }}</b><span>真实误差 |m<sub>k</sub> − r|</span></div>
    </div>
    <p class="widget-note">公式 ⌈log₂((b − a)/(2ε))⌉ 给出 <b>{{ need }}</b> 步；ε 每缩小 10 倍只多 log₂10 ≈ 3.3 步。红点 f(m) &gt; 0、绿点 f(m) &lt; 0——算法只看这个颜色，不看数值大小。</p>
  </Widget>
</template>
