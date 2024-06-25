import { defineStore, storeToRefs } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import { computed, reactive, ref, watch, watchEffect } from 'vue';
import {
  VideoClassifyAnnotation,
  VideoClassifyClip,
  VideoDetectionAnnotation,
  VideoDetectionAnnotationsMap
} from '../../types/type';
import { XOR } from '../../types/util';
import { AnnotationDrawer } from '../../utils/AnnotationDrawer';
import { HistoryStack } from '../../utils/HistoryStack';
import {
  deepClone,
  getBBoxByPolygon,
  lerpEstimationKeyframes
} from '../../utils/utils';
import { useCurrentTaskStore } from '../currentTaskStore';
import { useInfoStore } from '../infoStore';
import { useVideoStore } from '../videoStore';

type ClassifyData = {
  annotations: VideoClassifyAnnotation[];
  clips: VideoClassifyClip[];
};

type HistoryDetectionData = {
  old: VideoDetectionAnnotationsMap;
  cur: VideoDetectionAnnotationsMap;
};
type HistoryClassifyData = {
  old: ClassifyData;
  cur: ClassifyData;
};

type HistoryData = XOR<HistoryDetectionData, HistoryClassifyData>;

export const useVideoLabelData = defineStore('videoLabelData', () => {
  const {
    videoMeta,
    canvasPos,
    preCanvasPos,
    mediaSize,
    setFrame,
    canvasCoord2Actual,
    actualCoord2Canvas
  } = useVideoStore();
  const { taskMeta, currentTaskMeta } = useInfoStore();
  const { taskItem, jsonStr } = storeToRefs(useCurrentTaskStore());
  const historyStack = reactive(new HistoryStack<HistoryData>());
  // 多目标选择数据(兼容姿态估计)
  const annotationsMap = ref<VideoDetectionAnnotationsMap>({});
  const curAnno = ref<VideoDetectionAnnotation | null>(null);
  const hasDeletedKeyPoint = ref<boolean>(false);
  const selectedKeyframeMeta = reactive({
    hasSelected: false,
    canDelete: false,
    cateId: 0,
    keyIdx: 0,
    annoIdx: 0
  });
  // 视频分类数据
  const classifyData = reactive<ClassifyData>({
    annotations: [],
    clips: []
  });

  // 多目标选择相关操作
  const labels = computed(() => {
    const res: VideoDetectionAnnotation[] = [];
    for (const key in annotationsMap.value) {
      res.push(
        ...annotationsMap.value[key].map((v, i) => {
          v.idx = i;
          return v;
        })
      );
    }
    return res;
  });

  // 根据 curFrame 实时计算 bbox 位置
  watchEffect(() => {
    for (const key in annotationsMap.value) {
      for (const val of annotationsMap.value[key]) {
        if (!val.keyframes.length) {
          continue;
        }
        const nextIdx = val.keyframes.findIndex(
          (v) => v.keyframe > videoMeta.curFrame
        );
        if (nextIdx < 0) {
          if (
            val.keyframes.at(-1)?.lerpAfter ||
            videoMeta.curFrame === val.keyframes.at(-1)?.keyframe
          ) {
            val.polygon = [...val.keyframes.at(-1)!.polygon];
            if (taskMeta.type === 8) {
              val.keypoints = [...val.keyframes.at(-1)!.keypoints];
            }
          } else {
            val.polygon = [];
            val.keypoints = [];
          }
        } else if (nextIdx === 0) {
          val.polygon = [];
          val.keypoints = [];
        } else {
          if (val.keyframes[nextIdx - 1].lerpAfter) {
            const { polygon, keypoints } = lerpEstimationKeyframes(
              val.keyframes[nextIdx - 1],
              val.keyframes[nextIdx],
              videoMeta.curFrame
            );
            val.polygon = polygon;
            val.keypoints = keypoints;
          } else {
            val.polygon = [];
            val.keypoints = [];
          }
        }
      }
    }
  });
  // 根据 curAnno 实时计算 selectedKeyframeMeta
  watchEffect(() => {
    if (!curAnno.value || !curAnno.value) {
      selectedKeyframeMeta.hasSelected = false;
    } else {
      const keyIdx = curAnno.value.keyframes.findIndex(
        (v) => v.keyframe === videoMeta.curFrame
      );
      const cateId = curAnno.value.category_id;
      const annoIdx = annotationsMap.value[cateId].findIndex(
        (v) => v.id === curAnno.value?.id
      );
      if (keyIdx < 0) {
        selectedKeyframeMeta.hasSelected = false;
      } else {
        selectedKeyframeMeta.hasSelected = true;
        selectedKeyframeMeta.keyIdx = keyIdx;
        selectedKeyframeMeta.cateId = cateId;
        selectedKeyframeMeta.annoIdx = annoIdx;
        selectedKeyframeMeta.canDelete =
          annotationsMap.value[cateId][annoIdx].keyframes.length > 1;
      }
    }
  });
  watch(canvasPos, () => {
    const { w: w1, h: h1, dx: dx1, dy: dy1 } = canvasPos;
    const { w: w2, h: h2, dx: dx2, dy: dy2 } = preCanvasPos;
    if (w2 === 0 || h2 === 0) {
      return;
    }
    for (const key in annotationsMap.value) {
      for (const anno of annotationsMap.value[key]) {
        anno.keyframes.forEach((v) => {
          v.polygon.forEach((v) => {
            v[0] = (w1 / w2) * (v[0] - dx2) + dx1;
            v[1] = (h1 / h2) * (v[1] - dy2) + dy1;
          });
          v.keypoints.forEach((t) => {
            t.x = (w1 / w2) * (t.x - dx2) + dx1;
            t.y = (h1 / h2) * (t.y - dy2) + dy1;
          });
        });
      }
    }
  });

  /**
   * 通过canvas里的操作生成关键帧
   * 1. 创建 bbox 或者 polygon
   * 2. 移动 / 缩放 bbox 或者 polygon 以及其内部关键点
   */
  function addKeyframeByCanvas(drawer: AnnotationDrawer) {
    markHistoryOp(() => {
      const frame = videoMeta.curFrame;
      if (!drawer.curAnno) return;
      let anno = labels.value.find((v) => v.id === drawer.curAnno!.id);
      if (anno) {
        anno.polygon = drawer.curAnno!.segmentation;
        curAnno.value = anno;
        curAnno.value.keyframes.push(
          deepClone({
            keyframe: frame,
            polygon: drawer.curAnno!.segmentation,
            lerpAfter: true,
            keypoints: deepClone(
              drawer.curAnno.skeleton?.keypoints.map((v) => ({
                x: v.x,
                y: v.y,
                visible: v.visible,
                name: v.name
              })) || []
            )
          })
        );
      } else {
        anno = {
          id: drawer.curAnno.id,
          color: drawer.curAnno.strokeColor,
          polygon: deepClone(drawer.curAnno.points.map((v) => [v.x, v.y])),
          category_id: drawer.curAnno.categroyId,
          name: drawer.curAnno.name,
          visible: true,
          keyframes: [],
          isOver: drawer.curAnno.isOver,
          keypoints: drawer.curAnno.skeleton
            ? deepClone(
                drawer.curAnno.skeleton.keypoints.map((v) => ({
                  x: v.x,
                  y: v.y,
                  visible: true,
                  name: v.name
                }))
              )
            : []
        };
        curAnno.value = anno;
        if (!annotationsMap.value[anno.category_id]) {
          annotationsMap.value[anno.category_id] = [];
        }
        annotationsMap.value[anno.category_id].push(curAnno.value);
        curAnno.value.keyframes.push(
          deepClone({
            keyframe: videoMeta.curFrame,
            polygon: curAnno.value.polygon,
            keypoints: curAnno.value.keypoints,
            lerpAfter: true
          })
        );
      }
    });
    curAnno.value!.keyframes = curAnno.value!.keyframes.sort(
      (a, b) => a.keyframe - b.keyframe
    );
  }
  // 通过点击按钮生成关键帧
  function addKeyframe() {
    markHistoryOp(() => {
      const frame = videoMeta.curFrame;
      if (!curAnno.value) return;
      if (curAnno.value.keyframes.some((v) => v.keyframe === frame)) return;
      let polygon = deepClone(curAnno.value.polygon);
      let keypoints = deepClone(curAnno.value.keypoints);
      if (curAnno.value.keyframes.length > 0) {
        if (frame < curAnno.value.keyframes[0].keyframe) {
          polygon = deepClone(curAnno.value.keyframes[0].polygon);
          keypoints = deepClone(curAnno.value.keyframes[0].keypoints);
        } else if (
          frame > curAnno.value.keyframes.at(-1)!.keyframe &&
          !curAnno.value.keyframes.at(-1)?.lerpAfter
        ) {
          polygon = deepClone(curAnno.value.keyframes.at(-1)!.polygon);
          keypoints = deepClone(curAnno.value.keyframes.at(-1)!.keypoints);
        }
      }
      curAnno.value.keyframes.push(
        deepClone({
          keyframe: frame,
          polygon,
          keypoints,
          lerpAfter: true
        })
      );
      curAnno.value.keyframes = curAnno.value.keyframes.sort(
        (a, b) => a.keyframe - b.keyframe
      );
    });
  }
  function changePolygon(drawer: AnnotationDrawer, keyIdx: number) {
    markHistoryOp(() => {
      if (!curAnno.value) return;
      curAnno.value.keyframes[keyIdx].polygon = deepClone(
        drawer.curAnno!.segmentation
      );
      curAnno.value.keyframes[keyIdx].keypoints = deepClone(
        drawer.curAnno!.skeleton?.keypoints.map((v) => ({
          x: v.x,
          y: v.y,
          visible: v.visible,
          name: v.name
        })) || []
      );
    });
  }
  function deleteKeyframe() {
    markHistoryOp(() => {
      if (
        !selectedKeyframeMeta.hasSelected ||
        !selectedKeyframeMeta.canDelete
      ) {
        return;
      }
      const cateId = selectedKeyframeMeta.cateId!;
      const annoId = selectedKeyframeMeta.annoIdx!;
      annotationsMap.value[cateId][annoId].keyframes.splice(
        selectedKeyframeMeta.keyIdx!,
        1
      );
      if (!annotationsMap.value[cateId][annoId].keyframes.length) {
        curAnno.value = null;
      }
      annotationsMap.value[cateId] = annotationsMap.value[cateId].filter(
        (v) => v.keyframes.length
      );
    });
  }
  function deleteKeyPoint(keypointIdx: number) {
    markHistoryOp(() => {
      if (!curAnno.value) {
        return;
      }
      const polygon = deepClone(curAnno.value.polygon);
      const keypoints = deepClone(curAnno.value.keypoints);
      keypoints[keypointIdx].visible = false;
      const frame = videoMeta.curFrame;
      const existKeyframe = curAnno.value.keyframes.find(
        (v) => v.keyframe === frame
      );
      if (existKeyframe) {
        existKeyframe.keypoints = keypoints;
      } else {
        curAnno.value.keyframes.push(
          deepClone({
            keyframe: frame,
            polygon,
            keypoints,
            lerpAfter: true
          })
        );
        curAnno.value.keyframes = curAnno.value.keyframes.sort(
          (a, b) => a.keyframe - b.keyframe
        );
      }

      hasDeletedKeyPoint.value = true;
    });
  }
  function showAllKeyPoints() {
    markHistoryOp(() => {
      if (!curAnno.value) {
        return;
      }
      const polygon = deepClone(curAnno.value.polygon);
      const keypoints = deepClone(curAnno.value.keypoints);
      keypoints.forEach((v) => (v.visible = true));
      const frame = videoMeta.curFrame;
      const existKeyframe = curAnno.value.keyframes.find(
        (v) => v.keyframe === frame
      );
      if (existKeyframe) {
        existKeyframe.keypoints = keypoints;
      } else {
        curAnno.value.keyframes.push(
          deepClone({
            keyframe: frame,
            polygon,
            keypoints,
            lerpAfter: true
          })
        );
        curAnno.value.keyframes = curAnno.value.keyframes.sort(
          (a, b) => a.keyframe - b.keyframe
        );
      }
    });
  }
  function deleteAnnotation() {
    switch (taskMeta.type) {
      case 6: {
        if (currentTaskMeta.curAnnotation === -1) return;
        markHistoryOp(() => {
          classifyData.annotations.splice(currentTaskMeta.curAnnotation, 1);
          currentTaskMeta.curAnnotation = -1;
        });
        break;
      }
      case 7:
      case 8: {
        if (hasDeletedKeyPoint.value) {
          hasDeletedKeyPoint.value = false;
          return;
        }
        markHistoryOp(() => {
          if (!curAnno.value) {
            return;
          }
          annotationsMap.value[curAnno.value.category_id] =
            annotationsMap.value[curAnno.value.category_id].filter(
              (v) => v.id !== curAnno.value?.id
            );
          if (annotationsMap.value[curAnno.value.category_id].length === 0) {
            delete annotationsMap.value[curAnno.value.category_id];
          }
          curAnno.value = null;
        });
        break;
      }
    }
  }
  function toggleKeyframeLerpAfter() {
    markHistoryOp(() => {
      if (!curAnno.value) return;
      const nextFrame = curAnno.value.keyframes.findIndex(
        (v) => v.keyframe > videoMeta.curFrame
      );
      if (nextFrame <= 0) {
        curAnno.value.keyframes.at(-1)!.lerpAfter =
          !curAnno.value.keyframes.at(-1)!.lerpAfter;
      } else {
        curAnno.value.keyframes[nextFrame - 1].lerpAfter =
          !curAnno.value.keyframes[nextFrame - 1].lerpAfter;
      }
    });
  }
  function preKeyframe() {
    if (!curAnno.value) return;
    let preFrame;
    for (let i = curAnno.value.keyframes.length - 1; i >= 0; i--) {
      if (curAnno.value.keyframes[i].keyframe < videoMeta.curFrame) {
        preFrame = curAnno.value.keyframes[i];
        break;
      }
    }
    if (preFrame) {
      setFrame(preFrame.keyframe);
    }
  }
  function nextKeyframe() {
    if (!curAnno.value) return;
    const nextFrame = curAnno.value.keyframes.find(
      (v) => v.keyframe > videoMeta.curFrame
    );
    if (nextFrame) {
      setFrame(nextFrame.keyframe);
    }
  }
  async function clearAllLabels() {
    switch (taskMeta.type) {
      case 6: {
        markHistoryOp(() => {
          classifyData.annotations = [];
          classifyData.clips = [];
        });

        break;
      }
      case 7:
      case 8: {
        markHistoryOp(() => {
          curAnno.value = null;
          annotationsMap.value = {};
        });
        break;
      }
    }
  }

  // 视频分类操作
  function normalizeClips() {
    const validClipIdSet = new Set(
      classifyData.annotations.map((v) => v.clipId)
    );
    classifyData.clips = classifyData.clips.filter((v) =>
      validClipIdSet.has(v.id as number)
    );
  }
  function addTempClip(startFrame: number, endFrame: number) {
    const clips = classifyData.clips;
    if (clips[0] && clips[0].isTemp) {
      clips[0].start_frame = startFrame;
      clips[0].end_frame = endFrame;
    } else {
      clips.unshift({
        start_frame: startFrame,
        end_frame: endFrame,
        id: clips.length,
        isTemp: true,
        color: 'none'
      });
    }
  }
  function addClassifyAnnotation(
    startFrame: number,
    endFrame: number,
    cateId: number
  ) {
    markHistoryOp(() => {
      const cate = taskMeta.labels[cateId];
      // 新的标注和旧的标注有交集那么就合二为一
      const toDel = new Set<number>();
      for (let i = 0; i < classifyData.annotations.length; i++) {
        const v = classifyData.annotations[i];
        if (v.category_id !== cateId) {
          continue;
        }
        const annoClip = classifyData.clips.find((c) => c.id === v.clipId);
        if (!annoClip) {
          console.error('不可能吧');
          continue;
        }
        if (
          annoClip.end_frame >= startFrame &&
          annoClip.start_frame <= endFrame
        ) {
          toDel.add(i);
          startFrame = Math.min(annoClip.start_frame, startFrame);
          endFrame = Math.max(annoClip.end_frame, endFrame);
        }
      }
      classifyData.annotations = classifyData.annotations.filter(
        (_, i) => !toDel.has(i)
      );
      const anno: VideoClassifyAnnotation = {
        clipId: 0,
        category_id: cateId,
        id: classifyData.annotations.length,
        color: cate.color
      };
      const clip = classifyData.clips.find(
        (v) =>
          v.start_frame === startFrame && v.end_frame === endFrame && !v.isTemp
      );
      anno.clipId = clip?.id || uuidv4();
      classifyData.annotations.push(anno);
      if (!clip) {
        classifyData.clips.push({
          start_frame: startFrame,
          end_frame: endFrame,
          id: anno.clipId,
          color: cate.color
        });
      }
    });
  }
  function markHistoryOp(cb: () => void) {
    if (taskMeta.type === 7 || taskMeta.type === 8) {
      const old = deepClone(annotationsMap.value);
      cb();
      const cur = deepClone(annotationsMap.value);
      historyStack.pushCancelStack({
        old,
        cur
      });
    } else {
      const old = deepClone(classifyData);
      cb();
      const cur = deepClone(classifyData);
      historyStack.pushCancelStack({
        old,
        cur
      });
    }
    historyStack.clearHistoryStack('redo');
  }

  function undo() {
    let record = historyStack.cancelStack.at(-1);
    if (!record) {
      return;
    }
    if (taskMeta.type === 7 || taskMeta.type === 8) {
      record = record as HistoryDetectionData;
      curAnno.value = null;
      const toDel = [];
      for (const key in record.old) {
        if (record.old[key].length === 0) {
          toDel.push(key);
        }
      }
      const old = record.old!;
      toDel.forEach((v) => delete old[v as keyof typeof old]);
      annotationsMap.value = old;
    } else if (taskMeta.type === 6) {
      record = record as HistoryClassifyData;
      classifyData.annotations = record.old.annotations;
      classifyData.clips = record.old.clips;
    }
    historyStack.popCancelStack();
    historyStack.pushRedoStack(record);
  }

  function redo() {
    let record = historyStack.redoStack.at(-1);
    if (!record) {
      return;
    }
    if (taskMeta.type === 7 || taskMeta.type === 8) {
      record = record as HistoryDetectionData;
      curAnno.value = null;
      annotationsMap.value = record.cur;
    } else if (taskMeta.type === 6) {
      record = record as HistoryClassifyData;
      classifyData.annotations = record.cur.annotations;
      classifyData.clips = record.cur.clips;
    }
    historyStack.popRedoStack();
    historyStack.pushCancelStack(record);
  }
  function initData() {
    if (taskMeta.type === 6) {
      classifyData.annotations = [];
      classifyData.clips = [];
      if (jsonStr.value) {
        const { annotations, clips } = JSON.parse(jsonStr.value);
        classifyData.annotations = annotations.map((v: any) => {
          const cate = taskMeta.labels.find((a) => a.id === v.category_id)!;
          const anno: VideoClassifyAnnotation = {
            clipId: v.image_id,
            category_id: v.category_id,
            color: cate.color,
            id: v.id
          };
          return anno;
        });
        classifyData.clips = clips;
      }
    } else {
      annotationsMap.value = {};
      curAnno.value = null;
      if (jsonStr.value) {
        const annotations = JSON.parse(jsonStr.value).annotations;
        annotations.forEach((v: any) => {
          const cate = taskMeta.labels.find((t) => t.id === v.category_id);
          if (cate) {
            if (!annotationsMap.value[cate.id]) {
              annotationsMap.value[cate.id] = [];
            }
            const anno: VideoDetectionAnnotation = {
              polygon: [],
              category_id: cate.id,
              color: cate.color,
              id: v.id,
              name: cate.name,
              visible: true,
              isOver: true,
              keypoints: [],
              track_id: v.track_id,
              keyframes: v.keyframes.map((t: any) => ({
                keyframe: t.keyframe,
                lerpAfter: t.lerpAfter,
                polygon: t.segmentation.map((p: [number, number]) =>
                  actualCoord2Canvas(p)
                ),
                keypoints: t.keypoints.map(
                  (p: [number, number, number], i: number) => {
                    const [x, y] = actualCoord2Canvas([p[0], p[1]]);
                    return {
                      x,
                      y,
                      name: cate.keypoints[i].name,
                      visible: p[2] === 1
                    };
                  }
                )
              }))
            };
            annotationsMap.value[cate.id].push(anno);
          }
        });
      }
    }
  }
  function getResult() {
    const categories = taskMeta.labels.map((v) => ({
      id: v.id,
      name: v.name
    }));
    const info = {
      contributor: 'Modelwhale Label Tool',
      date_created: Date.now(),
      version: '1.0'
    };
    if (taskMeta.type === 6) {
      normalizeClips();
      const annotations = deepClone(classifyData.annotations).map((v) => {
        const anno: Record<string, any> = {};
        anno.area = 0;
        anno.bbox = [0, 0, 0, 0];
        anno.segmentation = [];
        anno.iscrowd = 0;
        anno.ignore = 0;
        anno.category_id = v.category_id;
        anno.id = v.id;
        anno.image_id = v.clipId;
        return anno;
      });
      const clips = deepClone(classifyData.clips)
        .filter((v) => !v.isTemp)
        .map((v) => {
          const clip: Record<string, any> = {};
          clip.width = mediaSize.w;
          clip.height = mediaSize.h;
          clip.id = v.id;
          clip.file_name = `${taskItem.value!.bucket}/${taskItem.value!.key}`;
          clip.start_frame = v.start_frame;
          clip.end_frame = v.end_frame;
          return clip;
        });
      return {
        annotations,
        categories,
        clips,
        info
      };
    } else {
      const annotations = deepClone(labels.value).map((v, i) => {
        const anno: Record<string, any> = {};
        anno.visible = true;
        anno.image_id = 0;
        anno.ignore = 0;
        anno.iscrowd = 0;
        anno.id = v.id;
        anno.category_id = v.category_id;
        anno.track_id = i;
        anno.segmentation = [];
        anno.bbox = [];
        anno.area = 0;
        anno.keypoints = [];
        anno.keyframes = v.keyframes.map((k) => {
          const keyframe: Record<string, any> = {};
          keyframe.keyframe = k.keyframe;
          keyframe.lerpAfter = k.lerpAfter;
          keyframe.keypoints = k.keypoints.map((p) => [
            ...canvasCoord2Actual([p.x, p.y]),
            p.visible ? 1 : 0
          ]);
          keyframe.segmentation = k.polygon.map((p) => canvasCoord2Actual(p));
          keyframe.bbox = getBBoxByPolygon(keyframe.segmentation);
          return keyframe;
        });
        return anno;
      });
      const images = [
        {
          file_name: `${taskItem.value!.bucket}/${taskItem.value!.key}`,
          width: mediaSize.w,
          height: mediaSize.h,
          totalFrameCount: videoMeta.totalFrameCount,
          fps: videoMeta.frameRate,
          id: taskItem.value!.fileKey
        }
      ];
      return {
        annotations,
        categories,
        images,
        info
      };
    }
  }
  return {
    historyStack,
    annotationsMap,
    classifyData,
    curAnno,
    selectedKeyframeMeta,
    labels,
    addKeyframe,
    addKeyframeByCanvas,
    changePolygon,
    deleteKeyframe,
    deleteKeyPoint,
    showAllKeyPoints,
    deleteAnnotation,
    toggleKeyframeLerpAfter,
    preKeyframe,
    nextKeyframe,
    clearAllLabels,
    redo,
    undo,
    normalizeClips,
    addTempClip,
    addClassifyAnnotation,
    getResult,
    initData
  };
});
