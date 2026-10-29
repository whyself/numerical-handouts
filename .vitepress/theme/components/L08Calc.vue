<script setup lang="ts">
import { ref, computed } from 'vue'
import { fullSVD, symEig, mul, transpose, sub, fro, eye, lowRank, svd, norm2, pinv, rankOf, parseMatrix, type Mat } from '../lib/l08'
import { fix, sci } from '../lib/plot'

// SVD 计算器：输入任意小矩阵，单边 Jacobi 求 SVD，再逐项核对课件里的结论
const PRESETS = [
  { name: 'P15 的 3×2 例子', src: '0 2\n1 0\n0 0' },
  { name: 'P12 的宽矩阵 (2 0)', src: '2 0' },
  { name: 'P27：σ = 5, 2, 1', src: '5/3 4/3 2/3\n10/3 2/3 -2/3\n10/3 -4/3 1/3' },
  { name: '秩亏 3×3', src: '1 2 3\n4 5 6\n7 8 9' },
  { name: '接近奇异 2×2', src: '1 1\n1 1.0001' }
]
const src = ref(PRESETS[0].src)
const parsed = computed(() => parseMatrix(src.value))
const err = computed(() => (typeof parsed.value === 'string' ? parsed.value : ''))
const A = computed<Mat | null>(() => (typeof parsed.value === 'string' ? null : parsed.value))

const res = computed(() => {
  const M = A.value
  if (!M) return null
  const m = M.length, n = M[0].length
  const F = fullSVD(M), r = rankOf(F.s, m, n)
  const recon = fro(sub(M, mul(mul(F.U, F.S), transpose(F.V))))
  const orthU = fro(sub(mul(transpose(F.U), F.U), eye(m)))
  const orthV = fro(sub(mul(transpose(F.V), F.V), eye(n)))
  const eAtA = symEig(mul(transpose(M), M)).vals.map(v => (Math.abs(v) < 1e-12 * (fro(M) ** 2 + 1e-300) ? 0 : v))
  const eAAt = symEig(mul(M, transpose(M))).vals.map(v => (Math.abs(v) < 1e-12 * (fro(M) ** 2 + 1e-300) ? 0 : v))
  const d = svd(M)
  const trunc = [] as { k: number; e2: number; s2: number; eF: number; sF: number }[]
  for (let k = 1; k < r; k++) {
    const Rk = sub(M, lowRank(d, k))
    trunc.push({ k, e2: norm2(Rk), s2: F.s[k], eF: fro(Rk), sF: Math.sqrt(F.s.slice(k).reduce((a, v) => a + v * v, 0)) })
  }
  return { m, n, F, r, recon, orthU, orthV, eAtA, eAAt, trunc, P: pinv(M), fro: fro(M) }
})
const f = (v: number) => {
  const x = Math.abs(v) < 1e-12 ? 0 : v
  return x !== 0 && Math.abs(x) < 1e-3 ? sci(x, 3) : fix(x, 4)
}
</script>

