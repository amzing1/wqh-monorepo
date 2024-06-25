<template>
  <div
    class="custom-scrollbar flex flex-1 text-sub-primary-text select-none text-[12px]"
  >
    <div
      class="flex flex-col w-[152px] h-full border-r border-border border-solid"
    >
      <div
        class="h-[42px] py-0.5 px-4 text-xs border-b border-border border-solid"
      >
        <Tooltip :content="videoName" placement="top" class="block">
          <p
            class="single-line-text max-w-[135px]"
            :style="{
              'margin-top': taskMeta.type === 6 ? '9px' : '0'
            }"
          >
            {{ videoName }}
          </p>
        </Tooltip>
        <Dropdown
          v-if="taskMeta.type !== 6"
          :class="{ disable: !!labels.length }"
          @on-click="changeFrameRate(Number($event))"
        >
          <p class="text-sub-color">
            {{ videoMeta.frameRate }} fps
            <i class="iconfont icon-xiala text-xs"></i>
          </p>
          <template #list>
            <DropdownMenu>
              <DropdownItem
                v-for="rate in frameRates"
                :key="rate"
                :name="rate.toString()"
                :disabled="!!labels.length || rate > videoMeta.frameRate"
              >
                {{ rate }} fps
              </DropdownItem>
            </DropdownMenu>
          </template>
        </Dropdown>
      </div>
      <div
        id="label-cate"
        ref="leftYEl"
        class="flex-1 text-[12px] overflow-auto hidden-scrollbar"
        :style="{
          maxHeight
        }"
      >
        <template v-if="taskMeta.type === 6">
          <div
            v-for="item in taskMeta.labels"
            :key="item.id"
            class="single-line-text h-6 leading-6 pl-4 border-b border-solid border-divider"
          >
            {{ item.name }}
          </div>
        </template>
        <template v-else>
          <div v-for="(annos, key) in annotationsMap" :key="key">
            <div
              v-for="(item, idx) in annos"
              :key="idx"
              class="single-line-text h-6 leading-6 pl-4 border-b border-solid border-divider cursor-pointer"
              :style="{
                backgroundColor:
                  curAnno &&
                  item.id === curAnno.id &&
                  item.category_id === curAnno.category_id
                    ? '#a7c8fa'
                    : 'inherit'
              }"
              @click="curAnno = item"
            >
              {{ item.name + `(${idx + 1})` }}
            </div>
          </div>
        </template>
      </div>
    </div>
    <div class="relative w-full mx-width flex flex-col overflow-hidden">
      <div
        id="timeline-ruler"
        ref="rulerEl"
        class="hidden-scrollbar w-full mx-width overflow-auto cursor-pointer"
        @mousedown="classifyActionRef?.startAnnotate"
      >
        <div
          :style="{ width: `${timelineWidth}px` }"
          class="single-line-text bg-siderbar-bg"
          @click="setFrameByTimeline"
          @wheel="scrollTimeline($event.deltaX)"
        >
          <div class="h-3 ruler-bg"></div>
          <div class="h-[18px] leading-[18px] py-0.5 pointer-events-none">
            <div
              v-for="(text, idx) in timeTexts"
              :key="idx"
              class="inline-block w-[78px] first:-mr-[30px]"
              :style="{
                color: text.enabled ? 'unset' : '#c5c8ce'
              }"
            >
              {{ text.value }}
            </div>
          </div>
        </div>
      </div>

      <div
        ref="scrollWrapperEl"
        class="relative h-3 border-y border-solid border-border pt-[1px] bg-siderbar-bg"
        @click.stop
      >
        <div
          class="absolute h-2 rounded-[12px] bg-disabled cursor-pointer hover:bg-[#657180]"
          :style="{
            width: `${scrollMeta.scrollBarWidth}px`,
            left: `${scrollMeta.scrollBarLeft}px`
          }"
          @mousedown="startScroll"
        ></div>
      </div>

      <div
        ref="annotationEl"
        class="custom-scrollbar flex-1 w-full mx-width overflow-y-auto overflow-x-hidden border-l border-solid border-border"
        :style="{
          maxHeight
        }"
        @scroll="syncY"
      >
        <div class="relative h-full" :style="{ width: `${timelineWidth}px` }">
          <VideoClassifyActionBlock
            v-if="taskMeta.type === 6"
            ref="classifyActionRef"
            :timeline-width="validTimelineWidth"
            :timeline-left="scrollMeta.timeLineLeft"
            @scroll-timeline="scrollTimeline"
          />
          <VideoDetectionActionBlock v-else />
        </div>
      </div>

      <div
        ref="posLineWrapperEl"
        class="hidden-scrollbar absolute top-0 left-0 w-full mx-width h-full pointer-events-none overflow-auto"
      >
        <div class="relative h-full" :style="{ width: `${timelineWidth}px` }">
          <div
            class="absolute w-[1px] h-full bg-red-500"
            :style="{
              left: `${frameLineLeft}px`
            }"
          ></div>
          <div
            v-if="classifyActionRef && classifyActionRef.annoMeta.itemId === -1"
            class="absolute h-full top-0 bg-[rgba(122,189,255,0.5)]"
            :style="{
              width: `${classifyActionRef.annoMeta.width}px`,
              left: `${classifyActionRef.annoMeta.left}px`
            }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Dropdown, DropdownItem, DropdownMenu, Tooltip } from 'heywhale-ui';
