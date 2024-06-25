import { defineStore, storeToRefs } from 'pinia';
import { v4 as uuidV4 } from 'uuid';
import { computed, reactive, ref, watch } from 'vue';
import { ImageDetectionAnnotation } from '../../types/type';
import { XOR } from '../../types/util';
import { AnnotationDrawer } from '../../utils/AnnotationDrawer';
import { HistoryStack } from '../../utils/HistoryStack';
import { deepClone, getBBoxByPolygon } from '../../utils/utils';
import { useCurrentTaskStore } from '../currentTaskStore';
import { useImageStore } from '../imageStore';
import { useInfoStore } from '../infoStore';

type HistoryClassifyData = {
  old: number[];
  cur: number[];
};
type HistoryDetectionData = {
  old: ImageDetectionAnnotation[];
  cur: ImageDetectionAnnotation[];
};
type HistoryData = XOR<HistoryClassifyData, HistoryDetectionData>;

export const useImageLabelData = defineStore('imageLabelData', () => {
  const { taskMeta } = useInfoStore();
  const {
    canvasPos,
    preCanvasPos,
    mediaSize,
    canvasCoord2Actual,
    actualCoord2Canvas
  } = useImageStore();
  const { taskItem, jsonStr } = storeToRefs(useCurrentTaskStore());
  const historyStack = reactive(new HistoryStack<HistoryData>());
  const detectionData = ref<ImageDetectionAnnotation[]>([]);
  const classifyData = ref<number[]>([]);
  const curAnno = ref<ImageDetectionAnnotation | null>(null);

  const detectionDataMap = computed(() => {
    const map: Record<string, ImageDetectionAnnotation[]> = {};
    taskMeta.labels.forEach((v) => (map[v.id] = []));
    detectionData.value.forEach((v) => {
      map[v.category_id].push(v);
    });
    return map;
  });

  watch(canvasPos, () => {
    const { w: w1, h: h1, dx: dx1, dy: dy1 } = canvasPos;
    const { w: w2, h: h2, dx: dx2, dy: dy2 } = preCanvasPos;
    if (w2 === 0 || h2 === 0) {
      return;
    }
    detectionData.value.forEach((v) => {
      v.polygon.forEach((v) => {
        v[0] = (w1 / w2) * (v[0] - dx2) + dx1;
        v[1] = (h1 / h2) * (v[1] - dy2) + dy1;
      });
    });
  });

  function changeClassifyData(labelId: number) {
    markHistoryOp(() => {
      if (taskMeta.canMulti) {
        if (classifyData.value.includes(labelId)) {
          classifyData.value = classifyData.value.filter((v) => v !== labelId);
        } else {
          classifyData.value.push(labelId);
        }
      } else {
        classifyData.value[0] = labelId;
      }
    });
  }

  function addDetectionAnnotation() {
    if (!curAnno.value) {
      return;
    }
    markHistoryOp(() => {
      detectionData.value.push(curAnno.value!);
    });
  }

  function changePolygon(drawer: AnnotationDrawer) {
    if (!curAnno.value || !drawer.curAnno) {
      return;
    }
    markHistoryOp(() => {
      curAnno.value!.polygon = drawer.curAnno!.segmentation;
    });
  }

  function toggleLabel(idx: number) {
    if (
      !curAnno.value ||
      curAnno.value.category_id === taskMeta.labels[idx].id
    ) {
      return;
    }
    markHistoryOp(() => {
      const delIdx = detectionData.value.findIndex(
        (v) => v.id === curAnno.value!.id
      );
      curAnno.value = {
        polygon: curAnno.value!.polygon,
        id: uuidV4(),
        color: taskMeta.labels[idx].color,
        category_id: taskMeta.labels[idx].id,
        name: taskMeta.labels[idx].name,
        visible: true,
        isOver: true
      };
      detectionData.value.push(curAnno.value);
      detectionData.value.splice(delIdx, 1);
    });
  }

  function deleteAnnotation(idx?: number) {
    if (idx === undefined && curAnno.value) {
      idx = detectionData.value.findIndex((v) => v.id === curAnno.value!.id)!;
    }
    markHistoryOp(() => {
      detectionData.value.splice(idx!, 1);
    });
  }

  function clearAllLabels() {
    markHistoryOp(() => {
      classifyData.value = [];
      detectionData.value = [];
    });
  }

  function markHistoryOp(cb: () => void) {
    if (taskMeta.type === 1 || taskMeta.type === 2) {
      const old = deepClone(detectionData.value);
      cb();
      const cur = deepClone(detectionData.value);
      historyStack.pushCancelStack({
        old,
        cur
      });
    } else {
      const old = deepClone(classifyData.value);
      cb();
      const cur = deepClone(classifyData.value);
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
    if (taskMeta.type === 1 || taskMeta.type === 2) {
      record = record as HistoryDetectionData;
      curAnno.value = null;
      detectionData.value = record.old;
    } else if (taskMeta.type === 3) {
      record = record as HistoryClassifyData;
      classifyData.value = record.old;
      classifyData.value = record.old;
    }
    historyStack.popCancelStack();
    historyStack.pushRedoStack(record);
  }

  function redo() {
    let record = historyStack.redoStack.at(-1);
    if (!record) {
      return;
    }
    if (taskMeta.type === 1 || taskMeta.type === 2) {
      record = record as HistoryDetectionData;
      curAnno.value = null;
      detectionData.value = record.cur;
    } else if (taskMeta.type === 3) {
      record = record as HistoryClassifyData;
      classifyData.value = record.cur;
      classifyData.value = record.cur;
    }
    historyStack.popRedoStack();
    historyStack.pushCancelStack(record);
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
    const images = [
      {
        file_name: `${taskItem.value!.bucket}/${taskItem.value!.key}`,
        width: mediaSize.w,
        height: mediaSize.h,
        id: taskItem.value!.fileId
      }
    ];
    if (taskMeta.type === 3) {
      const annotations = deepClone(classifyData.value).map((v) => {
        const anno: Record<string, any> = {};
        anno.visible = true;
        anno.image_id = 0;
        anno.ignore = 0;
        anno.iscrowd = 0;
        anno.id = v;
        anno.category_id = v;
        anno.segmentation = [];
        anno.bbox = [];
        anno.area = 0;
        return anno;
      });
      return {
        annotations,
        images,
        categories,
        info
      };
    } else {
      const annotations = deepClone(detectionData.value).map((v) => {
        const anno: Record<string, any> = {};
        anno.visible = true;
        anno.image_id = 0;
        anno.ignore = 0;
        anno.iscrowd = 0;
        anno.id = v.id;
        anno.category_id = v.category_id;
        anno.segmentation = v.polygon.map((p) => canvasCoord2Actual(p));
        anno.bbox = getBBoxByPolygon(anno.segmentation);
        if (taskMeta.type === 2) {
          anno.segmentation = [];
        }
        anno.area = anno.bbox[2] * anno.bbox[3];
        return anno;
      });
      return {
        annotations,
        images,
        categories,
        info
      };
    }
  }

  function initData() {
    if (taskMeta.type === 3) {
      classifyData.value = [];
      if (jsonStr.value) {
        const annotations = JSON.parse(jsonStr.value).annotations;
        annotations.forEach((v: any) => {
          classifyData.value.push(v.category_id);
        });
      }
    } else {
      detectionData.value = [];
      curAnno.value = null;
      if (jsonStr.value) {
        const annotations = JSON.parse(jsonStr.value).annotations;
        annotations.forEach((v: any) => {
          const cate = taskMeta.labels.find((t) => t.id === v.category_id);
          if (!v.segmentation?.length && v.bbox.length) {
            v.segmentation = [
              [v.bbox[0], v.bbox[1]],
              [v.bbox[0] + v.bbox[2], v.bbox[1]],
              [v.bbox[0] + v.bbox[2], v.bbox[1] + v.bbox[3]],
              [v.bbox[0], v.bbox[1] + v.bbox[3]]
            ];
          }
          if (cate) {
            const anno: ImageDetectionAnnotation = {
              polygon: v.segmentation.map((v: [number, number]) =>
                actualCoord2Canvas(v)
              ),
              category_id: cate.id,
              color: cate.color,
              id: v.id,
              name: cate.name,
              visible: true,
              isOver: true
            };
            detectionData.value.push(anno);
          }
        });
      }
    }
  }

  return {
    historyStack,
    detectionData,
    classifyData,
    curAnno,
    detectionDataMap,
    changeClassifyData,
    addDetectionAnnotation,
    deleteAnnotation,
    clearAllLabels,
    getResult,
    initData,
    changePolygon,
    undo,
    redo,
    toggleLabel
  };
});
