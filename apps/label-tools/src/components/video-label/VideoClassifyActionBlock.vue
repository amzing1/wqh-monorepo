<template>
  <div
    v-for="(item, idx) in taskMeta.labels"
    :key="item.id"
    class="relative h-6 border-b border-solid border-divider bg-white cursor-crosshair even:bg-bg"
    :data-id="idx"
    @mousedown="startAnnotate"
  >
    <div
      v-for="clip in getCateClips(item.id)"
      :key="clip.id"
      :data-id="idx"
      class="absolute h-full border border-solid cursor-pointer"
      :style="getClipStyle(clip, item.id)"
      @click.stop="selectAnnotation(item.id, clip.id)"
      @mousedown.stop
    ></div>
  </div>
  <template v-if="taskMeta.labels.length < 8">
    <div
      v-for="i in 8 - taskMeta.labels.length"
      :key="0 - i"
      class="relative h-6 border-b border-solid border-divider bg-white even:bg-bg"
    ></div>
  </template>
  <div
    v-if="annoMeta.itemId !== -1"
    class="absolute h-6 bg-[rgba(122,189,255,0.5)]"
    :style="{
      width: `${annoMeta.width}px`,
      left: `${annoMeta.left}px`,
      top: `${annoMeta.top}px`
    }"
  ></div>
</template>
<script setup lang="ts">
import { storeToRefs } from 'pinia';

import { reactive } from 'vue';
import { useInfoStore } from '../../store/infoStore';
import { useVideoLabelData } from '../../store/label-data/videoLabelData';
import { useVideoStore } from '../../store/videoStore';
import { VideoClassifyClip } from '../../types/type';
import { deepClone, lowerTransparent } from '../../utils/utils';

const { videoMeta, setFrame } = useVideoStore();
const { unitFrame } = storeToRefs(useVideoStore());
const { taskMeta, currentTaskMeta } = useInfoStore();
const { classifyData, addTempClip, addClassifyAnnotation, deleteAnnotation } =
  useVideoLabelData();

const annoMeta = reactive({
  isAnnotating: false,
  startFrame: 0,
  width: 0,
  left: 0,
  top: 0,
  itemId: 0,
  preMouseX: 0,
  color: ''
});

const props = defineProps<{
  timelineWidth: number;
  timelineLeft: number;
}>();
const emits = defineEmits<{
  (e: 'scrollTimeline', distance: number): void;
}>();

function getCateClips(cateId: number) {
  const annoIds = classifyData.annotations
    .filter((v) => v.category_id === cateId)
    .map((v) => v.clipId);
  return deepClone(classifyData.clips)
    .filter((v) => !v.isTemp)
    .filter((v) => annoIds.includes(v.id as number))
    .map((v) => {
      v.color = taskMeta.labels.find((a) => a.id === cateId)!.color;
      return v;
    });
}

function getClipStyle(clip: VideoClassifyClip, cateId: number) {
  const left = (clip.start_frame / (6 * unitFrame.value)) * 78;
  const right = (clip.end_frame / (6 * unitFrame.value)) * 78;
  const width = right - left;
  const bgc = lowerTransparent(clip.color);
  const curAnno = classifyData.annotations[currentTaskMeta.curAnnotation];
  return {
    left: `${left}px`,
    width: `${width}px`,
    'background-color': bgc,
    'border-color':
      curAnno?.clipId === clip.id && curAnno?.category_id === cateId
        ? '#285cd4'
        : 'transparent'
  };
}
function selectAnnotation(cateId: number, clipId: number | string) {
  const idx = classifyData.annotations.findIndex(
    (v) => v.category_id === cateId && v.clipId === clipId
  );
  if (idx < 0) return;
  currentTaskMeta.curAnnotation =
    currentTaskMeta.curAnnotation === idx ? -1 : idx;
}

function startAnnotate(e: MouseEvent) {
  currentTaskMeta.curAnnotation = -1;
  setFrame(videoMeta.totalFrameCount * (e.offsetX / props.timelineWidth));
  annoMeta.isAnnotating = true;
  annoMeta.startFrame = videoMeta.curFrame;
  annoMeta.itemId = Number((e.currentTarget as HTMLElement).dataset.id || '-1');
  annoMeta.preMouseX = e.x;
  annoMeta.width = 0;
}
window.addEventListener('mousemove', (e) => {
  if (annoMeta.isAnnotating) {
    const x = props.timelineLeft + e.x - 152;
    const nextFrame = videoMeta.totalFrameCount * (x / props.timelineWidth);
    const disX = e.x - annoMeta.preMouseX;

    if (disX > 0 && e.x > document.body.offsetWidth - 220) {
      emits('scrollTimeline', disX);
    } else if (disX < 0 && e.x < 152) {
      emits('scrollTimeline', disX);
    }
    setFrame(nextFrame);
    annoMeta.preMouseX = e.x;
    annoMeta.left =
      (Math.min(annoMeta.startFrame, videoMeta.curFrame) /
        videoMeta.totalFrameCount) *
      props.timelineWidth;
    annoMeta.width =
      (Math.abs(annoMeta.startFrame - videoMeta.curFrame) /
        videoMeta.totalFrameCount) *
      props.timelineWidth;
    if (annoMeta.itemId !== -1) {
      annoMeta.top = annoMeta.itemId * 24;
      annoMeta.color = lowerTransparent(taskMeta.labels[annoMeta.itemId].color);
    } else {
      annoMeta.top = 0;
      annoMeta.color = '#285cd4';
    }
  }
});
window.addEventListener('mouseup', () => {
  if (annoMeta.isAnnotating) {
    annoMeta.isAnnotating = false;
    const left = Math.min(annoMeta.startFrame, videoMeta.curFrame);
    const right = Math.max(annoMeta.startFrame, videoMeta.curFrame);
    if (left === right) {
      return;
    }
    if (annoMeta.itemId === -1) {
      addTempClip(left, right);
    } else {
      addClassifyAnnotation(left, right, annoMeta.itemId);
      annoMeta.width = 0;
    }
  }
});
document.addEventListener('keydown', (e) => {
  if (e.code === 'Backspace') {
    deleteAnnotation();
  }
});
defineExpose({
  annoMeta,
  startAnnotate
});
</script>
