<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <div class="widget">
    <div class="widget-h"><span class="badge">交互演示</span><span v-html="title" /></div>
    <div class="widget-b"><slot /></div>
  </div>
</template>
