<script setup lang="ts">
import { ref, computed } from 'vue'
import { mv, vnorm, unitPoint, opNorm2x2, opNormArgmax, svd2, type Mat2, type NormKind } from '../lib/l06'
import { makeScale } from '../lib/plot'

// 算子范数 = 单位球在 A 下的最大拉伸：画出单位球、它的像 A(球)，以及半径为 ‖A‖ 的范数球
const PRESETS: { name: string; A: Mat2 }[] = [
  { name: '[[3, 1], [1, 2]]（P15 的系数矩阵）', A: [3, 1, 1, 2] },
  { name: '[[1, 2], [3, 1]]（P16 的系数矩阵）', A: [1, 2, 3, 1] },
  { name: '[[0, 1], [1, 1]]（P8 需要选主元的例子）', A: [0, 1, 1, 1] },
  { name: '[[1, 1], [0, 1]]（剪切）', A: [1, 1, 0, 1] },
  { name: '[[2, 0], [0, 0.5]]（对角）', A: [2, 0, 0, 0.5] },
  { name: '旋转 45°', A: [Math.SQRT1_2, -Math.SQRT1_2, Math.SQRT1_2, Math.SQRT1_2] }
]
const pi = ref(0)
const A = ref<Mat2>([...PRESETS[0].A] as Mat2)
function choose(i: number) { pi.value = i; A.value = [...PRESETS[i].A] as Mat2 }
const p = ref<NormKind>(2)
const theta = ref(30) // 试探向量 x 的方向角（度）

const N = 720
const ball = computed(() => Array.from({ length: N }, (_, i) => unitPoint(2 * Math.PI * i / N, p.value)))
const img = computed(() => ball.value.map(x => mv(A.value, x)))
const formula = computed(() => opNorm2x2(A.value, p.value))
// 直接在单位球上采样求最大拉伸，用来和公式核对
const sampled = computed(() => img.value.reduce((m, y) => Math.max(m, vnorm(y, p.value)), 0))
const xs = computed(() => opNormArgmax(A.value, p.value))
const ys = computed(() => mv(A.value, xs.value))
const xt = computed(() => unitPoint(theta.value * Math.PI / 180, p.value))
const yt = computed(() => mv(A.value, xt.value))
const ratio = computed(() => vnorm(yt.value, p.value))
const sv = computed(() => svd2(A.value))

const R = computed(() => Math.max(1.3, 1.12 * Math.max(...img.value.map(y => Math.max(Math.abs(y[0]), Math.abs(y[1]))))))
const S = 360
const sx = computed(() => makeScale(-R.value, R.value, 10, S - 10))
const sy = computed(() => makeScale(-R.value, R.value, S - 10, 10))
const poly = (pts: number[][], k = 1) => pts.map(q => `${sx.value(k * q[0]).toFixed(1)},${sy.value(k * q[1]).toFixed(1)}`).join(' ')
const how = computed(() => p.value === 1 ? '最大列和' : p.value === 'inf' ? '最大行和' : '√λmax(AᵀA) = σ₁')
const pname = computed(() => p.value === 'inf' ? '∞' : String(p.value))
const fmt = (v: number) => Number(v.toFixed(3)).toString()
</script>

