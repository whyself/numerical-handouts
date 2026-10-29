<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { pEval, interpMod, pTrim, polyStr, berlekampWelch, bruteDecode, binom } from '../lib/l02'

// Reed–Solomon 编码 + 两种故障：擦除（位置已知，插值即可）与错误（位置未知，Berlekamp–Welch）
const q = 97
const n = ref(3), k = ref(2)
const msg = ref<number[]>([5, 11, 42])
const N = computed(() => n.value + 2 * k.value)
const alphas = computed(() => Array.from({ length: N.value }, (_, i) => i + 1))
watch(n, v => { msg.value = Array.from({ length: v }, (_, i) => msg.value[i] ?? (7 * i + 3) % q) })
const code = computed(() => alphas.value.map(a => pEval(msg.value, a, q)))

const mode = ref<'error' | 'erasure'>('error')
// 每个位置的故障：0 无；错误模式下存放加上去的偏移（非零）；擦除模式下 1 表示擦除
const fault = ref<number[]>([])
const reset = () => { fault.value = new Array(N.value).fill(0) }
reset()
watch([N, mode], reset)
const OFFS = [13, 41, 7, 66, 29, 88, 3, 54, 20, 71, 35, 9, 60]
const toggle = (i: number) => { fault.value = fault.value.map((v, j) => j !== i ? v : v ? 0 : OFFS[i % OFFS.length]) }
const recv = computed(() => code.value.map((v, i) => mode.value === 'error' ? (v + (fault.value[i] || 0)) % q : v))
const nf = computed(() => fault.value.filter(Boolean).length)
const same = (p: number[] | null) => !!p && msg.value.every((v, i) => (p[i] ?? 0) === ((v % q) + q) % q) && p.length <= n.value

// 擦除：剩下的位置里任取 n 个插值
const eras = computed(() => {
  if (mode.value !== 'erasure') return null
  const keep = alphas.value.map((_, i) => i).filter(i => !fault.value[i])
  if (keep.length < n.value) return { ok: false, keep: keep.length, p: null as number[] | null }
  const use = keep.slice(0, n.value)
  const p = pTrim(interpMod(use.map(i => alphas.value[i]), use.map(i => recv.value[i]), q))
  return { ok: true, keep: keep.length, p }
})
// 错误：Berlekamp–Welch 与穷举
const bw = computed(() => mode.value === 'error' ? berlekampWelch(alphas.value, recv.value, n.value, k.value, q) : null)
const brute = computed(() => mode.value === 'error' ? bruteDecode(alphas.value, recv.value, n.value, k.value, q) : null)
const eRoots = computed(() => bw.value ? alphas.value.filter(a => pEval(bw.value!.E, a, q) === 0) : [])
const setMsg = (i: number, e: Event) => {
  const v = Math.round(Number((e.target as HTMLInputElement).value))
  msg.value = msg.value.map((u, j) => j === i ? (Number.isFinite(v) ? ((v % q) + q) % q : 0) : u)
}
</script>

