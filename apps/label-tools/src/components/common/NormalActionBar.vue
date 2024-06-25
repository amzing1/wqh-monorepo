<template>
  <div
    class="box-shadow w-full h-full flex justify-between items-center px-6 border-b border-solid border-border"
  >
    <span class="text-common single-line-text w-2/5">
      <a class="flex-center" @click="goTaskPage">
        <i class="iconfont icon-fanhui"></i>
        <span class="font-semibold ml-1">{{ taskMeta.name }}</span>
      </a>
    </span>

    <div class="flex-center">
      <div class="space-x-1">
        <span>{{ taskType }}</span>
        <span class="font-semibold">{{ taskMeta.taskProgress }}</span>
        <span>/</span>
        <span>{{ taskMeta.taskCount }}</span>
      </div>
      <div class="relative w-[214px] h-1.5 rounded-[3px] ml-3 bg-disabled">
        <div
          class="absolute max-w-full h-full rounded-[3px] top-0 left-0 bg-success"
          :style="{
            width: (taskMeta.taskProgress / taskMeta.taskCount) * 100 + '%'
          }"
        ></div>
      </div>
    </div>

    <div class="flex-center w-2/5 space-x-3 justify-end">
      <Dropdown>
        <a class="text-common"
          ><i
            class="iconfont icon-kuaijiejian1"
            style="position: relative; top: 1px"
          ></i>
          快捷键</a
        >
        <template #list>
          <DropdownMenu>
            <DropdownItem>
              <span>{{ passText }}&nbsp;</span>
              <span class="shortcut">ctrl/command + enter</span>
            </DropdownItem>
            <DropdownItem v-if="!taskMeta.isAuto">
              <span>跳过&nbsp;</span>
              <span class="shortcut">shift + n</span>
            </DropdownItem>
            <template v-if="![4, 5].includes(taskMeta.type)">
              <DropdownItem>
                <span>撤销&nbsp;</span>
                <span class="shortcut">ctrl/command + z</span>
              </DropdownItem>
              <DropdownItem>
                <span>重做&nbsp;</span>
                <span class="shortcut">ctrl/command+shift + z</span>
              </DropdownItem>
              <DropdownItem>
                <span>删除&nbsp;</span>
                <span class="shortcut">backspace</span>
              </DropdownItem>
            </template>
            <template v-if="[6, 7, 8].includes(taskMeta.type)">
              <DropdownItem>
                <span>播放/暂停&nbsp;</span>
                <span class="shortcut">Space</span>
              </DropdownItem>
              <DropdownItem>
                <span>上一帧&nbsp;</span>
                <span class="shortcut">ctrl/command + left</span>
              </DropdownItem>
              <DropdownItem>
                <span>下一帧&nbsp;</span>
                <span class="shortcut">ctrl/command + right</span>
              </DropdownItem>
              <DropdownItem v-if="[7, 8].includes(taskMeta.type)">
                <span>标记关键帧&nbsp;</span>
                <span class="shortcut">alt + h</span>
              </DropdownItem>
              <DropdownItem v-if="[7, 8].includes(taskMeta.type)">
                <span>删除插值&nbsp;</span>
                <span class="shortcut">alt + i</span>
              </DropdownItem>
            </template>
          </DropdownMenu>
        </template>
      </Dropdown>
      <Button @click="clearLabels">清空标注</Button>
      <Tooltip
        v-if="taskMeta.verifyAbandonCount === -2"
        content="已是最后一条未审核数据，无法跳过"
      >
        <Button disabled>跳过当前</Button>
      </Tooltip>
      <Button v-else @click="skipTask">跳过当前</Button>
      <Button v-if="taskMeta.isVerify" @click="acceptAll">全部接受</Button>
      <Button @click="save(true)">保存</Button>
      <Button type="primary" :disabled="disableSubmit" @click="save(false)">{{
        passText
      }}</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios';
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  Tooltip
} from 'heywhale-ui';
import { storeToRefs } from 'pinia';
import { computed, onMounted } from 'vue';
import { useCurrentTaskStore } from '../../store/currentTaskStore';
import { useInfoStore } from '../../store/infoStore';
import { Fn } from '../../types/util';
import { modalConfirm } from '../../utils/utils';

const { taskMeta, goTaskDetailPage } = useInfoStore();
const { axiosHeaders } = storeToRefs(useInfoStore());
const { skipTask, saveTask } = useCurrentTaskStore();

const emits = defineEmits<{
  (e: 'clearAllLabels'): void;
  (e: 'getResult', cb: Fn): void;
}>();

const props = defineProps<{
  fps?: number;
  hasLabelChanged?: boolean;
  disableSubmit?: boolean;
}>();

onMounted(() => {
  const isMac = /Macintosh/i.test(window.navigator.userAgent);
  document.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'Enter':
        if (
          (isMac && e.metaKey && !e.shiftKey) ||
          (!isMac && e.ctrlKey && !e.shiftKey)
        ) {
          save(false);
        }
        break;
      case 'KeyN':
        if (e.shiftKey) {
          skipTask();
        }
        break;
    }
  });
});

const taskType = computed(() => {
  if (taskMeta.isAuto) {
    return '查看';
  } else if (taskMeta.isVerify) {
    return '审核';
  } else {
    return '标注';
  }
});

const passText = computed(() => {
  if (taskMeta.isAuto) {
    return '下一张';
  } else if (taskMeta.isVerify) {
    return '通过';
  } else {
    return '提交';
  }
});

async function acceptAll() {
  await axios.post(`/api/annotations/${taskMeta.id}/allVerify`, null, {
    headers: axiosHeaders.value
  });
  const confirm = await modalConfirm(
    '完成',
    taskMeta.isVerify ? '审核任务已全部完成' : '标注任务已全部完成',
    'success'
  );
  if (confirm) {
    goTaskDetailPage();
  }
}

async function goTaskPage() {
  if (props.hasLabelChanged) {
    const confirm = await modalConfirm('是否保存', '当前标注未保存，是否保存?');
    if (confirm) {
      save(true);
    }
  }
  goTaskDetailPage();
}

function save(justUploadFile: boolean) {
  let res;
  emits('getResult', (val: any) => (res = val));
  saveTask(res, justUploadFile, props.fps);
}

async function clearLabels() {
  const confirm = await modalConfirm(
    '清空标注',
    '确认后，当前文件的所有标注数据都会被删除'
  );
  if (confirm) {
    emits('clearAllLabels');
  }
}
</script>

<style lang="scss">
.box-shodow {
  box-shadow: $box-shadow;
}
</style>
