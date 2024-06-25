<template>
  <div>
    <div
      id="video-progress"
      class="relative min-h-[13px] bg-white border-b border-solid border-border space-y-[1px] py-1 cursor-pointer"
      @mouseenter="progressMeta.showNextTime = true"
      @mouseleave="progressMeta.showNextTime = false"
      @mousemove="getCurMousePosTime"
      @click="setFrameByProgress"
    >
      <div
        v-for="label in labels"
        :key="label.id"
        class="relative h-[1px] w-full"
      >
        <div
          v-for="(clip, idx) in getClips(label)"
          :key="idx"
          class="absolute h-[1px] z-10"
          :style="getClipStyle(clip)"
        ></div>
      </div>
      <div
        class="absolute top-0 left-0 h-full bg-siderbar-bg z-0"
        :style="{
          width: progressWidth
        }"
      ></div>
      <div
        class="absolute top-0 left-0 w-2 h-full round-[1px] box-shadow opacity-100 border border-solid border-primary-text"
        :style="{
          left: progressWidth,
          margin: 0
        }"
        @mousedown="startDrag"
      ></div>
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
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, reactive } from 'vue';
import { useVideoLabelData } from '../../store/label-data/videoLabelData';
import { useVideoStore } from '../../store/videoStore';
import { VideoDetectionAnnotation, VideoDetectionClip } from '../../types/type';
import { formatVideoTime } from '../../utils/utils';

const { videoMeta, setFrame } = useVideoStore();
const { mediaRef } = storeToRefs(useVideoStore());
const { labels } = storeToRefs(useVideoLabelData());

const emits = defineEmits<{
  (e: 'scrollTimeline', dis: number): void;
}>();

const progressWidth = computed(
  () => `${(videoMeta.curFrame / videoMeta.totalFrameCount) * 100}%`
);

const progressMeta = reactive({
  isDragging: false,
  nextTime: '',
  showNextTime: false,
  nextPersent: '',
  translatePersent: ''
});

function getClips(anno: VideoDetectionAnnotation) {
  const clips: VideoDetectionClip[] = [];
  anno.keyframes.forEach((v, i, arr) => {
    if (v.lerpAfter) {
      clips.push({
        start: v.keyframe,
        end:
          i + 1 >= arr.length ? videoMeta.totalFrameCount : arr[i + 1].keyframe,
        color: anno.color
      });
    }
  });
  return clips;
}
function getClipStyle(clip: VideoDetectionClip) {
  const left = clip.start / videoMeta.totalFrameCount;
  const right = clip.end / videoMeta.totalFrameCount;
  const width = right - left;
  return {
    left: `${left * 100}%`,
    width: `${width * 100}%`,
    'background-color': clip.color
  };
}

function startDrag() {
  progressMeta.isDragging = true;
}

function setFrameByProgress(e: MouseEvent) {
  const persent = e.x / (document.body.offsetWidth - 220);
  const preFrame = videoMeta.curFrame;
  setFrame(videoMeta.totalFrameCount * persent);
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

<style lang="scss">
.box-shadow {
  box-shadow:
    0px 1px 10px 0px rgba(0, 0, 0, 0.05),
    0px 4px 5px 0px rgba(0, 0, 0, 0.08),
    0px 2px 4px -1px rgba(0, 0, 0, 0.12);
}
</style>
