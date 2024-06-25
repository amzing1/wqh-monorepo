<template>
  <TailWindDemo />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';

import TailWindDemo from './components/TailwindDemo.vue';
import { eventEmitter } from './KeydownEventsManager';
onMounted(() => {
  eventEmitter.on('logA', () => {
    console.log('a');
  });
  document.addEventListener('keydown', () => {
    eventEmitter.emit('logA');
  });
});
</script>