<template>
  <Widget title="SVD 计算器：分解并逐条核对">
    <div class="ctrl">
      <button v-for="p in PRESETS" :key="p.name" class="btn" @click="src = p.src">{{ p.name }}</button>
    </div>
    <div class="two-col" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:14px;align-items:start">
      <div class="ctrl" style="flex-direction:column;align-items:stretch">
        <label style="display:block">矩阵 A（每行一行，元素用空格分隔，可写 5/3）</label>
        <textarea v-model="src" rows="5" spellcheck="false" style="font-family:var(--vp-font-family-mono);width:100%" />
        <span v-if="err" style="color:var(--warn)">{{ err }}</span>
      </div>
      <div v-if="res">
        <div class="stats">
          <div class="stat"><b>{{ res.m }}×{{ res.n }}</b><span>尺寸</span></div>
          <div class="stat"><b>{{ res.r }}</b><span>秩 r</span></div>
          <div class="stat"><b>{{ f(res.F.s[0] ?? 0) }}</b><span>‖A‖₂ = σ₁</span></div>
          <div class="stat"><b>{{ f(res.fro) }}</b><span>‖A‖<sub>F</sub></span></div>
          <div class="stat"><b>{{ res.r === res.n && res.n <= res.m ? f(res.F.s[0] / res.F.s[res.n - 1]) : '—' }}</b><span>κ₂ = σ₁/σₙ（满列秩时）</span></div>
        </div>
        <p class="widget-note" style="margin:4px 0">奇异值：<b>{{ res.F.s.map(f).join('，') }}</b></p>
      </div>
    </div>
    <template v-if="res">
      <div class="two-col" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;align-items:start;overflow-x:auto">
        <div v-for="blk in [{ n: 'U', M: res.F.U }, { n: 'Σ', M: res.F.S }, { n: 'V', M: res.F.V }]" :key="blk.n">
          <div class="widget-note" style="margin:0 0 4px"><b>{{ blk.n }}</b>（{{ blk.M.length }}×{{ blk.M[0].length }}）</div>
          <table class="mini-table" style="font-variant-numeric:tabular-nums">
            <tbody><tr v-for="(row, i) in blk.M" :key="i"><td v-for="(v, j) in row" :key="j">{{ f(v) }}</td></tr></tbody>
          </table>
        </div>
      </div>
      <p class="widget-note">核对：‖A − UΣVᵀ‖<sub>F</sub> = {{ sci(res.recon) }}，‖UᵀU − I‖<sub>F</sub> = {{ sci(res.orthU) }}，‖VᵀV − I‖<sub>F</sub> = {{ sci(res.orthV) }}。奇异向量只确定到正负号（这里约定 v<sub>i</sub> 绝对值最大的分量为正）；σ = 0 对应的 u、v 由正交补扩充得到，不唯一。</p>
      <table class="mini-table" style="font-variant-numeric:tabular-nums">
        <thead><tr><th>AᵀA 的特征值（{{ res.n }} 个）</th><th>AAᵀ 的特征值（{{ res.m }} 个）</th><th>σ<sub>i</sub>²</th></tr></thead>
        <tbody>
          <tr v-for="i in Math.max(res.m, res.n)" :key="i">
            <td>{{ i <= res.n ? f(res.eAtA[i - 1]) : '' }}</td><td>{{ i <= res.m ? f(res.eAAt[i - 1]) : '' }}</td><td>{{ i <= res.F.s.length ? f(res.F.s[i - 1] ** 2) : '' }}</td>
          </tr>
        </tbody>
      </table>
      <p class="widget-note">两个矩阵各自用 Jacobi 方法独立求特征值：非零的部分完全相同（P8–9），多出来的全是 0。</p>
      <template v-if="res.trunc.length">
        <table class="mini-table" style="font-variant-numeric:tabular-nums">
          <thead><tr><th>k</th><th>‖A − A<sub>k</sub>‖₂（直接算）</th><th>σ<sub>k+1</sub></th><th>‖A − A<sub>k</sub>‖<sub>F</sub>（直接算）</th><th>√(σ<sub>k+1</sub>² + … + σ<sub>r</sub>²)</th></tr></thead>
          <tbody><tr v-for="t in res.trunc" :key="t.k"><td>{{ t.k }}</td><td>{{ f(t.e2) }}</td><td>{{ f(t.s2) }}</td><td>{{ f(t.eF) }}</td><td>{{ f(t.sF) }}</td></tr></tbody>
        </table>
      </template>
      <div class="widget-note" style="margin:8px 0 4px"><b>伪逆 A⁺ = VΣ⁺Uᵀ</b>（{{ res.n }}×{{ res.m }}）</div>
      <table class="mini-table" style="font-variant-numeric:tabular-nums">
        <tbody><tr v-for="(row, i) in res.P" :key="i"><td v-for="(v, j) in row" :key="j">{{ f(v) }}</td></tr></tbody>
      </table>
    </template>
  </Widget>
</template>