<template>
  <Widget title="Reed–Solomon：多发 2k 个取值，纠正任意 k 个错误">
    <div class="ctrl">
      <label>消息长度 n = <b>{{ n }}</b><input v-model.number="n" type="range" min="2" max="5" step="1" style="width:110px"></label>
      <label>纠错能力 k = <b>{{ k }}</b><input v-model.number="k" type="range" min="1" max="4" step="1" style="width:110px"></label>
      <div class="seg">
        <button :class="{ on: mode === 'error' }" @click="mode = 'error'">错误（位置未知）</button>
        <button :class="{ on: mode === 'erasure' }" @click="mode = 'erasure'">擦除（位置已知）</button>
      </div>
    </div>
    <div class="ctrl">
      <span style="font-size:13.5px;color:var(--ink-2)">消息 (a₀, …, a<sub>n−1</sub>) ∈ 𝔽<sub>{{ q }}</sub>：</span>
      <input v-for="(v, i) in msg" :key="i" type="text" :value="v" style="width:52px" @change="setMsg(i, $event)">
    </div>
    <div class="out" style="margin-bottom:8px"><span class="lbl">消息多项式</span>p(x) = {{ polyStr(msg) }}　（mod {{ q }}）</div>
    <p class="widget-note" style="margin:0">码字 C(p) = (p(1), …, p({{ N }}))，共 N = n + 2k = {{ N }} 个符号。点击某个位置{{ mode === 'error' ? '篡改它（加上一个偏移）' : '擦除它' }}：</p>
    <div class="ctrl">
      <button v-for="(a, i) in alphas" :key="i" class="cell" :class="{ mark: fault[i] }" style="width:50px;height:46px;cursor:pointer;color:var(--ink)" @click="toggle(i)">
        <small>α = {{ a }}</small>
        <span v-if="mode === 'erasure' && fault[i]" style="color:var(--warn)">✕</span>
        <span v-else :style="{ color: fault[i] ? 'var(--warn)' : '' }">{{ recv[i] }}</span>
      </button>
      <button class="btn" @click="reset">清除故障</button>
    </div>
    <div class="stats">
      <div class="stat"><b :class="(mode === 'error' ? nf <= k : nf <= 2 * k) ? 'ok-c' : 'bad-c'">{{ nf }}</b><span>{{ mode === 'error' ? `错误个数（能力 k = ${k}）` : `擦除个数（能力 N − n = ${2 * k}）` }}</span></div>
      <template v-if="mode === 'error' && bw">
        <div class="stat"><b>{{ bw.equations }} × {{ bw.unknowns }}</b><span>BW 齐次方程组：方程 × 未知数</span></div>
        <div class="stat"><b>{{ brute?.tried }} / {{ binom(N, n) }}</b><span>穷举：试过的 n 点子集 / 总数</span></div>
      </template>
    </div>
    <div v-if="mode === 'erasure' && eras" class="out prose">
      <template v-if="eras.ok">剩下 {{ eras.keep }} ≥ n = {{ n }} 个点，取其中前 {{ n }} 个做拉格朗日插值：p(x) = {{ polyStr(eras.p!) }} {{ same(eras.p) ? '✓ 与原消息一致' : '✗' }}</template>
      <template v-else>只剩 {{ eras.keep }} &lt; n = {{ n }} 个点：次数 &lt; n 的多项式不再唯一，无法恢复。</template>
    </div>
    <div v-if="mode === 'error' && bw" class="out prose">
      <span class="lbl">Berlekamp–Welch：解 Q(α<sub>i</sub>) = r<sub>i</sub>E(α<sub>i</sub>)，deg Q ≤ n + k − 1，deg E ≤ k，取一个非零解</span>
      E(x) = {{ polyStr(bw.E) }}　在 α 中的根：{{ eRoots.length ? eRoots.join(', ') : '无' }}<br>
      Q(x) = {{ polyStr(bw.Q) }}<br>
      <template v-if="bw.ok">p = Q / E = {{ polyStr(bw.p) }} {{ same(bw.p) ? '✓ 与原消息一致' : '✗ 不是原消息（错误太多）' }}</template>
      <template v-else>Q 不能被 E 整除，或商的次数 ≥ n：解码失败，可以断定错误多于 k 个。</template>
      <br><span class="muted">穷举解码：{{ brute?.p ? `第 ${brute.tried} 个子集插值后与 ≥ N − k = ${N - k} 个接收值一致，得到 ${polyStr(brute.p)}` : `试遍全部 ${brute?.tried} 个子集，没有多项式与 ≥ ${N - k} 个接收值一致` }}</span>
    </div>
    <p class="widget-note" style="margin-top:8px">错误位置总是 E(x) 的根（E 的根里可能多出无关的点，不影响 p = Q/E）。篡改超过 k 个位置后，解码要么失败、要么给出另一个合法码字——距离 d<sub>min</sub> = 2k + 1 只保证 k 个以内。穷举要试 C(N, n) 个子集，k、n 一大就爆炸；BW 只解一个 N × (N + 1) 的线性方程组。</p>
  </Widget>
</template>
