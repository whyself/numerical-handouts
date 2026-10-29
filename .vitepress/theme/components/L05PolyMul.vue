<script setup lang="ts">
import { ref, computed } from 'vue'
import { polyMulFFT, convolve, circConvolve, nextPow2, cstr } from '../lib/l05'

// 多项式乘法的四步：补零 → FFT（系数→点值）→ 逐点相乘 → 逆 FFT（点值→系数）；N 取小了就会“回绕”成循环卷积
const pText = ref('1, 2, 3')
const qText = ref('4, 5, 6')
const parse = (s: string) => s.split(/[,\s，]+/).filter(t => t !== '').map(Number).filter(Number.isFinite)
const p = computed(() => { const v = parse(pText.value); return v.length ? v : [0] })
const q = computed(() => { const v = parse(qText.value); return v.length ? v : [0] })
const need = computed(() => p.value.length + q.value.length - 1)
const auto = computed(() => nextPow2(need.value))
const choice = ref<number | 'auto'>('auto')
const N = computed(() => (choice.value === 'auto' ? auto.value : Math.max(choice.value, nextPow2(Math.max(p.value.length, q.value.length)))))
const res = computed(() => polyMulFFT(p.value, q.value, N.value))
const lin = computed(() => convolve(p.value, q.value))
const circ = computed(() => circConvolve(p.value, q.value, N.value))
const back = computed(() => res.value.c.map(z => z.re))
const ok = computed(() => N.value >= need.value)
const pad = (v: number[]) => Array.from({ length: N.value }, (_, j) => (j < v.length ? v[j] : 0))
const r6 = (v: number) => { const t = Number(v.toFixed(6)); return (Object.is(t, -0) ? 0 : t).toString() }
const polyStr = (c: number[]) => {
  const terms = c.map((v, k) => [v, k] as const).filter(([v]) => Math.abs(v) > 1e-9)
  if (!terms.length) return '0'
  return terms.map(([v, k], i) => {
    const s = v < 0 ? '−' : i ? '+' : ''
    const m = Math.abs(v), coef = m === 1 && k > 0 ? '' : r6(m)
    return `${i ? ` ${s} ` : s}${coef}${k === 0 ? '' : k === 1 ? 'x' : `x^${k}`}`
  }).join('').replace(/\^(\d+)/g, (_, d) => d.replace(/\d/g, (c: string) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]))
}
</script>

<template>
  <Widget title="用 FFT 乘多项式：系数 → 点值 → 逐点乘 → 系数">
    <div class="ctrl">
      <label>p 的系数 a₀, a₁, … <input v-model="pText" type="text" style="width:150px"></label>
      <label>q 的系数 b₀, b₁, … <input v-model="qText" type="text" style="width:150px"></label>
    </div>
    <div class="ctrl">
      <span style="font-size:13.5px;color:var(--ink-2)">变换长度 N：</span>
      <div class="seg">
        <button :class="{ on: choice === 'auto' }" @click="choice = 'auto'">自动（{{ auto }}）</button>
        <button v-for="n in [2, 4, 8, 16]" :key="n" :class="{ on: choice === n }" :disabled="n < Math.max(p.length, q.length)" :style="n < Math.max(p.length, q.length) ? 'opacity:.4;cursor:not-allowed' : ''" @click="choice = n">{{ n }}</button>
      </div>
      <span class="muted" style="font-size:13px">需要 N ≥ n<sub>a</sub> + n<sub>b</sub> − 1 = {{ need }}</span>
    </div>
    <div class="out prose" style="margin-bottom:10px">p(x) = {{ polyStr(p) }}，q(x) = {{ polyStr(q) }}</div>
    <div style="overflow-x:auto">
      <table class="mini-table" style="font-variant-numeric:tabular-nums;white-space:nowrap">
        <thead><tr><th>步骤</th><th v-for="k in N" :key="k">k = {{ k - 1 }}</th></tr></thead>
        <tbody>
          <tr><td>① a 补零</td><td v-for="(v, k) in pad(p)" :key="k">{{ v }}</td></tr>
          <tr><td>① b 补零</td><td v-for="(v, k) in pad(q)" :key="k">{{ v }}</td></tr>
          <tr><td>② â<sub>k</sub> = p(ω<sup>k</sup>)</td><td v-for="(z, k) in res.A" :key="k">{{ cstr(z, 3) }}</td></tr>
          <tr><td>② b̂<sub>k</sub> = q(ω<sup>k</sup>)</td><td v-for="(z, k) in res.B" :key="k">{{ cstr(z, 3) }}</td></tr>
          <tr><td>③ ĉ<sub>k</sub> = â<sub>k</sub>b̂<sub>k</sub></td><td v-for="(z, k) in res.Ch" :key="k">{{ cstr(z, 3) }}</td></tr>
          <tr class="best"><td>④ 逆 FFT 得 c</td><td v-for="(v, k) in back" :key="k">{{ r6(v) }}</td></tr>
          <tr><td>直接卷积 Σ a<sub>j</sub>b<sub>k−j</sub></td><td v-for="k in N" :key="k" :class="ok || (lin[k - 1] ?? 0) === circ[k - 1] ? '' : 'bad-c'">{{ k - 1 < lin.length ? lin[k - 1] : 0 }}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="out prose" style="margin-top:10px">
      <template v-if="ok">逆 FFT 的结果与直接卷积一致：p·q = {{ polyStr(back) }}（ω = ω<sub>{{ N }}</sub> = e<sup>2πi/{{ N }}</sup>；表中显示到 3 位小数，逆变换后的 c 只差 10⁻¹⁵ 量级的舍入误差）。</template>
      <template v-else><span class="bad-c">N = {{ N }} &lt; {{ need }}：发生“回绕”</span>。逆 FFT 给出的是循环卷积 c<sub>k</sub> = Σ<sub>i+j ≡ k (mod {{ N }})</sub> a<sub>i</sub>b<sub>j</sub> = ({{ circ.join(', ') }})，高次项被折回到了低次项；线性卷积本应是 ({{ lin.join(', ') }})。</template>
    </div>
  </Widget>
</template>
