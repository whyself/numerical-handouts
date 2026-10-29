<script setup lang="ts">
defineProps<{ items: string[] }>()
</script>

<template>
  <div class="chips"><span v-for="c in items" :key="c" class="chip">{{ c }}</span></div>
</template>
