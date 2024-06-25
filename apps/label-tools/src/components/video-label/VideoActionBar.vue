<template>
  <div
    class="video-action-bar flex-center justify-between h-[30px] px-4 text-sub-primary-text bg-siderbar-bg border-solid border-y border-border"
    @click.stop
  >
    <div class="flex-center space-x-4 w-[30%]">
      <span>
        <span class="text-primary-main font-semibold">
          {{ formatVideoTime(videoMeta.curTime, videoMeta.frameRate) }}
        </span>
        /
        <span>
          {{
            formatVideoTime(
              (mediaRef as HTMLVideoElement)?.duration,
              videoMeta.frameRate
            )
          }}
        </span>
      </span>
      <span class="h-[14px] w-[1px] bg-divider"></span>
      <span>
        {{ videoMeta.curFrame }}
        <span class="text-secondary-text">
          of {{ videoMeta.totalFrameCount }}
        </span>
      </span>
    </div>
    <div class="flex-center space-x-4">
      <template v-if="showKeyframeActions">
        <Tooltip
          v-if="selectedKeyframeMeta.hasSelected"
          placement="top"
          content="删除关键帧"
        >
          <a
            class="text-red-500"
            :class="{ disabled: !selectedKeyframeMeta.canDelete }"
            @click="deleteKeyframe"
          >
            <i
              class="iconfont icon-quxiaoguanjianzhen text-xl hover:text-primary-main"
            ></i>
          </a>
        </Tooltip>
        <Tooltip v-else placement="top" content="添加关键帧">
          <a
            :class="{
              disabled: videoMeta.isPlaying || !curAnno
            }"
            @click="addKeyframe()"
          >
            <i
              class="iconfont icon-guanjianzhen text-xl hover:text-primary-main"
            ></i>
          </a>
        </Tooltip>
        <Tooltip placement="top" content="切换插值">
          <a
            :class="{
              disabled: videoMeta.isPlaying || !curAnno
            }"
            @click="toggleKeyframeLerpAfter"
          >
            <i
              class="iconfont icon-shanchuchazhi text-xl hover:text-primary-main"
            ></i>
          </a>
        </Tooltip>
        <Tooltip placement="top" content="上一关键帧">
          <a
            :class="{
              disabled: videoMeta.isPlaying || !curAnno
            }"
            @click="toPreKeyframe"
          >
            <i
              class="iconfont icon-shangyiguanjianzhen text-xl hover:text-primary-main"
            ></i>
          </a>
        </Tooltip>
      </template>
      <Tooltip placement="top" content="上一帧">
        <a @click="setFrame(videoMeta.curFrame - 1)">
          <i
            class="iconfont icon-shangyizhen text-xl hover:text-primary-main"
          ></i>
        </a>
      </Tooltip>
      <Tooltip v-show="!videoMeta.isPlaying" placement="top" content="播放">
        <a @click="togglePlay">
          <i class="iconfont icon-bofang text-xl hover:text-primary-main"></i>
        </a>
      </Tooltip>
      <Tooltip v-show="videoMeta.isPlaying" placement="top" content="暂停">
        <a @click="togglePlay">
          <i class="iconfont icon-zanting text-xl hover:text-primary-main"></i>
        </a>
      </Tooltip>
      <Tooltip placement="top" content="下一帧">
        <a @click="setFrame(videoMeta.curFrame + 1)">
          <i
            class="iconfont icon-xiayizhen text-xl hover:text-primary-main"
          ></i>
        </a>
      </Tooltip>
      <Tooltip v-if="showKeyframeActions" placement="top" content="下一关键帧">
        <a
          :class="{
            disabled: videoMeta.isPlaying || !curAnno
          }"
          @click="toNextKeyframe"
        >
          <i
            class="iconfont icon-xiayiguanjianzhen text-xl hover:text-primary-main"
          ></i>
        </a>
      </Tooltip>
    </div>
    <div class="flex-center space-x-4 w-[30%] justify-end">
      <select
        class="w-20 bg-inherit outline-0 border border-solid border-border cursor-pointer hover:border-primary-main"
        @change="changeVideoSpeed"
      >
        <option class="text-primary-text" data-id="1">1.0x</option>
        <option class="text-primary-text" data-id="2">2.0x</option>
        <option class="text-primary-text" data-id="3">3.0x</option>
        <option class="text-primary-text" data-id="4">4.0x</option>
      </select>
      <Tooltip placement="top" :content="'撤销'">
        <a
          :class="{
            disabled: !historyStack!.cancelStack.length || videoMeta.isPlaying
          }"
          @click="undo"
        >
          <i class="iconfont icon-chexiao text-xl hover:text-primary-main"></i>
        </a>
      </Tooltip>
      <Tooltip placement="top" :content="'重做'">
        <a
          :class="{
            disabled: !historyStack!.redoStack.length || videoMeta.isPlaying
          }"
          @click="redo"
        >
          <i class="iconfont icon-qianjin text-xl hover:text-primary-main"></i>
        </a>
      </Tooltip>
      <Tooltip placement="top" :content="'缩小'">
        <a @click="zoom(-1)">
          <i
            class="iconfont icon-a-zoomout text-xl hover:text-primary-main"
          ></i>
        </a>
      </Tooltip>
      <Tooltip placement="top" :content="'放大'">
        <a @click="zoom(1)">
          <i class="iconfont icon-a-zoomin text-xl hover:text-primary-main"></i>
        </a>
      </Tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Tooltip } from 'heywhale-ui';
