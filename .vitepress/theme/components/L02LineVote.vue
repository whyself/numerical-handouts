<script setup lang="ts">
import { ref, computed } from 'vue'
import { makeScale, fix } from '../lib/plot'

// 最小的 Reed–Solomon：直线 p(x) = a₀ + a₁x 在 α = 1,2,3,4 发送；篡改 1 个值后，
// 只有原直线能穿过至少 3 个接收点
const a0 = ref(1), a1 = ref(0.5)
const bad = ref(2)          // 被篡改的下标（0..3），−1 表示没有篡改
const err = ref(1.5)
const two = ref(false)      // 再篡改一个点（超出纠错能力）
const err2 = ref(-1)
const alphas = [1, 2, 3, 4]
const sent = computed(() => alphas.map(a => a0.value + a1.value * a))
const bad2 = computed(() => (bad.value + 2) % 4)
const recv = computed(() => sent.value.map((v, i) =>
  v + (i === bad.value ? err.value : 0) + (two.value && bad.value >= 0 && i === bad2.value ? err2.value : 0)))

const lines = computed(() => {
  const out: { i: number; j: number; b: number; k: number; on: number[] }[] = []
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const k = (recv.value[j] - recv.value[i]) / (alphas[j] - alphas[i])
    const b = recv.value[i] - k * alphas[i]
    const on = alphas.map((a, t) => Math.abs(b + k * a - recv.value[t]) < 1e-9 ? t : -1).filter(t => t >= 0)
    out.push({ i, j, b, k, on })
  }
  return out
})
// 去重：同一条直线可能由不同的点对得到
const distinct = computed(() => {
  const seen: typeof lines.value = []
  for (const l of lines.value) if (!seen.some(s => Math.abs(s.k - l.k) < 1e-9 && Math.abs(s.b - l.b) < 1e-9)) seen.push(l)
  return seen
})
const winners = computed(() => distinct.value.filter(l => l.on.length >= 3))

const W = 560, H = 290
const sx = makeScale(0, 5, 36, W - 12)
const sy = makeScale(-1.5, 6, H - 20, 10)
const lineStr = (l: { b: number; k: number }) => `y = ${l.b < 0 ? '−' : ''}${fix(Math.abs(l.b), 3)} ${l.k < 0 ? '−' : '+'} ${fix(Math.abs(l.k), 3)}x`
</script>

<template>
  <Widget title="2 个符号、1 个错误：哪条直线穿过 3 个接收点？">
    <div class="ctrl">
      <span style="font-size:13.5px;color:var(--ink-2)">篡改第几个值：</span>
      <div class="seg">
        <button :class="{ on: bad < 0 }" @click="bad = -1">不篡改</button>
        <button v-for="(a, i) in alphas" :key="i" :class="{ on: bad === i }" @click="bad = i">α{{ i + 1 }} = {{ a }}</button>
      </div>
    </div>
    <div class="ctrl">
      <label>错误大小 = <b>{{ err.toFixed(1) }}</b><input v-model.number="err" type="range" min="-3" max="3" step="0.1"></label>
      <label><input v-model="two" type="checkbox"> 再篡改 α{{ bad2 + 1 }}（2 个错误）</label>
      <label v-if="two">第二个错误 = <b>{{ err2.toFixed(1) }}</b><input v-model.number="err2" type="range" min="-3" max="3" step="0.1"></label>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
      <line :x1="sx(0)" :x2="sx(5)" :y1="sy(0)" :y2="sy(0)" style="stroke:var(--ink-3)" />
      <line :x1="sx(0)" :x2="sx(0)" :y1="sy(-1.5)" :y2="sy(6)" style="stroke:var(--ink-3)" />
      <g v-for="(l, t) in distinct" :key="t">
        <line :x1="sx(0)" :x2="sx(5)" :y1="sy(l.b)" :y2="sy(l.b + 5 * l.k)"
          :style="{ stroke: l.on.length >= 3 ? 'var(--ex)' : 'var(--ink-3)', strokeWidth: l.on.length >= 3 ? 3 : 1, opacity: l.on.length >= 3 ? 1 : .45 }" />
      </g>
      <g v-for="(a, i) in alphas" :key="'p' + i">
        <line v-if="recv[i] !== sent[i]" :x1="sx(a)" :x2="sx(a)" :y1="sy(sent[i])" :y2="sy(recv[i])" style="stroke:var(--warn)" stroke-dasharray="3 3" />
        <circle v-if="recv[i] !== sent[i]" :cx="sx(a)" :cy="sy(sent[i])" r="4" style="fill:none;stroke:var(--prin);stroke-width:1.5" />
        <circle :cx="sx(a)" :cy="sy(recv[i])" r="6" :style="{ fill: recv[i] !== sent[i] ? 'var(--warn)' : 'var(--prin)' }" />
        <text :x="sx(a)" :y="sy(0) + 15" font-size="12" text-anchor="middle" style="fill:var(--ink-2)">α{{ i + 1 }}</text>
      </g>
    </svg>
    <table class="mini-table" style="font-variant-numeric:tabular-nums">
      <thead><tr><th>由哪两点确定</th><th>候选直线</th><th>穿过的接收点</th></tr></thead>
      <tbody>
        <tr v-for="(l, t) in lines" :key="t" :class="{ best: l.on.length >= 3 }">
          <td>α{{ l.i + 1 }}, α{{ l.j + 1 }}</td><td>{{ lineStr(l) }}</td><td>{{ l.on.length }} 个（{{ l.on.map(x => 'α' + (x + 1)).join(', ') }}）</td>
        </tr>
      </tbody>
    </table>
    <p class="widget-note" style="margin-top:8px">
      <template v-if="winners.length === 1">穿过 ≥ 3 个接收点的直线唯一：<b>{{ lineStr(winners[0]) }}</b>{{ Math.abs(winners[0].b - a0) < 1e-9 && Math.abs(winners[0].k - a1) < 1e-9 ? '，正是原直线 y = 1 + 0.5x ✓' : '，但它不是原直线 ✗' }}</template>
      <template v-else-if="winners.length === 0">没有任何直线穿过 3 个接收点：2 个错误超出了 4 = 2 + 2·1 个取值的纠错能力，只能发现“出错了”，无法确定原直线。</template>
      <template v-else>有 {{ winners.length }} 条直线都穿过至少 3 个点：无法唯一解码。</template>
      紫色空心圈是被改之前的真值。勾选“2 个错误”后，把第二个错误调成第一个的相反数（例如 1.5 与 −1.5），被改的两点会和中间的正确点共线，出现一条“错误的”赢家——这就是 2 个错误时的解码歧义。
    </p>
  </Widget>
</template>
