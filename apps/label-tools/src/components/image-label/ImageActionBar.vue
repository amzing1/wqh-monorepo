<template>
  <div
    class="image-action-bar fixed right-[244px] bottom-8 bg-white px-5 py-3 rounded-[24px] space-x-3"
  >
    <a
      class="hover:text-primary-main"
      :class="{
        disabled: historyStack.cancelStack.length === 0
      }"
      @click="undo"
      ><i class="iconfont icon-chexiao"></i
    ></a>
    <a
      class="hover:text-primary-main"
      :class="{
        disabled: historyStack.redoStack.length === 0
      }"
      @click="redo"
      ><i class="iconfont icon-qianjin"></i
    ></a>
    <a
      class="text-red-500 hover:text-red-600"
      :class="{
        disabled: !curAnno
      }"
      @click="deleteAnnotation()"
      ><i class="iconfont icon-guanbi"></i
    ></a>
    <div class="inline-block h-4 w-[1px] bg-divider relative top-[2px]"></div>

    <a class="hover:text-primary-main" @click="zoom(1)"
      ><i class="iconfont icon-a-zoomin"></i
    ></a>
    <a class="hover:text-primary-main" @click="zoom(-1)"
      ><i class="iconfont icon-a-zoomout"></i
    ></a>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useImageStore } from '../../store/imageStore';
import { useImageLabelData } from '../../store/label-data/imageLabelData';

const { historyStack, undo, redo, deleteAnnotation } = useImageLabelData();
const { curAnno } = storeToRefs(useImageLabelData());
const { zoom } = useImageStore();
</script>

<style lang="scss">
.image-action-bar {
  a > i {
    font-size: 18px;
  }
  a.disabled {
    color: $disabled;
    cursor: not-allowed;
    pointer-events: none;
    &:hover {
      color: inherit !important;
      cursor: not-allowed !important;
    }
  }
  box-shadow:
    0 3px 14px 2px #0000000d,
    0 8px 10px 1px #0000000f,
    0 5px 5px -3px #0000001a;
}
</style>
