<template>
  <div
    class="custom-scrollbar w-full p-4 overflow-auto"
    :style="{
      maxHeight: maxHeight
    }"
  >
    <h1 class="mb-2">图层</h1>
    <div v-for="(cate, idx) in layers" :key="idx">
      <div class="flex-center h-6 mb-2">
        <a
          v-if="expands[cate.name]"
          class="text-common mr-1.5"
          @click="toggleExpand(cate.name)"
        >
          <i class="iconfont icon-xiala"></i>
        </a>
        <a
          v-else
          class="text-common mr-1.5 inline-block -rotate-90"
          @click="toggleExpand(cate.name)"
        >
          <i class="iconfont icon-xiala"></i>
        </a>
        <span class="single-line-text max-w-[150px]">{{ cate.name }}</span>
      </div>
      <template v-if="expands[cate.name]">
        <div
          v-for="(anno, annoIdx) in cate.values"
          :key="anno.id"
          class="video-detection-anno group single-line-text flex-center justify-between h-6 mb-2 pl-[30px] cursor-pointer hover:bg-divider"
          :class="{ active: curCateIdx === idx && curItemIdx === annoIdx }"
          @click="$emit('onClick', idx, annoIdx)"
        >
          <span class="max-w-[105px] single-line-text">
            <i class="iconfont icon-biaozhuquyu"></i>
            {{ `${cate.name}(${annoIdx + 1})` }}
          </span>
          <span>
            <Tooltip content="恢复初始" placement="bottom-end">
              <i
                v-if="anno.showRevertIcon"
                class="iconfont icon-huifu mr-1.5 hidden text-sub-color group-hover:inline-block hover:text-primary-main"
                :class="{ disabled: anno.disabelOperate }"
                @click="$emit('revertKeyPoints', idx, annoIdx)"
              ></i>
            </Tooltip>
            <Tooltip content="删除 Label" placement="bottom-end">
              <i
                class="iconfont icon-shanchu mr-1.5 hidden text-sub-color group-hover:inline-block hover:text-primary-main"
                :class="{ disabled: anno.disabelOperate }"
                @click.stop="$emit('deleteItem', idx, annoIdx)"
              ></i>
            </Tooltip>
            <Tooltip
              v-if="anno.visible"
              content="隐藏 Label"
              placement="bottom-end"
              transfer
            >
              <i
                class="iconfont icon-yincang hidden text-sub-color group-hover:inline-block hover:text-primary-main"
                :class="{ disabled: anno.disabelOperate }"
                @click.stop="$emit('toggleVisible', idx, annoIdx)"
              ></i>
            </Tooltip>
            <Tooltip v-else content="显示 Label" placement="bottom-end"
              ><i
                class="iconfont icon-gongkai hidden text-sub-color group-hover:inline-block hover:text-primary-main"
                :class="{ disabled: anno.disabelOperate }"
                @click.stop="$emit('toggleVisible', idx, annoIdx)"
              ></i
            ></Tooltip>
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Tooltip } from 'heywhale-ui';
import { onMounted, reactive, ref, watch } from 'vue';
import type { LabelLayerProps } from '../../types/type';

const maxHeight = ref<string>('100vh');
const expands = reactive<Record<string, boolean>>({});

const props = defineProps<{
  layers: LabelLayerProps[];
  curCateIdx: number;
  curItemIdx: number;
}>();
defineEmits<{
  (e: 'onClick', cateIdx: number, itemIdx: number): void;
  (e: 'toggleVisible', cateIdx: number, itemIdx: number): void;
  (e: 'deleteItem', cateIdx: number, itemIdx: number): void;
  (e: 'revertKeyPoints', cateIdx: number, itemIdx: number): void;
}>();
watch(
  () => props.layers,
  () => {
    props.layers.forEach((v) => {
      if (expands[v.name] === undefined) {
        expands[v.name] = true;
      }
    });
  }
);
onMounted(() => {
  setTimeout(() => {
    const labelSelectEl = document.querySelector(
      '#label-select'
    ) as HTMLElement;
    maxHeight.value = `calc(100vh - 44px - ${labelSelectEl.offsetHeight}px)`;
  }, 3000);
});
function toggleExpand(name: string) {
  expands[name] = !expands[name];
}
</script>

<style lang="scss">
.video-detection-anno.active {
  background-color: $divider;
  i {
    display: inline-block;
  }
  i.disabled {
    color: $disabled;
    &:hover {
      color: $disabled;
      cursor: not-allowed;
    }
  }
}
</style>
