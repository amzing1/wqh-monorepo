<template>
  <div
    id="label-select"
    class="custom-scrollbar w-full space-y-2 p-4 overflow-auto"
    :style="{
      maxHeight: maxHalfHeight
        ? 'calc((100vh - 44px) / 2)'
        : 'calc(100vh - 44px)'
    }"
  >
    <h1>选择 Label</h1>
    <LabelItem
      v-for="(label, idx) in labels"
      :key="idx"
      v-bind="{ ...label }"
      @click="$emit('onClick', idx)"
      @on-click-lock="$emit('onClickLock', idx)"
      @on-click-toggle="$emit('onClickToggle', idx)"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { LabelItemProps } from '../../types/type';
import LabelItem from './LabelItem.vue';

const emits = defineEmits<{
  (e: 'onClick', idx: number): void;
  (e: 'onClickLock', idx: number): void;
  (e: 'onClickToggle', idx: number): void;
}>();

const props = defineProps<{
  labels: LabelItemProps[];
  maxHalfHeight: boolean;
}>();

onMounted(() => {
  document.addEventListener('keydown', (e) => {
    const labelIdx = props.labels.findIndex(
      (v) => v.shortcut.toUpperCase() === e.key.toUpperCase()
    );
    if (labelIdx >= 0) {
      emits('onClick', labelIdx);
    }
  });
});
</script>
