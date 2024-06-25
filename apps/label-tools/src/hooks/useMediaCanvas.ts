import { reactive, ref } from 'vue';
import { clamp } from '../utils/utils';

export function useMediaCanvas() {
  const mediaZoomRate = ref<number>(1);
  const canvasPos = reactive({
    w: 0,
    h: 0,
    dx: 0,
    dy: 0
  });
  const preCanvasPos = reactive({
    w: 0,
    h: 0,
    dx: 0,
    dy: 0
  });
  const mediaSize = reactive({
    w: 0,
    h: 0
  });
  // img 或 video 标签
  const mediaRef = ref<HTMLImageElement | HTMLVideoElement | null>(null);
  // 用于展示图片或者视频的 canvas 元素
  const mediaCanvasRef = ref<HTMLCanvasElement | null>(null);
  // 用于绘制 label 的 canvas 元素
  const labelCanvasRef = ref<HTMLCanvasElement | null>(null);

  function onMediaLoaded() {
    onChangeCanvasSize();
    draw();
  }
  function onChangeCanvasSize() {
    if (!mediaRef.value || !mediaCanvasRef.value || !labelCanvasRef.value) {
      return;
    }
    if (mediaRef.value instanceof HTMLVideoElement) {
      mediaSize.w = mediaRef.value.videoWidth;
      mediaSize.h = mediaRef.value.videoHeight;
    } else {
      mediaSize.w = mediaRef.value.naturalWidth;
      mediaSize.h = mediaRef.value.naturalHeight;
    }
    mediaCanvasRef.value.width = mediaRef.value.parentElement!.offsetWidth;
    mediaCanvasRef.value.height = mediaRef.value.parentElement!.offsetHeight;
    labelCanvasRef.value.width = mediaRef.value.parentElement!.offsetWidth;
    labelCanvasRef.value.height = mediaRef.value.parentElement!.offsetHeight;
    preCanvasPos.w = canvasPos.w;
    preCanvasPos.h = canvasPos.h;
    preCanvasPos.dx = canvasPos.dx;
    preCanvasPos.dy = canvasPos.dy;
  }
  function draw() {
    if (!mediaCanvasRef.value || !mediaRef.value) return;
    let mediaRate = 1;
    const { w, h } = mediaSize;
    mediaRate = w / h;
    const ow = mediaRef.value.offsetWidth;
    const oh = mediaRef.value.offsetHeight;
    const mediaCtx = mediaCanvasRef.value.getContext('2d')!;
    let [dx, dy, cw, ch] = [0, 0, ow, oh];
    mediaCtx.clearRect(
      0,
      0,
      mediaCanvasRef.value.offsetWidth,
      mediaCanvasRef.value.offsetHeight
    );
    if (
      w < mediaCanvasRef.value.offsetWidth &&
      h < mediaCanvasRef.value.offsetHeight
    ) {
      // 尺寸小的图片或视频展示在可视区域中间
      cw = w;
      ch = h;
      dx = (mediaCanvasRef.value.offsetWidth - cw) / 2;
      dy = (mediaCanvasRef.value.offsetHeight - ch) / 2;
    } else if (
      mediaCanvasRef.value.offsetWidth / mediaCanvasRef.value.offsetHeight >=
      mediaRate
    ) {
      // 可视区域高度占满，左右居中
      ch = mediaCanvasRef.value.offsetHeight;
      cw = ch * mediaRate;
      dx = (mediaCanvasRef.value.width - cw) / 2;
      dy = 0;
    } else {
      // 可视区域宽度占满，上下居中
      cw = mediaCanvasRef.value.offsetWidth;
      ch = cw / mediaRate;
      dx = 0;
      dy = (mediaCanvasRef.value.height - ch) / 2;
    }
    if (mediaZoomRate.value > 1) {
      // 视频放大
      // 可视区域内展示的画面内容减少
      cw = cw * mediaZoomRate.value;
      ch = ch * mediaZoomRate.value;
      dx = (mediaCanvasRef.value.width - cw) / 2;
      dy = (mediaCanvasRef.value.height - ch) / 2;
    } else if (mediaZoomRate.value < 1) {
      mediaZoomRate.value = Math.max(0.2, mediaZoomRate.value);
      dx += Math.abs(cw - cw * mediaZoomRate.value) / 2;
      dy += Math.abs(ch - ch * mediaZoomRate.value) / 2;
      cw = cw * mediaZoomRate.value;
      ch = ch * mediaZoomRate.value;
    }
    canvasPos.w = cw;
    canvasPos.h = ch;
    canvasPos.dx = dx;
    canvasPos.dy = dy;
    mediaCtx.drawImage(mediaRef.value, 0, 0, w, h, dx, dy, cw, ch);
  }
  function zoom(val: 1 | -1) {
    mediaZoomRate.value += val * 0.1;
    mediaZoomRate.value = clamp(0.2, 2, mediaZoomRate.value);
    preCanvasPos.dx = canvasPos.dx;
    preCanvasPos.dy = canvasPos.dy;
    preCanvasPos.w = canvasPos.w;
    preCanvasPos.h = canvasPos.h;
    draw();
  }
  function canvasCoord2Actual(point: [number, number]) {
    let [x, y] = point;
    x = (x - canvasPos.dx) * (mediaSize.w / canvasPos.w);
    y = (y - canvasPos.dy) * (mediaSize.h / canvasPos.h);
    return [x, y];
  }
  function actualCoord2Canvas(point: [number, number]) {
    let [x, y] = point;
    x = x * (canvasPos.w / mediaSize.w) + canvasPos.dx;
    y = y * (canvasPos.h / mediaSize.h) + canvasPos.dy;
    return [x, y];
  }

  window.addEventListener('resize', onChangeCanvasSize);
  return {
    mediaRef,
    mediaCanvasRef,
    labelCanvasRef,
    canvasPos,
    preCanvasPos,
    mediaZoomRate,
    mediaSize,
    onMediaLoaded,
    draw,
    zoom,
    canvasCoord2Actual,
    actualCoord2Canvas
  };
}
