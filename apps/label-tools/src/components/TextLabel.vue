<template>
  <div
    class="grid grid-cols-[1fr_220px] grid-rows-[44px_1fr] w-screen h-screen select-none"
  >
    <div class="col-start-1 col-end-3 bg-action-bar">
      <NormalActionBar
        @get-result="getRes"
        @clear-all-labels="deleteAllLabels"
      />
    </div>
    <div class="col-start-1 col-end-2">
      <TextContent ref="textContentRef" />
    </div>
    <div class="bg-siderbar-bg border-l border-border border-solid">
      <LabelSelect
        :labels="labelCates"
        :max-half-height="false"
        @on-click="onClickSelectItem"
        @on-click-lock="lockLabel($event, true)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';
import { useInfoStore } from '../store/infoStore';
import { useTextLabelData } from '../store/label-data/textLabelData';
import type { LabelItemProps } from '../types/type';
import { Fn } from '../types/util';
import LabelSelect from './common/LabelSelect.vue';
import NormalActionBar from './common/NormalActionBar.vue';
import TextContent from './text-label/TextContent.vue';

const { taskMeta, lockLabel } = useInfoStore();
const { toggleClassifyData, getResult, clearAllLabels } = useTextLabelData();
const { classifyData } = storeToRefs(useTextLabelData());

const textContentRef = ref<InstanceType<typeof TextContent>>();

const labelCates = computed(() => {
  return taskMeta.labels.map(
    (v) =>
      ({
        shortcut: v.shortcut,
        name: v.name,
        color: v.color,
        showLockIcon: taskMeta.type === 5,
        showToggleIcon: false,
        isSelected:
          taskMeta.type === 5 ? v.lock : classifyData.value.includes(v.id),
        canChoose: taskMeta.type === 4,
        chooseMulti: taskMeta.type === 4 && taskMeta.canMulti
      }) as LabelItemProps
  );
});

function onClickSelectItem(idx: number) {
  if (taskMeta.type === 4) {
    toggleClassifyData(idx);
  } else {
    textContentRef.value?.createRecognitionAnnotation(taskMeta.labels[idx]);
  }
}

function getRes(cb: Fn) {
  const res = getResult();
  cb(res);
}

function deleteAllLabels() {
  clearAllLabels();
  textContentRef.value?.deleteAllLabels();
}
</script>