import { storeToRefs } from 'pinia';
import { computed, reactive, ref, watch } from 'vue';
import { useCurrentTaskStore } from '../../store/currentTaskStore';
import { useInfoStore } from '../../store/infoStore';
import { useVideoLabelData } from '../../store/label-data/videoLabelData';
import { useVideoStore } from '../../store/videoStore';
import { clamp, formatVideoTime } from '../../utils/utils';
import VideoClassifyActionBlock from './VideoClassifyActionBlock.vue';
import VideoDetectionActionBlock from './VideoDetectionActionBlock.vue';

const { taskMeta } = useInfoStore();
const { videoMeta, setFrame, changeFrameRate } = useVideoStore();
const { taskItem } = storeToRefs(useCurrentTaskStore());
const { unitFrame } = storeToRefs(useVideoStore());
const { annotationsMap, curAnno, labels } = storeToRefs(useVideoLabelData());

const scrollWrapperEl = ref<HTMLElement>();
const annotationEl = ref<HTMLElement>();
const rulerEl = ref<HTMLElement>();
const posLineWrapperEl = ref<HTMLElement>();
const leftYEl = ref<HTMLElement>();
const classifyActionRef = ref<InstanceType<typeof VideoClassifyActionBlock>>();
const maxHeight = ref<string>('185px');
const scrollMeta = reactive({
  scrollBarWidth: 0,
  isScrolling: false,
  scrollBarLeft: 0,
  timeLineLeft: 0,
  offsetX: 0
});
const videoName = computed(
  () => taskItem.value?.key.split('/').at(-1) || 'video'
);
const frameRates = computed(() => [12, 24, 30, 50, 60]);
const timeTexts = computed(() => {
  const texts = [];
  texts.push({
    value: `00:00`,
    enabled: true
  });
  let count = 0;
  const max = Math.max(videoMeta.totalFrameCount, videoMeta.frameRate * 19);
  while (count < max) {
    count += 6 * unitFrame.value;
    texts.push({
      value: formatVideoTime(
        count / videoMeta.frameRate,
        videoMeta.frameRate,
        false
      ),
      enabled: count <= videoMeta.totalFrameCount
    });
  }
  return texts;
});
const timelineWidth = computed(() => {
  return timeTexts.value.length * 78;
});
const validTimelineWidth = computed(() => {
  return (videoMeta.totalFrameCount / videoMeta.frameRate) * 78;
});
const frameLineLeft = computed(() => {
  return (
    validTimelineWidth.value * (videoMeta.curFrame / videoMeta.totalFrameCount)
  );
});

