<template>
  <div
    class="text-label-content custom-scrollbar max-h-[calc(100vh-44px)] overflow-y-auto text-[20px] leading-[2.3] p-4 selection:bg-disabled selection:h-5"
  >
    <div
      ref="contentEle"
      class="content relative max-w-[800px] mx-auto whitespace-pre-wrap select-text"
      @mousedown="onMousedown"
      @mouseup="onMouseup"
      v-text="ossData"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { Message } from 'heywhale-ui';
import { storeToRefs } from 'pinia';
import { nextTick, ref, watch } from 'vue';
import { useCurrentTaskStore } from '../../store/currentTaskStore';
import { useInfoStore } from '../../store/infoStore';
import { useTextLabelData } from '../../store/label-data/textLabelData';
import type {
  LabelCategory,
  RangeWithText,
  TextLabelElement,
  TextLabelSelection,
  TextRecognitionAnnotation
} from '../../types/type';
import { lowerTransparent } from '../../utils/utils';

const { taskMeta, currentTaskMeta } = useInfoStore();
const { ossData } = storeToRefs(useCurrentTaskStore());
const { deleteRecognitionAnnotationByStart, initData } = useTextLabelData();
const { recognitionData } = storeToRefs(useTextLabelData());

const contentEle = ref<HTMLElement>();
let isPending = true;
let currentSelectionEle: TextLabelElement | null = null;

watch(ossData, () => {
  initData();
  initUILabels();
  currentTaskMeta.isRequesting = false;
});

function onMousedown() {
  nextTick(() => {
    if (currentSelectionEle && isPending) {
      deleteLabel(currentSelectionEle);
    }
  });
}
function onMouseup() {
  if (taskMeta.type !== 5) {
    return;
  }
  const selection = document.getSelection() as TextLabelSelection;
  if (!selection?.toString()) {
    return;
  }
  const range = selection.getRangeAt(0);
  if (
    selection.focusNode.parentNode.className === 'select-span' ||
    selection.anchorNode.parentNode.className === 'select-span' ||
    selection.focusNode !== selection.anchorNode
  ) {
    selection.empty();
    return Message.error('无法选中');
  }
  if (
    !selection.focusNode.parentNode.className.includes('content') ||
    !selection.anchorNode.parentNode.className.includes('content')
  ) {
    return;
  }
  createLabelElement(selection.toString());
  selection.deleteFromDocument();
  selection.empty();
  range.insertNode(currentSelectionEle!);
  const locked = taskMeta.labels.find((v) => v.lock);
  if (locked) {
    createRecognitionAnnotation(locked);
  }
}
function createRecognitionAnnotation(labelCate: LabelCategory) {
  const res = makeLabelElementOver(labelCate.name, labelCate.color);
  if (res) {
    const [start, end] = res;
    const anno: TextRecognitionAnnotation = {
      label: labelCate.id,
      start,
      end
    };
    recognitionData.value.push(anno);
  }
}
function createLabelElement(selectText: string, doNormalize = true) {
  const label = document.createElement('span') as TextLabelElement;
  label.className = 'select-span';
  const startPlaceholderEle = document.createElement('span');
  startPlaceholderEle.className = 'start-placeholder';
  startPlaceholderEle.innerHTML = ' ';
  label.appendChild(startPlaceholderEle);
  const contentText = document.createTextNode(selectText);
  label.appendChild(contentText);
  const endPlaceholderEle = document.createElement('span');
  endPlaceholderEle.innerHTML = ' ';
  endPlaceholderEle.className = 'end-placeholder';
  label.appendChild(endPlaceholderEle);
  const closeIcon = document.createElement('i');
  closeIcon.className = 'iconfont icon-cha close-icon';
  closeIcon.addEventListener('click', () => {
    deleteLabel(label);
    deleteRecognitionAnnotationByStart(label.start);
  });
  endPlaceholderEle.appendChild(closeIcon);
  const labeledName = document.createElement('span');
  labeledName.className = 'labeled-name';
  labeledName.innerHTML = '';
  startPlaceholderEle.appendChild(labeledName);
  if (doNormalize) {
    setTimeout(() => {
      normalizeAllLabelElements();
    }, 1);
  }
  isPending = true;
  label.start = 0;
  label.labelNameEle = labeledName;
  currentSelectionEle = label;
  return label as TextLabelElement;
}
// 将待定状态的 labelElement 标记为已完成
function makeLabelElementOver(labelText: string, bgColor: string) {
  if (!currentSelectionEle || isPending === false) {
    return;
  }
  currentSelectionEle.style.backgroundColor = lowerTransparent(bgColor);
  currentSelectionEle.labelNameEle.innerHTML = labelText;
  currentSelectionEle.labelNameEle.style.color = bgColor;
  let start = 0;
  const textLength = (currentSelectionEle.firstChild?.nextSibling as Text)
    .length;
  let previous = currentSelectionEle.previousSibling;
  while (previous) {
    if (previous instanceof Text) {
      start += previous.length;
    } else {
      start += (previous.firstChild!.nextSibling as Text).length;
    }
    previous = previous.previousSibling;
  }
  isPending = false;
  currentSelectionEle.start = start;
  return [start, start + textLength];
}
function normalizeAllLabelElements() {
  function normalizeLabelElement(
    label: TextLabelElement,
    startPlaceholderEle: HTMLElement,
    endPlaceholderEle: HTMLElement
  ) {
    const labeledName = label.labelNameEle;
    const { offsetLeft: x1, offsetTop: y1 } = startPlaceholderEle;
    const { offsetLeft: x2, offsetTop: y2 } = endPlaceholderEle;
    const w = label.offsetWidth;
    const yDis = y2 - y1;
    if (yDis === 0) {
      // 一行
      labeledName.style.maxWidth = `${x2 - x1}px`;
    } else if (yDis <= 50) {
      // 两行标注，哪行长标在哪
      if (w - x1 >= x2) {
        labeledName.style.maxWidth = `${w - x1}px`;
      } else {
        labeledName.style.left = `${-x1}px`;
        labeledName.style.bottom = '-60px';
        labeledName.style.maxWidth = `${x2}px`;
      }
    } else {
      // 三行及以上，显示在第二行开始
      labeledName.style.left = `${-x1}px`;
      labeledName.style.bottom = '-60px';
    }
  }
  const labelElements = contentEle.value!.querySelectorAll('.select-span');
  labelElements.forEach((v) => {
    const startPlaceholderEle = v.firstChild as HTMLElement;
    const endPlaceholderEle = v.lastChild as HTMLElement;
    const label = v as TextLabelElement;
    normalizeLabelElement(label, startPlaceholderEle, endPlaceholderEle);
  });
}

