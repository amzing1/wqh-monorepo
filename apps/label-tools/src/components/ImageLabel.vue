<template>
  <div
    class="grid grid-cols-[1fr_220px] grid-rows-[44px_1fr] w-screen h-screen select-none"
  >
    <div class="col-start-1 col-end-3 bg-action-bar">
      <NormalActionBar
        :has-label-changed="historyStack.cancelStack.length > 0"
        :disable-submit="disableSubmit"
        @clear-all-labels="clearAllLabels"
        @get-result="getRes"
      />
    </div>
    <div class="col-start-1 col-end-2 row-start-2 row-end-3">
      <ImageContent />
    </div>
    <div
      class="col-start-2 col-end-3 row-start-2 row-end-4 overflow-hidden bg-siderbar-bg space-y-2 border-l border-solid border-border"
    >
      <LabelSelect
        :labels="labelCates"
        :max-half-height="[1, 2].includes(taskMeta.type)"
        @on-click="onClickLabelSelectItem($event)"
        @on-click-toggle="toggleLabel($event)"
      />
      <template v-if="taskMeta.type !== 3">
        <div class="w-full h-[1px] bg-divider"></div>
        <LabelLayer
          :layers="layers"
          :cur-cate-idx="curCateIdx"
          :cur-item-idx="curItemIdx"
          @on-click="selectAnno"
          @toggle-visible="toggleVisible"
          @delete-item="deleteAnno"
        ></LabelLayer>
      </template>
    </div>
    <ImageActionBar />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useInfoStore } from '../store/infoStore';

import { LabelItemProps, LabelLayerProps } from '../types/type';

import { storeToRefs } from 'pinia';
import { useImageLabelData } from '../store/label-data/imageLabelData';
import { Fn } from '../types/util';
import LabelLayer from './common/LabelLayer.vue';
import LabelSelect from './common/LabelSelect.vue';
import NormalActionBar from './common/NormalActionBar.vue';
import ImageActionBar from './image-label/ImageActionBar.vue';
import ImageContent from './image-label/ImageContent.vue';

const { lockLabel, taskMeta } = useInfoStore();
const {
  historyStack,
  getResult,
  changeClassifyData,
  clearAllLabels,
  deleteAnnotation,
  toggleLabel
} = useImageLabelData();
const { curAnno, classifyData, detectionDataMap } = storeToRefs(
  useImageLabelData()
);

const labelCates = computed(() => {
  return taskMeta.labels.map(
    (v) =>
      ({
        shortcut: v.shortcut,
        name: v.name,
        color: v.color,
        showLockIcon: false,
        showToggleIcon: [1, 2].includes(taskMeta.type),
        isSelected:
          taskMeta.type === 3 ? classifyData.value.includes(v.id) : v.lock,
        canChoose: taskMeta.type === 3,
        chooseMulti: taskMeta.type === 3 && taskMeta.canMulti
      }) as LabelItemProps
  );
});

const disableSubmit = computed(() => {
  return !taskMeta.allowEmpty && classifyData.value.length === 0;
});

function getRes(cb: Fn) {
  const res = getResult();
  cb(res);
}
const layers = computed<LabelLayerProps[]>(() => {
  const res: LabelLayerProps[] = [];
  for (const key in detectionDataMap.value) {
    if (!detectionDataMap.value[key].length) {
      continue;
    }
    res.push({
      name: detectionDataMap.value[key][0].name,
      isExpand: true,
      id: key,
      values: detectionDataMap.value[key].map((v, i) => ({
        id: i,
        visible: !!v.visible
      }))
    });
  }
  return res;
});
const curCateIdx = computed(() => {
  if (!curAnno.value) return -1;
  return Object.keys(detectionDataMap.value).findIndex(
    (v) => v === curAnno.value!.category_id.toString()
  );
});
const curItemIdx = computed(() => {
  if (!curAnno.value) return -1;
  return detectionDataMap.value[curAnno.value.category_id].findIndex(
    (v) => v.id === curAnno.value?.id
  );
});
function getAnnoByLayer(cateIdx: number, itemIdx: number) {
  return detectionDataMap.value[Object.keys(detectionDataMap.value)[cateIdx]][
    itemIdx
  ];
}
function selectAnno(cateIdx: number, itemIdx: number) {
  curAnno.value = getAnnoByLayer(cateIdx, itemIdx);
}
function toggleVisible(cateIdx: number, itemIdx: number) {
  const anno = getAnnoByLayer(cateIdx, itemIdx);
  anno.visible = !anno.visible;
}
function deleteAnno(cateIdx: number, itemIdx: number) {
  const anno = getAnnoByLayer(cateIdx, itemIdx);
  curAnno.value = anno;
  deleteAnnotation();
}
function onClickLabelSelectItem(val: number) {
  if (taskMeta.type === 3) {
    changeClassifyData(taskMeta.labels[val].id);
  } else {
    lockLabel(val);
  }
}
</script>
