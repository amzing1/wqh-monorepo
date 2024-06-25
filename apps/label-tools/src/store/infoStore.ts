import axios from 'axios';
import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';
import {
  CurrentTaskMeta,
  LabelCategory,
  LabelType,
  TaskMeta,
  UserMeta
} from '../types/type';
import { getColor, goDetailPage, modalConfirm } from '../utils/utils';
/**
 * 标注任务内所有子任务共用的一些信息
 */
export const useInfoStore = defineStore('info', () => {
  const userMeta = reactive<UserMeta>({
    orgId: '',
    orgShortName: '',
    userId: ''
  });
  const taskMeta = reactive<TaskMeta>({
    // 通过 url 获取
    isAuto: false,
    isTest: false,
    isVerify: false,
    type: 1,
    id: '',
    // 通过详情接口获取
    taskCount: 0,
    taskProgress: 0,
    verifyAbandonCount: 0,
    labels: [],
    isNas: false,
    canMulti: false,
    name: '',
    allowEmpty: false,
    annotationDatasetMaps: [],
    annotationToken: null
  });
  const currentTaskMeta = reactive<CurrentTaskMeta>({
    curAnnotation: -1,
    isRequesting: true,
    requestingSentence: '任务加载中，请稍后'
  });
  const isImageLabel = computed(() => [1, 2, 3].includes(taskMeta.type));
  const isTextLabel = computed(() => [4, 5].includes(taskMeta.type));
  const isVideoLabel = computed(() => [6, 7, 8].includes(taskMeta.type));
  const disableOperate = computed(() => {
    return taskMeta.isAuto || taskMeta.isTest;
  });
  const axiosHeaders = computed(() => ({
    'x-kesci-org': userMeta.orgId
  }));

  async function getUserInfo() {
    try {
      const resp = await axios.get('/api/auth/login');
      userMeta.userId = resp.data._id;
    } catch (error) {
      console.error(error);
    }
  }
  async function getTaskDetail() {
    function getTaskProgressVerify(data: any) {
      let done = 0;
      let total = 0;
      if (
        !data.ModelServices.length ||
        (data.ModelServices.length && !data.IsAutoReview && !data.ReLabel) ||
        (data.ModelServices.length && !data.IsAutoReview && data.ReLabel)
      ) {
        const assReviewers = data.ReviewersAssignment.filter(
          (v: Record<string, any>) => !v.ModelService
        );
        done = assReviewers.reduce(
          (iter: number, val: Record<string, any>) => (iter += val.number),
          0
        );
        total = data.annotatedFileCounts.reduce(
          (iter: number, val: Record<string, any>) => (iter += val.number),
          0
        );
        if (data.ModelServices.length && !data.IsAutoReview && data.ReLabel) {
          total = data.annotatedFileCounts
            .filter((v: Record<string, any>) => v.Executor)
            .reduce(
              (iter: number, val: Record<string, any>) => (iter += val.number),
              0
            );
        }
      } else if (
        (data.ModelServices.length && data.IsAutoReview && !data.ReLabel) ||
        (data.ModelServices.length && data.IsAutoReview && data.ReLabel)
      ) {
        const assReviewers = data.ReviewersAssignment.filter(
          (v: Record<string, any>) => v.Executor
        );
        const modelReviewer = data.ReviewersAssignment.find(
          (v: Record<string, any>) => v.ModelService
        );
        const assAnnotedNumber = data.annotatedFileCounts
          .filter((v: Record<string, any>) => v.Executor)
          .reduce(
            (iter: number, val: Record<string, any>) => (iter += val.number),
            0
          );
        const modelAnnotedNumber = data.annotatedFileCounts
          .filter((v: Record<string, any>) => v.ModelService)
          .reduce(
            (iter: number, val: Record<string, any>) => (iter += val.number),
            0
          );
        done = assReviewers.reduce(
          (iter: number, val: Record<string, any>) => (iter += val.number),
          0
        );
        total = modelAnnotedNumber;
        if (data.ModelServices.length && data.IsAutoReview && !data.ReLabel) {
          total -= modelReviewer.number;
        } else {
          total = assAnnotedNumber;
        }
        if (taskMeta.isAuto) {
          done = 0;
          total = modelReviewer.number;
        }
      }
      return {
        done,
        total
      };
    }
    function getTaskProgress(data: any) {
      let done = 0;
      let total = 0;
      if (
        !data.ModelServices.length ||
        (data.ModelServices.length && !data.IsAutoReview && data.ReLabel)
      ) {
        const myAss = data.Assignments.find(
          (v: Record<string, any>) => v.Executor === userMeta.userId
        );
        const myCount = data.annotatedFileCounts.find(
          (v: Record<string, any>) => v.Executor === userMeta.userId
        );
        done = myCount.number;
        total = myAss?.number || 0;
        if (
          total &&
          data.ModelServices.length &&
          !data.IsAutoReview &&
          data.ReLabel
        ) {
          const modelAnno = data.annotatedFileCounts.find(
            (v: Record<string, any>) => v.ModelService
          );
          total = Math.min(total, modelAnno.number);
        }
      } else if (
        data.ModelServices.length &&
        data.IsAutoReview &&
        data.ReLabel
      ) {
        const modelAnnoted = data.annotatedFileCounts.find(
          (v: Record<string, any>) => v.ModelService
        );
        const modelRev = data.ReviewersAssignment.find(
          (v: Record<string, any>) => v.ModelService
        );
        done = data.annotatedFileCounts
          .filter((v: Record<string, any>) => v.Executor)
          .reduce(
            (iter: number, val: Record<string, any>) => (iter += val.number),
            0
          );
        total = modelAnnoted.number - modelRev.number;
      }
      return { done, total };
    }
    const resp = await axios.get(`/api/annotations/${taskMeta.id}`, {
      headers: axiosHeaders.value
    });
    resp.data.ReLabel =
      resp.data.Assignments.length > 1 && resp.data.ModelServices.length;
    if (!taskMeta.isTest) {
      if (taskMeta.isVerify) {
        const { done, total } = getTaskProgressVerify(resp.data);
        taskMeta.taskCount = total || 0;
        taskMeta.taskProgress = done || 0;
      } else {
        const { done, total } = getTaskProgress(resp.data);
        taskMeta.taskCount = total || 0;
        taskMeta.taskProgress = done || 0;
      }
      if (taskMeta.taskCount === taskMeta.taskProgress) {
        const confirm = await modalConfirm(
          '完成',
          taskMeta.isVerify ? '审核任务已全部完成' : '标注任务已全部完成',
          'success'
        );
        if (confirm) {
          goTaskDetailPage();
        }
        return;
      }
    }
    let labels = resp.data.Labels;
    if (taskMeta.isTest) {
      // 本地调试时获取不到
      const testLabels = window.localStorage.getItem('testLabels') as string;
      labels = JSON.parse(testLabels) || [];
    }
    taskMeta.labels = labels
      .map((v: Record<string, any>, i: number) => {
        return {
          name: v.Name,
          hidden: v.Hidden || false,
          shortcut: v.Shortcut || '',
          id: v.Id || i,
          color: getColor(i),
          lock: false,
          keypoints: v.KeyPoints?.map((t: any) => ({ name: t.Name })) || [],
          skeletons: v.Skeletons?.map(
            (t: any) =>
              ({
                startId: t.StartId,
                endId: t.EndId
              }) || []
          )
        } as LabelCategory;
      })
      .filter((v: LabelCategory) => !v.hidden);
    taskMeta.isNas = resp.data.IsNas;
    taskMeta.allowEmpty =
      resp.data.AllowEmpty === undefined ? true : resp.data.AllowEmpty;
    taskMeta.annotationDatasetMaps = resp.data.AnnotationDatasetMaps;
    taskMeta.annotationToken = resp.data.annotationToken;
    taskMeta.name = resp.data.Name;
    taskMeta.id = resp.data._id;
    taskMeta.canMulti = resp.data.Multi;
  }
  async function acceptAll() {
    const headers = {
      'x-kesci-org': userMeta.orgId
    };
    await axios.post(`/api/annotations/${taskMeta.id}/allVerify`, null, {
      headers
    });
    goDetailPage(userMeta.orgShortName, taskMeta.id);
  }

  async function initInfoStore() {
    const regRes = /label-tools\/(\w{24})/.exec(window.location.href);
    const searchParams = new URLSearchParams(window.location.search);
    taskMeta.id = regRes ? regRes[1] : '';
    taskMeta.isVerify = Boolean(searchParams.get('verify'));
    taskMeta.isAuto = Boolean(searchParams.get('isAuto'));
    taskMeta.isTest = Boolean(searchParams.get('test'));
    taskMeta.modelServiceId = searchParams.get('model') || '';
    taskMeta.type = Number(searchParams.get('type')) as LabelType;
    userMeta.orgId = searchParams.get('org') || '';
    userMeta.orgShortName = searchParams.get('name') || '';
    await getUserInfo();
    await getTaskDetail();
  }

  function lockLabel(idx: number, isToggle = false) {
    if (!isToggle || !taskMeta.labels[idx].lock) {
      taskMeta.labels.forEach((v) => (v.lock = false));
      taskMeta.labels[idx].lock = true;
    } else {
      taskMeta.labels[idx].lock = false;
    }
  }

  function goTaskDetailPage() {
    const url = `/org/${userMeta.orgShortName}/label-task/${taskMeta.id}`;
    window.open(url, '_self');
  }

  return {
    userMeta,
    taskMeta,
    currentTaskMeta,
    isImageLabel,
    isTextLabel,
    isVideoLabel,
    disableOperate,
    axiosHeaders,
    initInfoStore,
    acceptAll,
    lockLabel,
    goTaskDetailPage
  };
});
