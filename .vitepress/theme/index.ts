import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import Layout from './Layout.vue'
import './custom.css'

// components/ 下的所有组件全局注册，Markdown 里可直接使用
const modules = import.meta.glob('./components/*.vue', { eager: true }) as Record<string, any>

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    for (const path in modules) {
      const name = path.split('/').pop()!.replace('.vue', '')
      app.component(name, modules[path].default)
    }
  }
} satisfies Theme
