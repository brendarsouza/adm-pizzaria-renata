import { ref, type Ref } from 'vue'

/**
 * Navegação por teclado genérica para listas/dropdowns.
 * Expõe `indexAtivo`, handlers e flag de listening.
 *
 * Uso típico:
 *   const nav = useKeyboardNav(resultados, (item) => selecionar(item))
 *   @keydown.down.prevent="nav.down()"
 *   @keydown.up.prevent="nav.up()"
 *   @keydown.enter.prevent="nav.enter()"
 */
export function useKeyboardNav<T>(
  items: Ref<T[]>,
  onSelect: (item: T, index: number) => void,
  opts: { wrap?: boolean } = {},
) {
  const wrap = opts.wrap ?? false
  const activeIndex = ref(-1)

  function down() {
    const len = items.value.length
    if (!len) return
    if (activeIndex.value < len - 1) activeIndex.value++
    else if (wrap) activeIndex.value = 0
  }
  function up() {
    const len = items.value.length
    if (!len) return
    if (activeIndex.value > 0) activeIndex.value--
    else if (wrap) activeIndex.value = len - 1
  }
  function enter() {
    if (activeIndex.value >= 0 && activeIndex.value < items.value.length) {
      const item = items.value[activeIndex.value]
      if (item !== undefined) onSelect(item, activeIndex.value)
    }
  }
  function reset() { activeIndex.value = -1 }
  function setActive(i: number) { activeIndex.value = i }

  return { activeIndex, down, up, enter, reset, setActive }
}
