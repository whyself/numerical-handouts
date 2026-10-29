import { reactive } from 'vue'

// 图片放大
export const lightbox = reactive({ open: false, src: '', cap: '' })

// “展开全部答案”：每次切换让 version 变化，各 QaCard 跟随
export const qaState = reactive({ version: 0, revealed: false })
