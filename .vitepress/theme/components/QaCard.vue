<script setup lang="ts">
import { ref, watch } from 'vue'
import { qaState } from '../lib/store'

// 先想再看：答案默认模糊，点开后显示
const shown = ref(false)
watch(() => qaState.version, () => { shown.value = qaState.revealed })
</script>

<template>
  <div class="qa" :class="{ hidden: !shown }">
    <div class="q"><div><slot name="q" /></div></div>
    <div class="a"><slot /></div>
    <div v-if="!shown" class="qa-reveal"><button type="button" @click="shown = true">先想一想，再点开答案</button></div>
  </div>
</template>

<style scoped>
.qa { background: var(--paper); border: 1px solid var(--line); border-radius: 10px; margin: 16px 0; overflow: hidden; }
.q { padding: 10px 16px; font-weight: 600; display: flex; gap: 10px; line-height: 1.7; }
.q::before { content: "Q"; flex: none; width: 22px; height: 22px; border-radius: 6px; background: var(--accent); color: #fff; font: 700 12px/22px var(--vp-font-family-base); text-align: center; margin-top: 3px; }
.a { border-top: 1px dashed var(--line); padding: 10px 16px 10px 48px; position: relative; }
.a::before { content: "A"; position: absolute; left: 16px; top: 14px; width: 22px; height: 22px; border-radius: 6px; background: var(--ex); color: #fff; font: 700 12px/22px var(--vp-font-family-base); text-align: center; }
.a :deep(> :first-child) { margin-top: 0; }
.a :deep(> :last-child) { margin-bottom: 0; }
.qa.hidden .a { filter: blur(6px); user-select: none; pointer-events: none; max-height: 110px; overflow: hidden; }
.qa-reveal { display: flex; justify-content: center; padding: 8px; border-top: 1px dashed var(--line); background: var(--bg2); }
.qa-reveal button { border: 0; background: var(--accent); color: #fff; padding: 4px 16px; border-radius: 99px; cursor: pointer; font: 600 13px var(--vp-font-family-base); }
</style>
