<script setup lang="ts">
import { pageLabel } from '../lib/page'
// 原课件页码标签；ignore-header 让它不进入右侧目录
defineProps<{ p: string }>()
</script>

<template>
  <span class="src ignore-header">{{ pageLabel(p) }}</span>
</template>
