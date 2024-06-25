<template>
  <div
    class="label-select-item flex-center w-full h-9 border-l-4 border-solid outline-1 outline outline-border rounded-[3px] px-3 bg-white cursor-pointer hover:bg-primary-1 hover:outline-primary-main"
    :style="{
      'border-color': canChoose ? 'transparent' : color
    }"
    :class="{ active: isSelected }"
  >
    <template v-if="canChoose">
      <input
        v-if="chooseMulti"
        :checked="isSelected"
        type="checkbox"
        class="accent-primary-main cursor-pointer"
      />
      <input
        v-else
        :checked="isSelected"
        type="radio"
        class="accent-primary-main cursor-pointer"
      />
    </template>
    <div class="single-line-text ml-1.5 flex-1">{{ name }}</div>
    <div class="mr-2 text-secondary-text-light">{{ shortcut }}</div>
    <a v-if="showLockIcon" class="text-common">
      <i
        v-if="isSelected"
        class="iconfont icon-simi1"
        @click.stop="$emit('onClickLock')"
      ></i>
      <i
        v-else
        class="iconfont icon-gongkai1"
        @click.stop="$emit('onClickLock')"
      ></i>
    </a>
    <a v-if="showToggleIcon" class="text-common">
      <i class="iconfont icon-qiehuan" @click="$emit('onClickToggle')"></i>
    </a>
  </div>
</template>

<script setup lang="ts">
import { LabelItemProps } from '../../types/type';

defineProps<LabelItemProps>();
defineEmits<{
  (e: 'onClickLock'): void;
  (e: 'onClickToggle'): void;
}>();
</script>

<style lang="scss">
.label-select-item.active {
  background-color: $primary-1;
  outline-color: $primary-main;
}
</style>
