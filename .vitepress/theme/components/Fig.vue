<script setup lang="ts">
import { pageLabel } from '../lib/page'
import { withBase } from 'vitepress'
import { lightbox } from '../lib/store'

// size: sm / md / full；p 为原课件页码
const props = defineProps<{ src: string; cap?: string; p?: string; size?: string }>()
const url = withBase(props.src)

function open() {
  lightbox.src = url
  lightbox.cap = (props.cap || '').replace(/<[^>]+>/g, '')
  lightbox.open = true
}
</script>

<template>
  <figure class="fig" :class="size">
    <img :src="url" :alt="(cap || '').replace(/<[^>]+>/g, '')" loading="lazy" @click="open">
    <figcaption v-if="cap || p"><span v-html="cap" /><span v-if="p" class="src">{{ pageLabel(p) }}</span></figcaption>
  </figure>
</template>

<style scoped>
.fig { margin: 20px 0; text-align: center; }
.fig img {
  display: inline-block; max-width: 100%; height: auto; border-radius: 8px; border: 1px solid var(--line);
  background: #fff; cursor: zoom-in; transition: box-shadow .2s;
}
.fig img:hover { box-shadow: var(--shadow); }
.fig.sm img { max-width: 340px; width: 100%; }
.fig.md img { max-width: 540px; width: 100%; }
figcaption { font-size: 13.5px; color: var(--ink-3); margin-top: 6px; line-height: 1.6; }
</style>