watch(timelineWidth, getProgressWidth);
/**播放视频时自动滚动timeline */
watch(
  () => videoMeta.curFrame,
  () => {
    if (!videoMeta.isPlaying || !scrollWrapperEl.value) return false;
    const oneScreenFrames = Math.floor(
      (scrollWrapperEl.value.offsetWidth / 78) * videoMeta.frameRate
    );
    const firstFrame =
      (scrollMeta.scrollBarLeft / scrollWrapperEl.value.offsetWidth) *
      videoMeta.totalFrameCount;
    const dis = videoMeta.curFrame - firstFrame - oneScreenFrames;
    if (videoMeta.curFrame !== firstFrame && dis < 1 && dis > -1) {
      scrollTimeline(scrollWrapperEl.value!.offsetWidth);
    }
  }
);
/**
 * video-progress 的高度随 labels 长度动态变化
 * label 区的高度应该动态缩小
 * 198 = 270 - 30 - 42
 */
watch(
  () => labels.value.length,
  () => {
    const progressEl = document.querySelector('#video-progress') as HTMLElement;
    maxHeight.value = `calc(198px - ${progressEl.offsetHeight}px)`;
  }
);
watch(
  () => scrollMeta.timeLineLeft,
  () => {
    if (!annotationEl.value || !rulerEl.value || !posLineWrapperEl.value) {
      return;
    }
    annotationEl.value.scrollLeft = scrollMeta.timeLineLeft;
    rulerEl.value.scrollLeft = scrollMeta.timeLineLeft;
    posLineWrapperEl.value.scrollLeft = scrollMeta.timeLineLeft;
  }
);

function getProgressWidth() {
  const progressEl = scrollWrapperEl.value;
  if (!progressEl) {
    scrollMeta.scrollBarWidth = 0;
    return;
  }
  const persent = progressEl.offsetWidth / timelineWidth.value;
  if (persent >= 1) {
    return (scrollMeta.scrollBarWidth = 0);
  }
  scrollMeta.scrollBarWidth = Math.max(progressEl.offsetWidth * persent, 24);
}

function startScroll(e: MouseEvent) {
  scrollMeta.isScrolling = true;
  scrollMeta.offsetX = e.offsetX;
}

function setFrameByTimeline(e: MouseEvent) {
  const persent = e.offsetX / validTimelineWidth.value;
  if (persent > 1 || persent < 0) {
    return;
  }
  setFrame(videoMeta.totalFrameCount * persent);
}
function scrollTimeline(distance: number) {
  scrollMeta.timeLineLeft += distance;
  scrollMeta.timeLineLeft = clamp(
    0,
    timelineWidth.value,
    scrollMeta.timeLineLeft
  );
  scrollMeta.scrollBarLeft = clamp(
    0,
    scrollWrapperEl.value
      ? scrollWrapperEl.value.offsetWidth - scrollMeta.scrollBarWidth
      : 0,
    (scrollMeta.timeLineLeft / timelineWidth.value) *
      (scrollWrapperEl.value?.offsetWidth || 0)
  );
  // 在计算一遍确保正确显示
  const persent = scrollMeta.scrollBarLeft / scrollWrapperEl.value!.offsetWidth;
  scrollMeta.timeLineLeft = persent * timelineWidth.value;
}
function syncY() {
  if (!leftYEl.value || !annotationEl.value) return;
  leftYEl.value.scrollTop = annotationEl.value.scrollTop;
}
window.addEventListener('mousemove', (e) => {
  if (!scrollMeta.isScrolling || !scrollWrapperEl.value) {
    return;
  }
  scrollMeta.scrollBarLeft = clamp(
    0,
    scrollWrapperEl.value.offsetWidth - scrollMeta.scrollBarWidth,
    e.x - 152 - scrollMeta.offsetX
  );
  const persent = scrollMeta.scrollBarLeft / scrollWrapperEl.value.offsetWidth;
  scrollMeta.timeLineLeft = persent * timelineWidth.value;
});
window.addEventListener('mouseup', () => {
  scrollMeta.isScrolling = false;
});
defineExpose({
  scrollTimeline
});
</script>

<style>
.ruler-bg {
  background-image: url('@/assets/unit-ruler.svg');
}
.mx-width {
  max-width: calc(100vw - 372px);
}
</style>
