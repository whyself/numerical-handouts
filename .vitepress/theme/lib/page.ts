// 课件页码标签：P12 = 普通版第 12 页；A12 = AI 扩充版第 12 页（显示为 AI·P12）
export const pageLabel = (p: string) => p.startsWith('A') ? `AI·P${p.slice(1)}` : `P${p.replace(/^P/, '')}`
