<template>
  <div @touch.prevent>
    <div
      v-for="(item, idx) in labels"
      :key="item.id"
      class="relative h-6 border-b border-solid border-divider bg-white even:bg-bg"
      :data-id="idx"
    >
      <div
        v-for="(clip, clipIdx) in getClips(item)"
        :key="0 - clipIdx"
        class="absolute h-full top-0"
        :style="getClipStyle(clip)"
      ></div>
      <div
        v-for="(keyframe, keyIdx) in item.keyframes"
        :key="keyIdx"
        class="video-detection-keyframe"
        :style="getKeyframeStyle(keyframe, item.color)"
        @click="setAnnotation(item, keyframe)"
      ></div>
    </div>
    <template v-if="labels.length < 8">
      <div
        v-for="i in 8 - labels.length"
        :key="0 - i"
        class="relative h-6 border-b border-solid border-divider bg-white even:bg-bg"
      ></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useVideoLabelData } from '../../store/label-data/videoLabelData';
import { useVideoStore } from '../../store/videoStore';
import {
  VideoDetectionAnnotation,
  VideoDetectionClip,
  VideoDetectionKeyframe
} from '../../types/type';
import { lowerTransparent } from '../../utils/utils';

const { labels, curAnno } = storeToRefs(useVideoLabelData());
const { videoMeta } = useVideoStore();
const { unitFrame } = storeToRefs(useVideoStore());

function getClips(anno: VideoDetectionAnnotation) {
  const clips: VideoDetectionClip[] = [];
  anno.keyframes.forEach((v, i, arr) => {
    if (v.lerpAfter) {
      clips.push({
        start: v.keyframe,
        end:
          i + 1 >= arr.length ? videoMeta.totalFrameCount : arr[i + 1].keyframe,
        color: lowerTransparent(anno.color)
      });
    }
  });
  return clips;
}
function getClipStyle(clip: VideoDetectionClip) {
  const left = (clip.start / (6 * unitFrame.value)) * 78;
  const right = (clip.end / (6 * unitFrame.value)) * 78;
  const width = right - left;
  return {
    left: `${left}px`,
    width: `${width}px`,
    'background-color': clip.color
  };
}
function getKeyframeStyle(keyframe: VideoDetectionKeyframe, bgc: string) {
  const left = (keyframe.keyframe / (6 * unitFrame.value)) * 78;
  return {
    left: `${left}px`,
    'background-color': bgc
  };
}
function setAnnotation(
  anno: VideoDetectionAnnotation,
  keyframe: VideoDetectionKeyframe
) {
  curAnno.value = anno;
  videoMeta.curFrame = keyframe.keyframe;
}
</script>

<style lang="scss">
.video-detection-keyframe {
  position: absolute;
  top: 5px;
  width: 12px;
  height: 14px;
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
  transform: translateX(-50%);
  cursor: pointer;
}
</style>
