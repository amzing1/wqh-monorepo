<template>
  <!-- <VideoProgress @scroll-timeline="timelineRef?.scrollTimeline" /> -->
  <div class="flex flex-col">
    <VideoActionBar @scroll-timeline="timelineRef?.scrollTimeline" />
    <VideoProgress2 @scroll-timeline="timelineRef?.scrollTimeline" />
    <VideoTimeLine ref="timelineRef" />
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import VideoActionBar from './VideoActionBar.vue';
// import VideoProgress from './VideoProgress.vue';
import VideoProgress2 from './VideoProgress2.vue';
import VideoTimeLine from './VideoTimeLine.vue';

const timelineRef = ref<InstanceType<typeof VideoTimeLine>>();
</script>
