<template>
  <div class="relative w-full h-full">
    <canvas
      id="map-canvas"
      class="absolute left-0 top-0 w-full h-full bg-transparent"
    ></canvas>
    <img id="map-img" ref="imgRef" class="invisible" src="../assets/over.jpg" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';

const wheelMeta = reactive({
  anchor: {
    x: 0,
    y: 0
  },
  zoomRate: 1
});
const imgRef = ref<HTMLImageElement>();
let ctx: CanvasRenderingContext2D | null = null;
onMounted(() => {
  const canvasEl = document.querySelector('#map-canvas') as HTMLCanvasElement;
  canvasEl.width = canvasEl.offsetWidth;
  canvasEl.height = canvasEl.offsetHeight;
  canvasEl.addEventListener('wheel', (e) => {
    wheelMeta.anchor = {
      x: e.offsetX,
      y: e.offsetY
    };
  });
  ctx = canvasEl.getContext('2d')!;
  drawMap();
});
function drawMap() {
  const innerDraw = () => {
    if (!ctx || !imgRef.value) {
      return;
    }
    ctx.clearRect(0, 0, ctx.canvas.offsetWidth, ctx.canvas.offsetHeight);
    ctx.drawImage(
      imgRef.value,
      0,
      0,
      imgRef.value.offsetWidth,
      imgRef.value.offsetHeight,
      0,
      0,
      ctx.canvas.offsetWidth,
      ctx.canvas.offsetHeight
    );
  };
  requestAnimationFrame(innerDraw);
}
</script>
