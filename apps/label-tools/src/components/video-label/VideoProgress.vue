<template>
  <div
    class="relative h-1 cursor-pointer"
    @mouseenter="progressMeta.showNextTime = true"
    @mouseleave="progressMeta.showNextTime = false"
    @mousemove="getCurMousePosTime"
    @click="setFrameByProgress"
  >
    <div
      class="absolute top-0 left-0 h-1 bg-primary-main"
      :style="{
        width: `${(videoMeta.curFrame / videoMeta.totalFrameCount) * 100}%`
      }"
    >
      <div
        class="relative left-[calc(100%-4px)] -top-1 w-3 h-3 rounded-full"
        @mousedown="startDrag"
      >
        <div
          class="absolute left-0.5 top-0.5 w-2 h-2 rounded-full bg-white border border-solid border-primary-main"
        ></div>
      </div>
    </div>
    <div
      v-show="progressMeta.showNextTime"
      class="absolute top-[-26px] left-0 w-[90px] h-[22px] leading-[22px] px-1 bg-[rgba(0,0,0,.5)] text-white text-center"
      :style="{
        transform: `translateX(${progressMeta.translatePersent})`,
        left: progressMeta.nextPersent
      }"
    >
      {{ progressMeta.nextTime }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { reactive } from 'vue';
import { useVideoStore } from '../../store/videoStore';
import { formatVideoTime } from '../../utils/utils';

const { videoMeta, setFrame } = useVideoStore();
const { mediaRef } = storeToRefs(useVideoStore());

const emits = defineEmits<{
  (e: 'scrollTimeline', dis: number): void;
}>();

const progressMeta = reactive({
  isDragging: false,
  nextTime: '',
  showNextTime: false,
  nextPersent: '',
  translatePersent: ''
});

function startDrag() {
  progressMeta.isDragging = true;
}

function setFrameByProgress(e: MouseEvent) {
  const persent = e.x / (document.body.offsetWidth - 220);
  const preFrame = videoMeta.curFrame;
  setFrame(videoMeta.totalFrameCount * persent);
  console.log(((videoMeta.curFrame - preFrame) / videoMeta.frameRate) * 78);
  emits(
    'scrollTimeline',
    ((videoMeta.curFrame - preFrame) / videoMeta.frameRate) * 78
  );
}

function getCurMousePosTime(e: MouseEvent) {
  const persent = e.x / (document.body.offsetWidth - 220);
  const time = persent * (mediaRef.value as HTMLVideoElement).duration;
  progressMeta.nextTime = formatVideoTime(time, videoMeta.frameRate);
  const x = Math.min(e.x, document.body.offsetWidth - 300);
  progressMeta.translatePersent =
    x === document.body.offsetWidth - 300 ? '-100%' : x > 40 ? '-50%' : '0%';
  progressMeta.nextPersent = persent * 100 + '%';
  progressMeta.showNextTime = true;
}

window.addEventListener('mousemove', (e) => {
  if (progressMeta.isDragging) {
    setFrameByProgress(e);
  }
});
window.addEventListener('mouseup', () => {
  progressMeta.isDragging = false;
});
</script>
