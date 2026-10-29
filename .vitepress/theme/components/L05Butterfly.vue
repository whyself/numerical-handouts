<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { fftStages, dftNaive, cx, cstr, cabs, csub } from '../lib/l05'
import { sci } from '../lib/plot'

// 蝶形图逐层动画：输入按位反序排好，每一层把相邻两块（E 与 O）用 N/2 个蝶形合并
const N = ref(8)
const PRESETS: Record<number, { name: string; v: string }[]> = {
  4: [{ name: '(1, 1, 1, 1)', v: '1, 1, 1, 1' }, { name: '(1, 2, 3, 4)', v: '1, 2, 3, 4' }, { name: '(1, 0, 0, 0)', v: '1, 0, 0, 0' }],
  8: [{ name: '全 1', v: '1, 1, 1, 1, 1, 1, 1, 1' }, { name: 'a_j = j', v: '0, 1, 2, 3, 4, 5, 6, 7' }, { name: '(1, −1, 1, −1, …)', v: '1, -1, 1, -1, 1, -1, 1, -1' }, { name: '单个脉冲', v: '0, 1, 0, 0, 0, 0, 0, 0' }]
}
const text = ref(PRESETS[8][1].v)
const shown = ref(0)
watch(N, n => { text.value = PRESETS[n][0].v; shown.value = 0 })
watch(text, () => { shown.value = 0 })

const a = computed(() => {
  const v = text.value.split(/[,\s，]+/).filter(s => s !== '').map(Number).map(x => (Number.isFinite(x) ? x : 0))
  return Array.from({ length: N.value }, (_, j) => cx(v[j] ?? 0))
})
const bits = computed(() => Math.round(Math.log2(N.value)))
const st = computed(() => fftStages(a.value))
const direct = computed(() => dftNaive(a.value))
const maxDiff = computed(() => Math.max(...st.value.layers[bits.value].map((z, k) => cabs(csub(z, direct.value[k])))))

const W = 680, BW = 124, BH = 26, TOP = 46, GAP = 38
const H = computed(() => TOP + N.value * GAP + 6)
const colX = (s: number) => 8 + s * ((W - BW - 16) / bits.value)
const rowY = (i: number) => TOP + i * GAP
const SUB = '₀₁₂₃₄₅₆₇₈₉'
const sub = (n: number) => String(n).replace(/\d/g, d => SUB[+d])
const flies = computed(() => st.value.flies)
const curFlies = computed(() => (shown.value > 0 ? flies.value[shown.value - 1] : []))
</script>

