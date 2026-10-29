<script setup lang="ts">
import { ref, computed } from 'vue'
import { makeScale, pathOf, sci } from '../lib/plot'

// 根的条件性：同样的纵向扰动 η，根移动 Δr ≈ η/|f'(r)|；重根时 Δr = η^{1/m}
const mode = ref<'simple' | 'multi'>('simple')
const slope = ref(1.2)
const eta = ref(0.3)
const m = ref(3)
const logEta = ref(-6)

const W = 640, H = 280
const sx = makeScale(-2, 2, 40, W - 20)
const sy = makeScale(-1.2, 1.2, H - 20, 20)

const f = computed(() => mode.value === 'simple'
  ? (x: number) => slope.value * x
  : (x: number) => Math.sign(x) ** (m.value % 2 ? 1 : 0) * Math.abs(x) ** m.value)
const lvl = computed(() => mode.value === 'simple' ? eta.value : 0.3)
// 扰动后的根：f(r + Δr) = η
const dr = computed(() => mode.value === 'simple' ? eta.value / slope.value : lvl.value ** (1 / m.value))
const tiny = computed(() => {
  const e = 10 ** logEta.value
  return { e, dr: e ** (1 / m.value) }
})
</script>

<template>
  <Widget title="根的条件性：残差 η 小，根就一定准吗？">
    <div class="ctrl">
      <div class="seg">
        <button :class="{ on: mode === 'simple' }" @click="mode = 'simple'">简单根：改斜率</button>
        <button :class="{ on: mode === 'multi' }" @click="mode = 'multi'">重根 (x − r)<sup>m</sup></button>
      </div>
    </div>
    <div v-if="mode === 'simple'" class="ctrl">
      <label>斜率 f′(r) = <b>{{ slope.toFixed(2) }}</b><input v-model.number="slope" type="range" min="0.1" max="3" step="0.05"></label>
      <label>残差 η = <b>{{ eta.toFixed(2) }}</b><input v-model.number="eta" type="range" min="0.05" max="0.8" step="0.05"></label>
    </div>
    <div v-else class="ctrl">
      <label>重数 m = <b>{{ m }}</b><input v-model.number="m" type="range" min="1" max="6" step="1"></label>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
      <line :x1="sx(-2)" :x2="sx(2)" :y1="sy(0)" :y2="sy(0)" style="stroke:var(--ink-3)" />
      <line :x1="sx(0)" :x2="sx(0)" :y1="sy(-1.2)" :y2="sy(1.2)" style="stroke:var(--line)" />
      <line :x1="sx(-2)" :x2="sx(2)" :y1="sy(lvl)" :y2="sy(lvl)" style="stroke:var(--warn)" stroke-dasharray="6 4" />
      <text :x="sx(-2) + 4" :y="sy(lvl) - 6" font-size="13" style="fill:var(--warn)">y = η = {{ lvl.toFixed(2) }}</text>
      <path :d="pathOf(f, -2, 2, sx, sy, [-1.3, 1.3])" style="fill:none;stroke:var(--prin);stroke-width:2.5" />
      <circle :cx="sx(0)" :cy="sy(0)" r="5" style="fill:var(--ink)" />
      <text :x="sx(0) - 14" :y="sy(0) + 18" font-size="13" style="fill:var(--ink)">r</text>
      <template v-if="dr <= 2">
        <line :x1="sx(dr)" :x2="sx(dr)" :y1="sy(lvl)" :y2="sy(0)" style="stroke:var(--accent)" stroke-dasharray="3 3" />
        <circle :cx="sx(dr)" :cy="sy(lvl)" r="5" style="fill:var(--accent)" />
        <line :x1="sx(0)" :x2="sx(dr)" :y1="sy(-0.15)" :y2="sy(-0.15)" style="stroke:var(--accent);stroke-width:3" />
        <text :x="(sx(0) + sx(dr)) / 2" :y="sy(-0.15) + 18" font-size="13" text-anchor="middle" style="fill:var(--accent);font-weight:700">|Δr| = {{ dr.toFixed(3) }}</text>
      </template>
      <text v-else :x="sx(2) - 4" :y="sy(-0.3)" font-size="13" text-anchor="end" style="fill:var(--accent);font-weight:700">|Δr| = {{ dr.toFixed(2) }}，已超出画面 →</text>
    </svg>
    <div class="stats">
      <div class="stat"><b>{{ dr.toFixed(3) }}</b><span>根的位移 |Δr|</span></div>
      <div class="stat"><b>{{ (dr / lvl).toFixed(2) }}</b><span>放大倍数 |Δr| / η</span></div>
      <div v-if="mode === 'simple'" class="stat"><b>{{ (1 / slope).toFixed(2) }}</b><span>1 / |f′(r)|</span></div>
    </div>
    <template v-if="mode === 'multi'">
      <div class="ctrl">
        <label>换成很小的 η = <b>{{ sci(tiny.e, 0) }}</b><input v-model.number="logEta" type="range" min="-16" max="-1" step="1"></label>
      </div>
      <p class="widget-note">η = {{ sci(tiny.e, 0) }} 时，(x − r)<sup>{{ m }}</sup> = η 的根位移 η<sup>1/{{ m }}</sup> = <b>{{ sci(tiny.dr) }}</b>，是 η 的 {{ sci(tiny.dr / tiny.e) }} 倍。m = 1 时位移与 η 同阶；m 越大，同样小的 η 把根推得越远（双精度下 η ≈ 10⁻¹⁶、m = 3 就只剩约 5 位有效数字）。</p>
    </template>
    <p v-else class="widget-note">残差 η 是“纵向”的、可以直接算出来；位移 Δr 是“横向”的、我们真正关心的。两者之比就是 1/|f′(r)|：斜率越平，同样的残差对应越大的根误差。</p>
  </Widget>
</template>