function deleteLabel(element: TextLabelElement) {
  element.parentNode?.replaceChild(element.firstChild!.nextSibling!, element);
  contentEle.value!.normalize();
  normalizeAllLabelElements();
  currentSelectionEle = null;
}

function deleteAllLabels() {
  if (!contentEle.value) return;
  for (let i = 0, l = contentEle.value.children.length; i < l; i++) {
    const labelEle = contentEle.value.children[0] as TextLabelElement;
    deleteLabel(labelEle);
  }
}

function getRangesByData(contentEle: HTMLElement) {
  const ranges: RangeWithText[] = [];
  recognitionData.value.forEach((v) => {
    const range = document.createRange() as RangeWithText;
    const startNode = contentEle.firstChild as Text;
    range.setStart(startNode, v.start!);
    range.setEnd(startNode, v.end!);
    range.text = startNode.data.slice(v.start, v.end);
    range.label = v.label;
    ranges.push(range);
  });
  return ranges;
}

function initUILabels() {
  const element = document
    .querySelector('.text-label-content')!
    .querySelector('.content')! as HTMLElement;
  if (!element.firstChild) {
    nextTick(() => {
      initUILabels();
    });
    return;
  }
  const ranges = getRangesByData(element);
  ranges.forEach((v, idx) => {
    v.deleteContents();
    const labelElement = createLabelElement(v.text, idx === ranges.length - 1);
    v.insertNode(labelElement);
    const label = taskMeta.labels.find((t) => t.id === v.label)!;
    makeLabelElementOver(label.name, label.color);
  });
}

defineExpose({
  deleteAllLabels,
  createRecognitionAnnotation
});
</script>

<style lang="scss">
.text-label-content {
  .select-span {
    background-color: $disabled;
    display: inline;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
    line-height: 1;
    padding: 2px 0;
    word-break: break-all;
    .start-placeholder,
    .end-placeholder {
      position: relative;
      background-color: #fff !important;
      padding: 2px 0;
    }
    .close-icon {
      display: none;
      position: absolute;
      right: 0px;
      top: -8px;
      width: 14px;
      height: 14px;
      color: $primary-main;
      cursor: pointer;
    }
    .labeled-name {
      @include single-ellipsis;
      position: absolute;
      left: 6px;
      bottom: -14px;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.3;
      color: $error;
      word-break: keep-all;
    }
    &:hover {
      .close-icon {
        display: block;
      }
    }
  }
}
</style>
