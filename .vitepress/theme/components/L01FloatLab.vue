<script setup lang="ts">
import { ref, computed } from 'vue'
import { kahanSum, softmaxNaive, softmaxStable } from '../lib/l01'
import { sci } from '../lib/plot'

// 三个浮点小实验：都在你的浏览器里用双精度真实计算
const tab = ref<'eq' | 'sum' | 'soft'>('eq')

// ① 0.3 * 3 + 0.1 == 1 ?
const x = 0.3 * 3 + 0.1

// ② 反复累加 0.1：朴素求和 vs Kahan 补偿求和
const logN = ref(5)
const n = computed(() => Math.round(10 ** logN.value))
const sums = computed(() => {
  let s = 0
  for (let i = 0; i < n.value; i++) s += 0.1
  const exact = n.value / 10
  const k = kahanSum({ [Symbol.iterator]: function* () { for (let i = 0; i < n.value; i++) yield 0.1 } })
  return { naive: s, kahan: k, exact, en: Math.abs(s - exact) / exact, ek: Math.abs(k - exact) / exact }
})

// ③ softmax：直接算 vs 先减最大值
const zText = ref('1000, 999, 998')
const z = computed(() => zText.value.split(/[,\s，]+/).map(Number).filter(v => Number.isFinite(v)))
const naive = computed(() => z.value.length ? softmaxNaive(z.value) : [])
const stable = computed(() => z.value.length ? softmaxStable(z.value) : [])
const show = (v: number) => Number.isNaN(v) ? 'NaN' : v.toPrecision(6)
</script>

<template>
  <Widget title="浮点小实验：在你的浏览器里用 binary64 真算">
    <div class="ctrl">
      <div class="seg">
        <button :class="{ on: tab === 'eq' }" @click="tab = 'eq'">0.3×3+0.1 = 1 ?</button>
        <button :class="{ on: tab === 'sum' }" @click="tab = 'sum'">累加误差与 Kahan</button>
        <button :class="{ on: tab === 'soft' }" @click="tab = 'soft'">Softmax 溢出</button>
      </div>
    </div>

    <template v-if="tab === 'eq'">
      <p class="widget-note">JavaScript 的 number 就是 IEEE 754 双精度，和课件里 C++ 的 double 一样。</p>
      <div class="stats">
        <div class="stat"><b style="font-family:var(--vp-font-family-mono)">{{ x.toPrecision(17) }}</b><span>x = 0.3*3+0.1（显示 17 位）</span></div>
        <div class="stat"><b :class="x === 1 ? 'ok-c' : 'bad-c'">{{ x === 1 ? 'Equal' : 'Not equal' }}</b><span>x == 1.0 ?</span></div>
        <div class="stat"><b>{{ sci(Math.abs(x - 1)) }}</b><span>|x − 1|</span></div>
        <div class="stat"><b>{{ sci(Number.EPSILON / 2) }}</b><span>单位舍入 u = 2⁻⁵³</span></div>
      </div>
      <p class="widget-note">0.3 和 0.1 在二进制里都是无限循环小数，存进去时就各有一次舍入；乘法、加法又各舍入一次。|x − 1| 恰好是 1 以下相邻两个双精度数的间距 2⁻⁵³。</p>
    </template>

    <template v-else-if="tab === 'sum'">
      <div class="ctrl">
        <label>累加次数 n = <b>{{ n.toLocaleString() }}</b><input v-model.number="logN" type="range" min="1" max="7" step="0.5"></label>
      </div>
      <table class="mini-table">
        <thead><tr><th>方法</th><th>结果</th><th>相对误差</th></tr></thead>
        <tbody>
          <tr><td>精确值 n/10</td><td style="font-family:var(--vp-font-family-mono)">{{ sums.exact }}</td><td>—</td></tr>
          <tr><td>朴素求和 s += 0.1</td><td style="font-family:var(--vp-font-family-mono)">{{ sums.naive.toPrecision(17) }}</td><td class="bad-c">{{ sci(sums.en) }}</td></tr>
          <tr class="best"><td>Kahan 补偿求和</td><td style="font-family:var(--vp-font-family-mono)">{{ sums.kahan.toPrecision(17) }}</td><td>{{ sci(sums.ek) }}</td></tr>
        </tbody>
      </table>
      <p class="widget-note">朴素求和的误差随 n 增长；Kahan 把每一步被舍掉的低位存进补偿量 c，下一步再加回去，误差基本不随 n 增长（剩下的主要是 0.1 本身的表示误差）。</p>
    </template>

    <template v-else>
      <div class="ctrl"><label>z = <input v-model="zText" type="text" style="width:240px"></label></div>
      <table class="mini-table">
        <thead><tr><th>i</th><th>z<sub>i</sub></th><th>直接算 e<sup>z<sub>i</sub></sup>/Σe<sup>z<sub>j</sub></sup></th><th>先减 m = max z</th></tr></thead>
        <tbody>
          <tr v-for="(v, i) in z" :key="i">
            <td>{{ i + 1 }}</td><td>{{ v }}</td>
            <td :class="Number.isNaN(naive[i]) ? 'bad-c' : ''">{{ show(naive[i]) }}</td>
            <td>{{ show(stable[i]) }}</td>
          </tr>
        </tbody>
      </table>
      <p class="widget-note">e<sup>1000</sup> 超过双精度上限（约 1.8×10³⁰⁸）变成 Infinity，Infinity/Infinity 得到 NaN。平移后指数只有 0、−1、−2。试试把 z 改成 1, 2, 3：两列完全一样。</p>
    </template>
  </Widget>
</template>
