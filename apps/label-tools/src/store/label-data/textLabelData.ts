import { defineStore, storeToRefs } from 'pinia';
import { ref } from 'vue';
import { TextRecognitionAnnotation } from '../../types/type';
import { useCurrentTaskStore } from '../currentTaskStore';
import { useInfoStore } from '../infoStore';

export const useTextLabelData = defineStore('textLabelData', () => {
  const { taskMeta } = useInfoStore();
  const classifyData = ref<number[]>([]);
  const recognitionData = ref<TextRecognitionAnnotation[]>([]);
  const { jsonStr } = storeToRefs(useCurrentTaskStore());
  function toggleClassifyData(idx: number) {
    if (taskMeta.canMulti) {
      if (classifyData.value.includes(idx)) {
        classifyData.value = classifyData.value.filter((v) => v !== idx);
      } else {
        classifyData.value.push(idx);
      }
    } else {
      classifyData.value[0] = idx;
    }
  }
  function deleteRecognitionAnnotationByStart(start: number) {
    const idx = recognitionData.value.findIndex((v) => v.start === start);
    if (idx >= 0) {
      recognitionData.value.splice(idx, 1);
    }
  }
  function clearAllLabels() {
    classifyData.value = [];
    recognitionData.value = [];
  }
  function getResult() {
    const outputs: Record<string, any>[] = [];
    if (taskMeta.type === 4) {
      classifyData.value.forEach((v) => {
        outputs.push({
          label: v
        });
      });
    } else {
      outputs.push(...recognitionData.value);
    }
    return outputs;
  }
  function initData() {
    classifyData.value = [];
    recognitionData.value = [];
    if (taskMeta.type === 4 && jsonStr.value) {
      const outputs = JSON.parse(jsonStr.value);
      outputs.forEach((v: any) => {
        classifyData.value.push(v.label);
      });
    } else if (taskMeta.type === 5 && jsonStr.value) {
      const outputs = JSON.parse(jsonStr.value);
      outputs.forEach((v: any) => {
        recognitionData.value.push({
          label: v.label,
          start: v.start,
          end: v.end
        });
      });
    }
  }
  return {
    classifyData,
    recognitionData,
    toggleClassifyData,
    deleteRecognitionAnnotationByStart,
    clearAllLabels,
    getResult,
    initData
  };
});
