import { defineStore, storeToRefs } from 'pinia';
import { computed, reactive } from 'vue';
import { useMediaCanvas } from '../hooks/useMediaCanvas';
import { clamp } from '../utils/utils';
import { useCurrentTaskStore } from './currentTaskStore';
import { useInfoStore } from './infoStore';
export const useVideoStore = defineStore('video', () => {
  const { taskMeta } = useInfoStore();
  const { taskItem } = storeToRefs(useCurrentTaskStore());
  const {
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
  } = useMediaCanvas();
  const videoMeta = reactive({
    curFrame: 0,
    curTime: 0,
    totalFrameCount: 0,
    zoomRate: 1,
    isPlaying: false,
    frameRate: 24
  });
  let fpsTimer: number;
  const unitFrame = computed(() => {
    return videoMeta.frameRate / 6; // 刻度尺每一小格表示的帧数
  });
  async function onVideoLoadedData() {
    if (!mediaRef.value) return;
    onMediaLoaded();
    if ([7, 8].includes(taskMeta.type) && !taskMeta.isVerify) {
      await getFps();
      (mediaRef.value as HTMLVideoElement).cancelVideoFrameCallback(fpsTimer);
    } else {
      changeFrameRate(taskItem.value?.fps || 24);
    }
    drawVideo();
  }
  function changeFrameRate(val: number) {
    videoMeta.frameRate = val;
    videoMeta.totalFrameCount = Math.round(
      videoMeta.frameRate * (mediaRef.value as HTMLVideoElement).duration
    );
  }
  function drawVideo() {
    if (!mediaRef.value) return;
    const innerDraw = () => {
      draw();
      mediaRef.value = mediaRef.value as HTMLVideoElement;
      if (videoMeta.isPlaying) {
        videoMeta.curTime = mediaRef.value.currentTime;
        videoMeta.curFrame = Math.round(
          videoMeta.frameRate * mediaRef.value.currentTime
        );
      }
      videoMeta.isPlaying = !mediaRef.value.paused;
      requestAnimationFrame(innerDraw);
    };
    innerDraw();
  }
  function togglePlay() {
    if (!mediaRef.value) return;
    mediaRef.value = mediaRef.value as HTMLVideoElement;
    mediaRef.value.paused ? mediaRef.value.play() : mediaRef.value.pause();
  }
  function setFrame(frame: number) {
    if (!mediaRef.value) return;
    mediaRef.value = mediaRef.value as HTMLVideoElement;
    frame = Math.round(frame);
    frame = clamp(0, videoMeta.totalFrameCount, frame);
    mediaRef.value.currentTime = frame / videoMeta.frameRate;
    videoMeta.curFrame = frame;
    videoMeta.curTime = mediaRef.value.currentTime;
  }
  async function getFps() {
    return new Promise((resolve) => {
      let last_media_time: number, last_frame_num: number, fps: number;
      const fps_rounder: number[] = [];
      let frame_not_seeked = true;
      function ticker(useless: any, metadata: any) {
        mediaRef.value = mediaRef.value as HTMLVideoElement;
        const media_time_diff = Math.abs(metadata.mediaTime - last_media_time);
        const frame_num_diff = Math.abs(
          metadata.presentedFrames - last_frame_num
        );
        const diff = media_time_diff / frame_num_diff;
        if (
          diff &&
          diff < 1 &&
          frame_not_seeked &&
          fps_rounder.length < 50 &&
          mediaRef.value!.playbackRate === 1
        ) {
          fps_rounder.push(diff);
          fps = Math.round(1 / get_fps_average());
        }
        if (fps_rounder.length >= 50) {
          [12, 24, 30, 50, 60].forEach((v, i, arr) => {
            if (v <= fps && i + 1 < arr.length && arr[i + 1] > fps) {
              fps = v;
            }
          });
          if (fps < 0) {
            fps = 60;
          }
          changeFrameRate(fps);
          setFrame(0);
          togglePlay();
          videoMeta.isPlaying = false;
          resolve(true);
        }
        frame_not_seeked = true;
        last_media_time = metadata.mediaTime;
        last_frame_num = metadata.presentedFrames;
        fpsTimer = mediaRef.value!.requestVideoFrameCallback(ticker);
      }
      function get_fps_average() {
        return fps_rounder.reduce((a, b) => a + b) / fps_rounder.length;
      }
      fpsTimer = (mediaRef.value as HTMLVideoElement).requestVideoFrameCallback(
        ticker
      );
    });
  }
  return {
    videoMeta,
    mediaRef,
    mediaCanvasRef,
    labelCanvasRef,
    canvasPos,
    preCanvasPos,
    mediaZoomRate,
    unitFrame,
    mediaSize,
    onMediaLoaded,
    zoom,
    onVideoLoadedData,
    togglePlay,
    setFrame,
    canvasCoord2Actual,
    actualCoord2Canvas,
    changeFrameRate
  };
});
