<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { lightbox } from '../lib/store'

const close = () => { lightbox.open = false }
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
onMounted(() => addEventListener('keydown', onKey))
onUnmounted(() => removeEventListener('keydown', onKey))
</script>

<template>
  <div v-if="lightbox.open" class="lightbox" @click="close">
    <img :src="lightbox.src" alt="">
    <div>{{ lightbox.cap }}</div>
  </div>
</template>

<style scoped>
.lightbox { position: fixed; inset: 0; background: rgba(15, 12, 10, .88); z-index: 200; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 24px; cursor: zoom-out; }
.lightbox img { max-width: 96vw; max-height: 86vh; border-radius: 8px; background: #fff; }
.lightbox div { color: #ddd; font-size: 14px; text-align: center; }
</style>
