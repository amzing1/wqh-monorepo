<template>
  <div class="relative h-full overflow-hidden select-none">
    <video
      ref="mediaRef"
      :autoplay="[7, 8].includes(taskMeta.type) && !taskMeta.isVerify"
      class="absolute w-full h-full top-0 left-0 invisible"
      crossorigin="anonymous"
      muted
      :src="ossData"
      @loadeddata="onLoaded"
    ></video>
    <canvas
      ref="mediaCanvasRef"
      class="w-full h-full absolute top-0 left-0"
      @wheel="$event.deltaY > 0 ? zoom(-1) : zoom(1)"
    ></canvas>
    <canvas
      ref="labelCanvasRef"
      class="w-full h-full absolute top-0 left-0"
      :style="{
        'pointer-events': videoMeta.isPlaying ? 'none' : 'unset'
      }"
      @wheel="$event.deltaY > 0 ? zoom(-1) : zoom(1)"
      @mousedown="handleMousedown"
    ></canvas>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { watch } from 'vue';
import { useSegCanvas } from '../../hooks/useSegCanvas';
import { useCurrentTaskStore } from '../../store/currentTaskStore';
import { useInfoStore } from '../../store/infoStore';
import { useVideoLabelData } from '../../store/label-data/videoLabelData';
import { useVideoStore } from '../../store/videoStore';
import { AnnotationDrawer } from '../../utils/AnnotationDrawer';
import { deepClone } from '../../utils/utils';

const { ossData } = storeToRefs(useCurrentTaskStore());
const { currentTaskMeta, taskMeta } = useInfoStore();
const { mediaRef, mediaCanvasRef, labelCanvasRef } = storeToRefs(
  useVideoStore()
);
const { onVideoLoadedData, zoom, videoMeta } = useVideoStore();
const {
  onMousedown,
  onMousemove,
  onMouseup,
  setHooks,
  setCurAnno,
  setAnnotations
} = useSegCanvas();
const { addKeyframeByCanvas, changePolygon, initData, deleteKeyPoint } =
  useVideoLabelData();
const { curAnno, annotationsMap, labels } = storeToRefs(useVideoLabelData());

watch(curAnno, () => {
  setCurAnno((curAnno.value?.id as string) || 'none');
});

watch(labels, redraw, {
  deep: true
});

function setAnnoByDrawer(drawer: AnnotationDrawer) {
  const anno = drawer.curAnno!;
  curAnno.value = annotationsMap.value[anno.categroyId].find(
    (v) => v.id === anno.id
  )!;
}

async function onLoaded() {
  await onVideoLoadedData();
  initData();
  currentTaskMeta.isRequesting = false;
}

function redraw() {
  setAnnotations(
    labels.value.map((v) => ({
      id: v.id as string,
      polygon: deepClone(v.polygon),
      keypoints: deepClone(v.keypoints.map((v) => [v.x, v.y])),
      idx: (v.idx || 0) + 1,
      originData: v
    }))
  );
}

function afterCreate(drawer: AnnotationDrawer) {
  addKeyframeByCanvas(drawer);
}

function afterChange(drawer: AnnotationDrawer) {
  const anno = drawer.curAnno!;
  curAnno.value = annotationsMap.value[anno.categroyId].find(
    (v) => v.id === anno.id
  )!;
  const idx = curAnno.value.keyframes.findIndex(
    (v) => v.keyframe === videoMeta.curFrame
  );
  if (idx >= 0) {
    changePolygon(drawer, idx);
  } else {
    addKeyframeByCanvas(drawer);
  }
}

function handleMousedown(e: MouseEvent) {
  if (taskMeta.type === 6) {
    return;
  }
  onMousedown(e);
}

setHooks({
  afterCreate,
  afterChange,
  setAnnoByDrawer,
  deleteKeyPoint
});

if (taskMeta.type === 7 || taskMeta.type === 8) {
  window.addEventListener('mousemove', onMousemove);
  window.addEventListener('mouseup', onMouseup);
}
</script>