import { storeToRefs } from 'pinia';
import { computed, onMounted } from 'vue';
import { useInfoStore } from '../../store/infoStore';
import { useVideoLabelData } from '../../store/label-data/videoLabelData';
import { useVideoStore } from '../../store/videoStore';
import { formatVideoTime } from '../../utils/utils';

const { taskMeta } = useInfoStore();
const { videoMeta, togglePlay, setFrame, zoom } = useVideoStore();
const { mediaRef } = storeToRefs(useVideoStore());
const {
  historyStack,
  undo,
  redo,
  selectedKeyframeMeta,
  preKeyframe,
  nextKeyframe,
  toggleKeyframeLerpAfter,
  addKeyframe,
  deleteKeyframe,
  deleteAnnotation
} = useVideoLabelData();
const { curAnno } = storeToRefs(useVideoLabelData());

const emits = defineEmits<{
  (e: 'scrollTimeline', dis: number): void;
}>();

onMounted(() => {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const isMac = /Macintosh/i.test(window.navigator.userAgent);
    switch (e.code) {
      case 'Backspace':
        if (!curAnno.value || videoMeta.isPlaying) return;
        deleteAnnotation();
        break;
      case 'KeyZ':
        if (
          (isMac && e.metaKey && !e.shiftKey) ||
          (!isMac && e.ctrlKey && !e.shiftKey)
        ) {
          undo();
        } else if (
          (isMac && e.metaKey && e.shiftKey) ||
          (!isMac && e.ctrlKey && e.shiftKey)
        ) {
          redo();
        }
        break;
      case 'KeyY':
        if (!isMac && e.ctrlKey) {
          redo();
        }
        break;
      case 'Space':
        togglePlay();
        break;
      case 'ArrowLeft':
        if (
          (isMac && e.metaKey && !e.shiftKey) ||
          (!isMac && e.ctrlKey && !e.shiftKey)
        ) {
          setFrame(videoMeta.curFrame - 1);
        }
        break;
      case 'ArrowRight':
        if (
          (isMac && e.metaKey && !e.shiftKey) ||
          (!isMac && e.ctrlKey && !e.shiftKey)
        ) {
          setFrame(videoMeta.curFrame + 1);
        }
        break;
      case 'KeyH':
        if (showKeyframeActions.value && e.altKey) {
          if (!curAnno.value || videoMeta.isPlaying) return;
          addKeyframe();
        }
        break;
      case 'KeyI':
        if (showKeyframeActions.value && e.altKey) {
          if (!curAnno.value || videoMeta.isPlaying) return;
          toggleKeyframeLerpAfter();
        }
        break;
    }
  });
});

const showKeyframeActions = computed(() => {
  return taskMeta.type === 7 || taskMeta.type === 8;
});

function changeVideoSpeed(e: Event) {
  const target = e.target as HTMLSelectElement;
  (mediaRef.value as HTMLVideoElement)!.playbackRate = target.selectedIndex + 1;
}

function toNextKeyframe() {
  const preFrame = videoMeta.curFrame;
  nextKeyframe();
  emits(
    'scrollTimeline',
    ((videoMeta.curFrame - preFrame) / videoMeta.frameRate) * 78
  );
}
function toPreKeyframe() {
  const preFrame = videoMeta.curFrame;
  preKeyframe();
  emits(
    'scrollTimeline',
    ((videoMeta.curFrame - preFrame) / videoMeta.frameRate) * 78
  );
}
</script>

<style lang="scss">
.video-action-bar {
  a.disabled {
    color: $disabled;
    cursor: not-allowed;
    pointer-events: none;
    i:hover {
      color: inherit !important;
      cursor: not-allowed;
    }
  }
}
</style>
