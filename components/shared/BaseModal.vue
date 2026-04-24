<script setup lang="ts">
defineProps<{ title?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }>()
const emit = defineEmits<{ (e: 'close'): void }>()
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" @click.self="emit('close')">
      <div
        class="bg-bg border border-border rounded-card shadow-card w-full max-h-[90vh] overflow-y-auto"
        :class="{
          'max-w-sm': size === 'sm',
          'max-w-lg': !size || size === 'md',
          'max-w-2xl': size === 'lg',
          'max-w-4xl': size === 'xl',
        }"
      >
        <div v-if="title" class="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 class="font-serif text-lg">{{ title }}</h3>
          <button class="text-text-light hover:text-text text-xl leading-none" @click="emit('close')">×</button>
        </div>
        <div class="p-6">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
