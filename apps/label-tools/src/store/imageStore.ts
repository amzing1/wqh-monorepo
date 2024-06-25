import { defineStore } from 'pinia';
import { useMediaCanvas } from '../hooks/useMediaCanvas';

export const useImageStore = defineStore('imageStore', () => {
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
});
