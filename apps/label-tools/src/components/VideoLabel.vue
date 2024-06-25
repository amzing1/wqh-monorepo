<template>
  <div
    class="grid grid-cols-[1fr_220px] grid-rows-[44px_1fr_270px] w-screen h-screen select-none"
  >
    <div class="col-start-1 col-end-3 bg-action-bar">
      <NormalActionBar
        :fps="videoMeta.frameRate"
        :has-label-changed="historyStack.cancelStack.length > 0"
        @clear-all-labels="clearAllLabels"
        @get-result="getRes"
      />
    </div>
    <div class="col-start-1 col-end-2 row-start-2 row-end-3">
      <VideoContent />
    </div>
    <div
      class="col-start-2 col-end-3 row-start-2 row-end-4 overflow-hidden bg-siderbar-bg border-l border-solid border-border"
    >
      <LabelSelect
        :labels="labelCates"
        :max-half-height="[7, 8].includes(taskMeta.type)"
        @on-click="
          [7, 8].includes(taskMeta.type)
            ? lockLabel($event)
            : addClassifyAnnotationByTempClip($event)
        "
      />
      <template v-if="taskMeta.type !== 6">
        <div class="w-full h-[1px] bg-divider"></div>
        <LabelLayer
          :layers="layers"
          :cur-cate-idx="curCateIdx"
          :cur-item-idx="curItemIdx"
          @on-click="selectAnno"
          @toggle-visible="toggleVisible"
          @delete-item="deleteAnno"
          @revert-key-points="revertKeyPoints"
        ></LabelLayer>
      </template>
    </div>
    <div class="col-start-1 col-end-2 row-start-3 row-end-4 overflow-hidden">
      <VideoLabelController />
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useInfoStore } from '../store/infoStore';
import { useVideoLabelData } from '../store/label-data/videoLabelData';
import { useVideoStore } from '../store/videoStore';
import { LabelItemProps, LabelLayerProps } from '../types/type';
import { Fn } from '../types/util';
import { modalConfirm } from '../utils/utils';
import LabelLayer from './common/LabelLayer.vue';
import LabelSelect from './common/LabelSelect.vue';
import NormalActionBar from './common/NormalActionBar.vue';
import VideoContent from './video-label/VideoContent.vue';
import VideoLabelController from './video-label/VideoLabelController.vue';

const { lockLabel, taskMeta } = useInfoStore();
const { videoMeta } = useVideoStore();
const { annotationsMap, curAnno, classifyData } = storeToRefs(
  useVideoLabelData()
);
const {
  deleteAnnotation,
  clearAllLabels,
  getResult,
  showAllKeyPoints,
  addClassifyAnnotation,
  historyStack
} = useVideoLabelData();

const labelCates = computed(() => {
  return taskMeta.labels.map(
    (v) =>
      ({
        shortcut: v.shortcut,
        name: v.name,
        color: v.color,
        showLockIcon: false,
        showToggleIcon: false,
        isSelected: v.lock,
        canChoose: false,
        chooseMulti: false
      }) as LabelItemProps
  );
});
const layers = computed<LabelLayerProps[]>(() => {
  const res: LabelLayerProps[] = [];
  for (const key in annotationsMap.value) {
    res.push({
      name: annotationsMap.value[key][0].name,
      isExpand: true,
      id: key,
      values: annotationsMap.value[key].map((v, i) => ({
        id: i,
        visible: !!v.visible,
        disabelOperate: videoMeta.isPlaying,
        showRevertIcon:
          taskMeta.type === 8 && v.keypoints.some((k) => !k.visible)
      }))
    });
  }
  return res;
});
const curCateIdx = computed(() => {
  if (!curAnno.value) return -1;
  return Object.keys(annotationsMap.value).findIndex(
    (v) => v === curAnno.value!.category_id.toString()
  );
});
const curItemIdx = computed(() => {
  if (!curAnno.value) return -1;
  return annotationsMap.value[curAnno.value.category_id].findIndex(
    (v) => v.id === curAnno.value?.id
  );
});
function getAnnoByLayer(cateIdx: number, itemIdx: number) {
  return annotationsMap.value[Object.keys(annotationsMap.value)[cateIdx]][
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
async function revertKeyPoints(cateIdx: number, itemIdx: number) {
  const confirm = await modalConfirm('恢复默认', '是否恢复默认 skeleton 结构');
  if (!confirm) {
    return;
  }
  const anno = getAnnoByLayer(cateIdx, itemIdx);
  curAnno.value = anno;
  showAllKeyPoints();
}
function getRes(cb: Fn) {
  const res = getResult();
  cb(res);
}
function addClassifyAnnotationByTempClip(idx: number) {
  console.log(idx);
  const clip = classifyData.value.clips[0];
  if (!clip || !clip.isTemp) {
    return;
  }
  addClassifyAnnotation(clip.start_frame, clip.end_frame, idx);
}
</script>
