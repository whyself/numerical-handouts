<script setup lang="ts">
import { qaState } from '../lib/store'

function toggle() {
  qaState.revealed = !qaState.revealed
  qaState.version++
}
</script>

<template>
  <button class="btn" type="button" @click="toggle">{{ qaState.revealed ? '收起全部答案' : '展开全部答案' }}</button>
</template>
