<script setup lang="ts">
import { ref, computed } from 'vue'
import { pEval, interpMod, interpAtZero, polyStr, pTrim, rng } from '../lib/l02'

// Shamir 秘密分享：11 人、门限 6、在 F_1009 上；选出若干份额，看能否恢复秘密
const q = 1009, N = 11, T = 6
const secret = ref(462)
const seed = ref(7)
const coeffs = computed(() => {
  const r = rng(seed.value)
  return [secret.value, ...Array.from({ length: T - 1 }, () => Math.floor(r() * q))]
})
const xs = Array.from({ length: N }, (_, i) => i + 1)
const shares = computed(() => xs.map(x => pEval(coeffs.value, x, q)))
const sel = ref<number[]>([1, 3, 4, 7, 9])
const toggle = (i: number) => { sel.value = sel.value.includes(i) ? sel.value.filter(j => j !== i) : [...sel.value, i].sort((a, b) => a - b) }
const m = computed(() => sel.value.length)

const recovered = computed(() => m.value >= T
  ? { s: interpAtZero(sel.value.map(i => xs[i]), sel.value.map(i => shares.value[i]), q), poly: pTrim(interpMod(sel.value.map(i => xs[i]), sel.value.map(i => shares.value[i]), q)) }
  : null)

// 份额不足时：任取候选秘密 s′，把 (0, s′) 补进去，得到一个与已见份额相容的多项式
const cand = ref(0)
const fake = computed(() => {
  if (m.value >= T) return null
  const X = [0, ...sel.value.map(i => xs[i])], Y = [cand.value, ...sel.value.map(i => shares.value[i])]
  const p = pTrim(interpMod(X, Y, q))
  return { p, check: sel.value.map(i => pEval(p, xs[i], q) === shares.value[i]) }
})
const clampSecret = () => { secret.value = Math.max(0, Math.min(q - 1, Math.round(secret.value || 0))) }
const clampCand = () => { cand.value = Math.max(0, Math.min(q - 1, Math.round(cand.value || 0))) }
</script>

<template>
  <Widget title="Shamir 秘密分享：6 份恢复，5 份一无所知">
    <div class="ctrl">
      <label>秘密 s = <input v-model.number="secret" type="text" style="width:70px" @change="clampSecret"></label>
      <button class="btn" @click="seed++">⟲ 重新抽随机系数 a₁…a₅</button>
      <span class="muted" style="font-size:13px">在 𝔽<sub>{{ q }}</sub> 中计算，p(x) = s + a₁x + … + a₅x⁵</span>
    </div>
    <p class="widget-note" style="margin:0">点击份额选出“在场”的科学家（第 i 人拿到 (i, p(i))）：</p>
    <div class="ctrl">
      <button v-for="(x, i) in xs" :key="i" class="cell" :class="{ on: sel.includes(i) }" style="width:58px;height:46px;cursor:pointer;color:var(--ink)" @click="toggle(i)">
        <small>x = {{ x }}</small>{{ shares[i] }}
      </button>
    </div>
    <div class="ctrl">
      <button class="btn" @click="sel = []">清空</button>
      <button class="btn" @click="sel = [0, 2, 5, 6, 8, 10]">任选 6 人</button>
      <button class="btn" @click="sel = xs.map((_, i) => i)">全部 11 人</button>
    </div>
    <div class="stats">
      <div class="stat"><b :class="m >= T ? 'ok-c' : 'bad-c'">{{ m }}</b><span>已选份额数（门限 {{ T }}）</span></div>
      <div v-if="recovered" class="stat"><b class="ok-c">{{ recovered.s }}</b><span>拉格朗日插值求得 p(0)</span></div>
    </div>
    <div v-if="recovered" class="out prose">
      <span class="lbl">由所选 {{ m }} 份插值得到的多项式（mod {{ q }}）</span>
      p(x) = {{ polyStr(recovered.poly) }}<br>
      恢复的秘密 {{ recovered.s }} {{ recovered.s === secret ? '= 真实秘密 ✓' : '≠ 真实秘密 ✗' }}{{ m > T ? `；多于 6 份时插值结果仍是同一个 5 次多项式（高次系数全为 0）` : '' }}
    </div>
    <template v-else-if="fake">
      <div class="ctrl">
        <label>假想秘密 s′ = <input v-model.number="cand" type="text" style="width:70px" @change="clampCand"></label>
        <input v-model.number="cand" type="range" min="0" :max="q - 1" step="1">
      </div>
      <div class="out prose">
        <span class="lbl">把 (0, s′) 加进已见的 {{ m }} 份，插值得到</span>
        p<sub>s′</sub>(x) = {{ polyStr(fake.p) }}<br>
        它在所选每个 x<sub>i</sub> 上都与份额一致：{{ fake.check.every(Boolean) ? '是 ✓' : '否' }}（次数 ≤ {{ m }} ≤ 5，是合法的“秘密多项式”）
      </div>
      <p class="widget-note" style="margin-top:8px">拖动 s′ 走遍 0…{{ q - 1 }}：每一个候选秘密都能找到与已见份额相容的系数{{ m === 5 ? '（已见 5 份时恰好一组）' : '' }}<template v-if="m < 5">（已见 {{ m }} 份时有 {{ q }}<sup>{{ 5 - m }}</sup> 组）</template>。所以只看这 {{ m }} 份，对秘密是什么毫无信息。</p>
    </template>
  </Widget>
</template>