<template>
  <Widget title="FFT 蝶形图：逐层合并（课件约定 ω<sub>N</sub> = e<sup>2πi/N</sup>）">
    <div class="ctrl">
      <div class="seg">
        <button :class="{ on: N === 4 }" @click="N = 4">N = 4</button>
        <button :class="{ on: N === 8 }" @click="N = 8">N = 8</button>
      </div>
      <div class="seg">
        <button v-for="p in PRESETS[N]" :key="p.v" :class="{ on: text === p.v }" @click="text = p.v">{{ p.name }}</button>
      </div>
    </div>
    <div class="ctrl">
      <label>a = <input v-model="text" type="text" style="width:260px"></label>
      <button class="btn" @click="shown = Math.max(0, shown - 1)">◂</button>
      <button class="btn primary" @click="shown = Math.min(shown + 1, bits)">合并一层 ▸</button>
      <button class="btn" @click="shown = 0">⟲</button>
      <span class="muted" style="font-size:13px">已完成 {{ shown }} / {{ bits }} 层</span>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto">
      <!-- 每一列按块分组：第 s 列的每一块是某个子序列的 2^s 点 DFT -->
      <g v-for="s in bits + 1" :key="'blk' + s">
        <rect v-for="b in N >> (s - 1)" :key="b" :x="colX(s - 1) - 4" :y="rowY((b - 1) << (s - 1)) - 4" :width="BW + 8" :height="((1 << (s - 1)) - 1) * GAP + BH + 8" rx="8"
          :style="{ fill: s - 1 <= shown ? 'var(--accent-soft)' : 'none', stroke: 'var(--line)', opacity: s - 1 <= shown ? 0.55 : 0.4 }" />
        <text :x="colX(s - 1) + BW / 2" y="16" font-size="12" text-anchor="middle" style="fill:var(--ink-2);font-weight:700">{{ s === 1 ? '输入（按位反序）' : s - 1 === bits ? `输出 â（${N} 点 DFT）` : `${1 << (s - 1)} 点 DFT × ${N >> (s - 1)}` }}</text>
      </g>
      <!-- 边 -->
      <g v-for="(fs, si) in flies" :key="'st' + si" :style="{ opacity: si < shown ? (si === shown - 1 ? 1 : 0.35) : 0.12 }">
        <g v-for="f in fs" :key="f.top">
          <line :x1="colX(si) + BW" :y1="rowY(f.top) + BH / 2" :x2="colX(si + 1)" :y2="rowY(f.top) + BH / 2" style="stroke:var(--ink-2);stroke-width:1.3" />
          <line :x1="colX(si) + BW" :y1="rowY(f.top) + BH / 2" :x2="colX(si + 1)" :y2="rowY(f.bot) + BH / 2" style="stroke:var(--ink-2);stroke-width:1.3" />
          <line :x1="colX(si) + BW" :y1="rowY(f.bot) + BH / 2" :x2="colX(si + 1)" :y2="rowY(f.top) + BH / 2" style="stroke:var(--ex);stroke-width:1.3" />
          <line :x1="colX(si) + BW" :y1="rowY(f.bot) + BH / 2" :x2="colX(si + 1)" :y2="rowY(f.bot) + BH / 2" style="stroke:var(--ex);stroke-width:1.3" stroke-dasharray="4 3" />
          <text v-if="si === shown - 1" :x="colX(si) + BW + 4" :y="rowY(f.bot) + BH / 2 + 13" font-size="10.5" style="fill:var(--ex)">×ω{{ sub(f.len) }}<tspan baseline-shift="super" font-size="8">{{ f.k }}</tspan></text>
        </g>
      </g>
      <!-- 结点 -->
      <g v-for="(layer, s) in st.layers" :key="'L' + s">
        <g v-for="(z, i) in layer" :key="i">
          <rect :x="colX(s)" :y="rowY(i)" :width="BW" :height="BH" rx="5"
            :style="{ fill: 'var(--vp-c-bg)', stroke: s === shown && s > 0 && curFlies.length ? 'var(--accent)' : 'var(--line)', strokeWidth: s === shown && s > 0 ? 1.8 : 1 }" />
          <text :x="colX(s) + BW / 2" :y="rowY(i) + 17" font-size="12" text-anchor="middle" style="fill:var(--ink);font-family:var(--vp-font-family-mono)">{{ s <= shown ? cstr(z, 2) : '?' }}</text>
          <text v-if="s === 0" :x="colX(0) + 4" :y="rowY(i) - 2" font-size="10" style="fill:var(--ink-3)">a{{ sub(st.order[i]) }}</text>
          <text v-if="s === bits" :x="colX(s) + 4" :y="rowY(i) - 2" font-size="10" style="fill:var(--ink-3)">â{{ sub(i) }}</text>
        </g>
      </g>
    </svg>
    <p class="widget-note">黑线把上方的 E<sub>k</sub> 原样送到两个输出；绿线把下方的 O<sub>k</sub> 乘上 ω<sub>len</sub><sup>k</sup> 后加到上方输出（实线）、减到下方输出（虚线）：â<sub>k</sub> = E<sub>k</sub> + ω<sup>k</sup>O<sub>k</sub>，â<sub>k+len/2</sub> = E<sub>k</sub> − ω<sup>k</sup>O<sub>k</sub>。每一列的浅色块是一个子问题：倒数第二列的上下两块正是偶数下标和奇数下标的 {{ N / 2 }} 点 DFT（课件 P23 的 E 和 O）。</p>
    <div class="stats">
      <div class="stat"><b>{{ shown === bits ? sci(maxDiff) : '—' }}</b><span>与直接按定义求和的最大差</span></div>
      <div class="stat"><b>{{ (N / 2) * bits }}</b><span>FFT 的复数乘法：(N/2)·log₂N</span></div>
      <div class="stat"><b>{{ N * N }}</b><span>直接求和的复数乘法：N²</span></div>
    </div>
  </Widget>
</template>
