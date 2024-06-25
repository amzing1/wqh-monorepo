<template>
  <div class="relative w-full h-full max-h-[100vh-44px] image-label-bg">
    <img
      ref="mediaRef"
      :src="ossData"
      alt="label-image"
      class="absolute top-0 left-0 hidden"
      @load="onLoaded"
    />
    <canvas
      ref="mediaCanvasRef"
      class="w-full h-full absolute top-0 left-0"
      @wheel="$event.deltaY > 0 ? zoom(-1) : zoom(1)"
    ></canvas>
    <canvas
      ref="labelCanvasRef"
      class="w-full h-full absolute top-0 left-0"
      @wheel="$event.deltaY > 0 ? zoom(-1) : zoom(1)"
      @mousedown="onMousedown"
    ></canvas>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { watch } from 'vue';
import { useSegCanvas } from '../../hooks/useSegCanvas';
import { useCurrentTaskStore } from '../../store/currentTaskStore';
import { useImageStore } from '../../store/imageStore';
import { useInfoStore } from '../../store/infoStore';
import { useImageLabelData } from '../../store/label-data/imageLabelData';
import { AnnotationDrawer } from '../../utils/AnnotationDrawer';
import { deepClone } from '../../utils/utils';

const { currentTaskMeta, taskMeta } = useInfoStore();
const { ossData } = storeToRefs(useCurrentTaskStore());

const { mediaRef, mediaCanvasRef, labelCanvasRef } = storeToRefs(
  useImageStore()
);
const { onMediaLoaded, zoom } = useImageStore();
const {
  onMousedown,
  onMousemove,
  onMouseup,
  setHooks,
  setCurAnno,
  setAnnotations
} = useSegCanvas();
const { initData, addDetectionAnnotation, changePolygon } = useImageLabelData();
const { curAnno, detectionData } = storeToRefs(useImageLabelData());

watch(curAnno, () => {
  setCurAnno((curAnno.value?.id as string) || 'none');
});
watch(detectionData, redraw, {
  deep: true
});

function onLoaded() {
  onMediaLoaded();
  initData();
  currentTaskMeta.isRequesting = false;
}

function setAnnoByDrawer(drawer: AnnotationDrawer) {
  const anno = drawer.curAnno!;
  curAnno.value = detectionData.value.find((v) => v.id === anno.id)!;
  if (!curAnno.value) {
    curAnno.value = {
      polygon: anno.segmentation,
      id: anno.id,
      color: anno.strokeColor,
      category_id: anno.categroyId,
      name: anno.name,
      visible: true,
      isOver: true
    };
  }
}

function redraw() {
  setAnnotations(
    detectionData.value.map((v) => ({
      id: v.id as string,
      polygon: deepClone(v.polygon),
      idx: (v.idx || 0) + 1,
      keypoints: [],
      originData: v
    }))
  );
  setCurAnno((curAnno.value?.id as string) || 'none');
}

function afterCreate(drawer: AnnotationDrawer) {
  if (drawer.curAnno) {
    setAnnoByDrawer(drawer);
  }
  addDetectionAnnotation();
}
function afterChange(drawer: AnnotationDrawer) {
  changePolygon(drawer);
}

setHooks({
  afterChange,
  afterCreate,
  setAnnoByDrawer
});

if (taskMeta.type === 1 || taskMeta.type === 2) {
  window.addEventListener('mousemove', onMousemove);
  window.addEventListener('mouseup', onMouseup);
}
</script>

<style lang="scss">
.image-label-bg {
  background: url('@/assets/bg.png');
}
</style>