<template>
  <Widget title="算子范数 = 最大拉伸：单位球被 A 映成什么">
    <div class="ctrl">
      <select :value="pi" @change="choose(Number(($event.target as HTMLSelectElement).value))"><option v-for="(c, i) in PRESETS" :key="i" :value="i">{{ c.name }}</option></select>
      <div class="seg">
        <button :class="{ on: p === 1 }" @click="p = 1">1-范数</button>
        <button :class="{ on: p === 2 }" @click="p = 2">2-范数</button>
        <button :class="{ on: p === 'inf' }" @click="p = 'inf'">∞-范数</button>
      </div>
    </div>
    <div class="ctrl">
      <label v-for="(nm, j) in ['a₁₁', 'a₁₂', 'a₂₁', 'a₂₂']" :key="j">{{ nm }} = <b>{{ fmt(A[j]) }}</b><input v-model.number="A[j]" type="range" min="-3" max="3" step="0.1" style="width:110px"></label>
    </div>
    <div class="two-col" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start">
      <svg :viewBox="`0 0 ${S} ${S}`" style="width:100%;height:auto">
        <line :x1="sx(-R)" :x2="sx(R)" :y1="sy(0)" :y2="sy(0)" style="stroke:var(--line)" />
        <line :x1="sx(0)" :x2="sx(0)" :y1="sy(-R)" :y2="sy(R)" style="stroke:var(--line)" />
        <!-- 半径为 ‖A‖ 的范数球：A(单位球) 被它包住并与它相切 -->
        <polygon :points="poly(ball, formula)" style="fill:none;stroke:var(--warn);stroke-width:1.4" stroke-dasharray="6 4" />
        <polygon :points="poly(img)" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2" />
        <polygon :points="poly(ball)" style="fill:none;stroke:var(--ink-3);stroke-width:1.6" />
        <line :x1="sx(0)" :y1="sy(0)" :x2="sx(xt[0])" :y2="sy(xt[1])" style="stroke:var(--prin);stroke-width:2" />
        <circle :cx="sx(xt[0])" :cy="sy(xt[1])" r="4.5" style="fill:var(--prin)" />
        <text :x="sx(xt[0]) + 6" :y="sy(xt[1]) - 6" font-size="12" style="fill:var(--prin)">x</text>
        <line :x1="sx(0)" :y1="sy(0)" :x2="sx(yt[0])" :y2="sy(yt[1])" style="stroke:var(--accent);stroke-width:2" />
        <circle :cx="sx(yt[0])" :cy="sy(yt[1])" r="4.5" style="fill:var(--accent)" />
        <text :x="sx(yt[0]) + 6" :y="sy(yt[1]) - 6" font-size="12" style="fill:var(--accent)">Ax</text>
        <circle :cx="sx(ys[0])" :cy="sy(ys[1])" r="6" style="fill:none;stroke:var(--warn);stroke-width:2" />
        <circle :cx="sx(-ys[0])" :cy="sy(-ys[1])" r="6" style="fill:none;stroke:var(--warn);stroke-width:2" />
      </svg>
      <div>
        <div class="stats">
          <div class="stat"><b>{{ fmt(formula) }}</b><span>公式：{{ how }}</span></div>
          <div class="stat"><b>{{ fmt(sampled) }}</b><span>单位球上 {{ N }} 点采样的最大 ‖Ax‖<sub>{{ pname }}</sub></span></div>
        </div>
        <div class="ctrl">
          <label>试探方向 θ = <b>{{ theta }}°</b><input v-model.number="theta" type="range" min="0" max="359" step="1"></label>
        </div>
        <p class="widget-note" style="margin-bottom:4px">x = ({{ fmt(xt[0]) }}, {{ fmt(xt[1]) }})，‖x‖<sub>{{ pname }}</sub> = 1；‖Ax‖<sub>{{ pname }}</sub> = <b>{{ fmt(ratio) }}</b> ≤ ‖A‖<sub>{{ pname }}</sub> = {{ fmt(formula) }}</p>
        <p class="widget-note" style="margin-bottom:4px">取到最大值的 x = ({{ fmt(xs[0]) }}, {{ fmt(xs[1]) }})，像 Ax 用红圈标出。</p>
        <p v-if="p === 2" class="widget-note">2-范数下单位圆的像是椭圆，半长轴 σ₁ = {{ fmt(sv.s1) }}，半短轴 σ₂ = {{ fmt(sv.s2) }}；‖A‖₂ = σ₁，σ₁/σ₂ = {{ sv.s2 > 1e-12 ? fmt(sv.s1 / sv.s2) : '∞' }} 正是 6.4 节的 cond₂(A)。</p>
        <p v-else class="widget-note">{{ p === 1 ? '1-范数的单位球是菱形' : '∞-范数的单位球是正方形' }}，A(球) 是平行四边形；凸函数 ‖Ax‖ 的最大值总在顶点上取到，所以只需检查 {{ p === 1 ? '(±1, 0), (0, ±1) —— 这就是“最大列和”' : '(±1, ±1) —— 这就是“最大行和”' }}。</p>
      </div>
    </div>
    <p class="widget-note">灰线是单位球 {‖x‖ = 1}，橙色区域是它的像 A(球)，红色虚线是半径为 ‖A‖ 的同种范数球：A(球) 整个落在里面并且恰好碰到它——“‖Ax‖ ≤ ‖A‖‖x‖ 且等号可以取到”的图像。换一种范数，同一个矩阵的“大小”就不同。</p>
  </Widget>
</template>
