<script setup lang="ts">
// 多图并排；tall 为较高的图
defineProps<{ tall?: boolean }>()
</script>

<template>
  <div class="fig-grid" :class="{ tall }"><slot /></div>
</template>

<style scoped>
.fig-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin: 20px 0; }
.fig-grid :deep(.fig) { margin: 0; display: flex; flex-direction: column; justify-content: flex-end; }
.fig-grid :deep(.fig img) { width: 100%; height: 180px; object-fit: contain; }
.fig-grid.tall :deep(.fig img) { height: 260px; }
@media (max-width: 640px) {
  .fig-grid { grid-template-columns: 1fr; }
  .fig-grid :deep(.fig img) { height: auto; max-height: 240px; }
}
</style>
