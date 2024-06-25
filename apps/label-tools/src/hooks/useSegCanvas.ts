import { storeToRefs } from 'pinia';
import { v4 as uuidV4 } from 'uuid';
import { Ref, reactive, unref, watch } from 'vue';
import { useImageStore } from '../store/imageStore';
import { useInfoStore } from '../store/infoStore';
import { useVideoStore } from '../store/videoStore';
import { CanvasPos, SetAnnotationsParams, SetHooksParams } from '../types/type';
import { Fn } from '../types/util';
import {
  AnnotationDrawer,
  AnnotationSegmentation,
  Skeleton
} from '../utils/AnnotationDrawer';
import { clamp, lowerTransparent } from '../utils/utils';

type AnnoMeta = {
  isStart: boolean;
  startPos: [number, number];
  movePos: [number, number];
  startSegs: [number, number][];
  edge: [number, number, number, number];
  type:
    | 'create-polygon'
    | 'create-bbox'
    | 'move'
    | 'move-point'
    | 'move-keypoint';
  curPoint: number;
  isReadyOver: boolean;
  selectedKeyPointIdx: number;
};

export function useSegCanvas() {
  const { taskMeta } = useInfoStore();
  let canvasPos: CanvasPos;
  let preCanvasPos: CanvasPos;
  let labelCanvasRef: Ref<HTMLCanvasElement | null>;
  if ([7, 8].includes(taskMeta.type)) {
    const store = useVideoStore();
    canvasPos = store.canvasPos;
    preCanvasPos = store.preCanvasPos;
    labelCanvasRef = storeToRefs(store).labelCanvasRef;
  } else {
    const store = useImageStore();
    canvasPos = store.canvasPos;
    preCanvasPos = store.preCanvasPos;
    labelCanvasRef = storeToRefs(store).labelCanvasRef;
  }

  const annoMeta = reactive<AnnoMeta>({
    isStart: false,
    startPos: [0, 0],
    movePos: [0, 0],
    startSegs: [[0, 0]],
    edge: [0, 0, 0, 0], // 移动时候上右下左极限值
    type: 'create-polygon',
    curPoint: -1,
    isReadyOver: false,
    selectedKeyPointIdx: -1
  });
  let drawer: AnnotationDrawer | null = null;

  // 鼠标抬起时不同类型
  let inCreating: Fn | undefined;
  let afterCreate: Fn | undefined;
  let afterChange: Fn | undefined;
  let setAnnoByDrawer: Fn | undefined;
  let deleteKeyPoint: Fn | undefined;

  watch(canvasPos, () => {
    if (!drawer) {
      return;
    }
    const { w: w1, h: h1, dx: dx1, dy: dy1 } = canvasPos;
    const { w: w2, h: h2, dx: dx2, dy: dy2 } = preCanvasPos;
    drawer.annotations.forEach((v) => {
      v.segmentation.forEach((p) => {
        p[0] = (w1 / w2) * (p[0] - dx2) + dx1;
        p[1] = (h1 / h2) * (p[1] - dy2) + dy1;
      });
      v.setSegmentation(v.segmentation);
      if (v.skeleton) {
        v.skeleton.keypoints.forEach((p) => {
          p.x = (w1 / w2) * (p.x - dx2) + dx1;
          p.y = (h1 / h2) * (p.y - dy2) + dy1;
        });
      }
    });
  });
  function isMouseInCanvas(x: number, y: number) {
    const { w, h, dx, dy } = canvasPos;
    if (x < dx || x > dx + w || y < dy || y > dy + h) {
      return false;
    }
    return true;
  }
  function setHooks(params: SetHooksParams) {
    afterCreate = params.afterCreate;
    inCreating = params.inCreating;
    afterChange = params.afterChange;
    setAnnoByDrawer = params.setAnnoByDrawer;
    deleteKeyPoint = params.deleteKeyPoint;
  }
  function setCurAnno(annoId: string) {
    if (!drawer) return;
    drawer.curAnno = drawer.annotations.find((v) => v.id === annoId) || null;
  }
  function setAnnotations(params: SetAnnotationsParams) {
    if (!drawer) {
      drawer = new AnnotationDrawer(labelCanvasRef.value!, []);
    }
    params.forEach((v) => {
      const { id, polygon, idx } = v;
      const { category_id, color, name, visible, isOver, keypoints } =
        v.originData!;
      const cate = taskMeta.labels.find((c) => c.id === category_id)!;
      let anno = drawer!.annotations.find((v) => v.id === id);
      if (!anno) {
        anno = new AnnotationSegmentation(labelCanvasRef.value!, {
          segmentation: polygon,
          strokeColor: color,
          // 画矩形填充颜色，多边形不填充
          fillColor: [2, 7].includes(taskMeta.type)
            ? lowerTransparent(color)
            : 'transparent',
          isOver,
          id: id as string,
          categroyId: category_id,
          name,
          visible: visible ?? true
        });
        if (keypoints?.length) {
          const skeleton = new Skeleton(labelCanvasRef.value!, {
            bbox: anno.bbox,
            color: anno.strokeColor,
            skeletons: cate.skeletons,
            keypoints: cate.keypoints
          });
          skeleton.keypoints.forEach((p, i) => {
            p.x = v.keypoints[i][0];
            p.y = v.keypoints[i][1];
            p.visible = keypoints[i].visible;
          });
          anno.skeleton = skeleton;
        }
        anno.idx = idx;
        drawer!.annotations.push(anno);
      } else {
        anno.setSegmentation(polygon);
        anno.idx = idx;
        anno.visible = v.originData.visible ?? true;
        if (!anno.skeleton && v.keypoints?.length) {
          anno.skeleton = new Skeleton(labelCanvasRef.value!, {
            bbox: anno.bbox,
            color: anno.strokeColor,
            skeletons: cate.skeletons,
            keypoints: cate.keypoints
          });
        }
        if (anno.skeleton && polygon.length) {
          if (!v.keypoints.length) {
            anno.skeleton.keypoints = [];
          } else {
            anno.skeleton.keypoints.forEach((p, i) => {
              p.x = v.keypoints[i][0];
              p.y = v.keypoints[i][1];
              p.visible = v.originData.keypoints[i].visible;
            });
          }
        }
      }
    });
    const ids = params.map((v) => v.id);
    drawer.annotations = drawer.annotations.filter((v) => ids.includes(v.id));
  }
  function onMousedown(e: MouseEvent) {
    const x = e.x;
    const y = e.y - 44;
    if (!drawer) {
      drawer = new AnnotationDrawer(labelCanvasRef.value!, []);
    }
    if (!isMouseInCanvas(x, y) || [1, 2].includes(e.button)) {
      return;
    }
    const { dx, dy, w, h } = canvasPos;
    annoMeta.isStart = true;
    annoMeta.startPos = [x, y];
    annoMeta.movePos = [x, y];
    annoMeta.edge = [dy, dx + w, dy + h, dx];
    annoMeta.selectedKeyPointIdx = -1;
    drawer.curAnno?.skeleton?.setSelectedKeyPoint(-1);
    const { annoIdx, pointIdx, keyPointIdx } = drawer.checkMousePoint(x, y);
    if (keyPointIdx !== undefined) {
      drawer.curAnno = drawer.annotations[annoIdx];
      annoMeta.type = 'move-keypoint';
      annoMeta.curPoint = keyPointIdx;
      const [x, y, w, h] = drawer.curAnno.skeleton!.bbox;
      annoMeta.edge = [y, x + w, y + h, x];
    } else if (
      (!drawer.curAnno || drawer.curAnno.isOver) &&
      annoIdx >= 0 &&
      pointIdx >= 0
    ) {
      drawer.curAnno = drawer.annotations[annoIdx];
      annoMeta.type = 'move-point';
      annoMeta.curPoint = pointIdx;
    } else if (
      (!drawer.curAnno || drawer.curAnno.isOver) &&
      annoIdx >= 0 &&
      pointIdx === -1
    ) {
      drawer.curAnno = drawer.annotations[annoIdx];
      annoMeta.type = 'move';
      const bbox = drawer.curAnno.bbox;
      annoMeta.edge = [
        dy + y - bbox[1], //上
        dx + w - (bbox[0] + bbox[2] - x), // 右
        dy + h - (bbox[1] + bbox[3] - y), // 下
        dx + x - bbox[0] // 左
      ];
      annoMeta.startSegs = JSON.parse(
        JSON.stringify(drawer.curAnno.segmentation)
      );
    } else if ([2, 7].includes(taskMeta.type)) {
      annoMeta.type = 'create-bbox';
      const locked = taskMeta.labels.find((v) => v.lock)!;
      drawer.curAnno = new AnnotationSegmentation(labelCanvasRef.value!, {
        segmentation: [
          [x, y],
          [x, y],
          [x, y],
          [x, y]
        ],
        strokeColor: locked.color,
        fillColor: lowerTransparent(locked.color),
        isOver: true,
        id: uuidV4(),
        name: locked.name,
        categroyId: locked.id,
        visible: true
      });
      drawer.annotations.push(drawer.curAnno);
    } else {
      annoMeta.type = 'create-polygon';
    }
  }
  function onMousemove(e: MouseEvent) {
    let x = e.x;
    let y = e.y - 44;
    if (!drawer) {
      return;
    }
    const { annoIdx, pointIdx, keyPointIdx } = drawer.checkMousePoint(x, y);
    if (keyPointIdx !== undefined) {
      labelCanvasRef.value!.style.cursor = annoMeta.isStart
        ? 'grabbing'
        : 'grab';
    } else if (pointIdx === 0) {
      // labelCanvasRef.value!.style.cursor = annoMeta.isStart
      //   ? 'move'
      //   : 'pointer';
      if (drawer.curAnno && !drawer.curAnno.isOver) {
        annoMeta.isReadyOver = true;
        labelCanvasRef.value!.style.cursor = 'pointer';
      }
    } else if (annoIdx >= 0 && (!drawer.curAnno || drawer.curAnno.isOver)) {
      labelCanvasRef.value!.style.cursor = annoMeta.isStart
        ? 'move'
        : 'pointer';
      annoMeta.isReadyOver = false;
    } else {
      labelCanvasRef.value!.style.cursor = 'crosshair';
      annoMeta.isReadyOver = false;
    }

    x = clamp(annoMeta.edge[3], annoMeta.edge[1], x);
    y = clamp(annoMeta.edge[0], annoMeta.edge[2], y);
    annoMeta.movePos = [x, y];
    if (!annoMeta.isStart || !drawer.curAnno) return;
    switch (annoMeta.type) {
      case 'create-polygon': {
        if (!drawer.curAnno.isOver) {
          drawer.curAnno.segmentation[drawer.curAnno.segmentation.length - 1] =
            [x, y];
          drawer.curAnno.setSegmentation(drawer.curAnno.segmentation);
        }
        break;
      }
      case 'create-bbox': {
        const [x1, y1] = annoMeta.startPos;
        const [x2, y2] = annoMeta.movePos;
        const segs: [number, number][] = [
          [x1, y1],
          [x2, y1],
          [x2, y2],
          [x1, y2]
        ];
        drawer.curAnno.setSegmentation(segs);

        break;
      }
      case 'move': {
        const segs = drawer.curAnno.segmentation;
        const oldX = segs[0][0];
        const oldY = segs[0][1];
        segs.forEach((v, i) => {
          v[0] = annoMeta.startSegs[i][0] + x - annoMeta.startPos[0];
          v[1] = annoMeta.startSegs[i][1] + y - annoMeta.startPos[1];
        });
        drawer.curAnno.setSegmentation(
          segs,
          true,
          segs[0][0] - oldX,
          segs[0][1] - oldY
        );

        break;
      }
      case 'move-point': {
        const segs = drawer.curAnno.segmentation;
        segs[annoMeta.curPoint] = [x, y];
        if ([2, 7].includes(taskMeta.type)) {
          // 为矩形，拖拽一个点需要修改三个点的位置
          const anchorIdx = (annoMeta.curPoint + 2) % 4;
          const anchor = segs[anchorIdx];
          switch (anchorIdx) {
            case 0:
              segs[1] = [x, anchor[1]];
              segs[3] = [anchor[0], y];
              break;
            case 1:
              segs[0] = [x, anchor[1]];
              segs[2] = [anchor[0], y];
              break;
            case 2:
              segs[1] = [anchor[0], y];
              segs[3] = [x, anchor[1]];
              break;
            case 3:
              segs[0] = [anchor[0], y];
              segs[2] = [x, anchor[1]];
              break;
          }
        }
        drawer.curAnno.setSegmentation(segs);

        break;
      }
      case 'move-keypoint': {
        const keypoints = drawer.curAnno.skeleton!.keypoints;
        keypoints[annoMeta.curPoint].x = x;
        keypoints[annoMeta.curPoint].y = y;

        break;
      }
    }
  }
  function onMouseup() {
    if (!drawer) return;
    if (!annoMeta.isStart) return;

    switch (annoMeta.type) {
      case 'create-polygon': {
        const [x, y] = annoMeta.movePos;
        const locked = taskMeta.labels.find((v) => v.lock)!;
        if (!drawer.curAnno || drawer.curAnno.isOver) {
          drawer.curAnno = new AnnotationSegmentation(labelCanvasRef.value!, {
            segmentation: [
              [x, y],
              [x, y]
            ],
            strokeColor: locked.color,
            fillColor: 'transparent',
            isOver: false,
            id: uuidV4(),
            name: locked.name,
            categroyId: locked.id,
            visible: true
          });
          drawer.annotations.push(drawer.curAnno);
          inCreating?.(drawer);
        } else {
          if (annoMeta.isReadyOver) {
            annoMeta.isStart = false;
            drawer.curAnno.segmentation.pop();
            if (drawer.curAnno.segmentation.length < 3) {
              const idx = drawer.annotations.findIndex(
                (v) => v.id === drawer!.curAnno!.id
              );
              if (idx >= 0) {
                drawer.annotations.splice(idx, 1);
              }
              drawer.curAnno = null;
              inCreating?.(drawer);
            } else {
              drawer.curAnno.setSegmentation(drawer.curAnno.segmentation);
              drawer.curAnno.isOver = true;
              if (taskMeta.type === 8) {
                drawer.curAnno.skeleton = new Skeleton(labelCanvasRef.value!, {
                  bbox: drawer.curAnno.bbox,
                  color: drawer.curAnno.strokeColor,
                  skeletons: locked.skeletons,
                  keypoints: locked.keypoints
                });
              }
              afterCreate?.(drawer);
            }
          } else {
            drawer.curAnno.segmentation.push([x, y]);
            inCreating?.(drawer);
          }
        }

        break;
      }
      case 'create-bbox': {
        annoMeta.isStart = false;
        const [x1, y1] = annoMeta.startPos;
        const [x2, y2] = annoMeta.movePos;
        if (Math.abs(x1 - x2) < 8 || Math.abs(y1 - y2) < 8) {
          const idx = drawer.annotations.findIndex(
            (v) => v.id === drawer!.curAnno!.id
          );
          if (idx >= 0) {
            drawer.annotations.splice(idx, 1);
          }
        } else {
          afterCreate?.(drawer);
        }

        break;
      }
      case 'move':
      case 'move-point':
      case 'move-keypoint': {
        annoMeta.isStart = false;
        setAnnoByDrawer?.(drawer);
        if (
          JSON.stringify(annoMeta.movePos) !== JSON.stringify(annoMeta.startPos)
        ) {
          afterChange?.(drawer);
        } else if (annoMeta.type === 'move-keypoint') {
          annoMeta.selectedKeyPointIdx = unref(annoMeta.curPoint);
          drawer?.curAnno?.skeleton?.setSelectedKeyPoint(
            annoMeta.selectedKeyPointIdx
          );
        }
        break;
      }
    }
  }
  document.addEventListener('keydown', (e) => {
    if (
      e.code === 'Backspace' &&
      drawer?.curAnno?.skeleton &&
      annoMeta.selectedKeyPointIdx >= 0
    ) {
      deleteKeyPoint?.(annoMeta.selectedKeyPointIdx);
      annoMeta.selectedKeyPointIdx = -1;
      drawer.curAnno.skeleton.setSelectedKeyPoint(-1);
    }
  });
  return {
    setCurAnno,
    setAnnotations,
    setHooks,
    onMousedown,
    onMousemove,
    onMouseup
  };
}
