import axios from 'axios';
import { Message } from 'heywhale-ui';
import { defineStore } from 'pinia';
import { nextTick, ref } from 'vue';
import {
  AnnotationDataset,
  AnnotationNasDataset,
  TaskItem
} from '../types/type';
import {
  errorLogger,
  genCosUrl,
  getAliClient,
  getCOSClient,
  getS3Client,
  modalConfirm,
  uploadCosFile
} from '../utils/utils';
import { useInfoStore } from './infoStore';

export const useCurrentTaskStore = defineStore('currentTask', () => {
  const infoStore = useInfoStore();
  const { taskMeta, currentTaskMeta, goTaskDetailPage } = infoStore;
  const taskItem = ref<TaskItem | null>(null);
  const jsonStr = ref<string>('');
  const ossData = ref<string>('');
  const modelTestRes = ref();
  const hasModelError = ref<boolean>(false);
  let dataSource: AnnotationDataset | AnnotationNasDataset;

  async function getNext() {
    const { isVerify, id, isAuto } = taskMeta;
    try {
      if (isVerify) {
        const page = Math.max(1, 1 + taskMeta.verifyAbandonCount);
        let filesUrl = `/api/annotations/${id}/files?perPage=1&page=${page}`;
        filesUrl += isAuto ? '&IsAuto=true' : '&Verified=false';
        const resp = await axios.get(filesUrl, {
          headers: infoStore.axiosHeaders
        });
        if (resp.data.data.length === 0) {
          // infoStore.currentTaskMeta.isRequesting = false;
          // return await taskOver(shortName, id, true);
          return;
        }
        // if (resp.data.data[0].Fps) {
        //   videoDetectionStore.frameMsg.frameRate = resp.data.data[0].Fps;
        // }
        if (taskMeta.verifyAbandonCount >= resp.data.totalNum - 1 && !isAuto) {
          taskMeta.verifyAbandonCount = -1;
        }
        if (resp.data.totalNum === 1) {
          taskMeta.verifyAbandonCount = -2;
        }
        return resp.data.data[0];
      } else {
        const resp = await axios.get(`/api/annotations/${id}/next`);
        return resp.data;
      }
    } catch (error) {
      // next 接口报错一般认为标注或者审核完成
    }
  }
  async function getMediaUrl() {
    let mediaUrl: string = '';
    const { host, path, nfsServer, token, client } = dataSource.token!;
    if (taskMeta.isNas) {
      const imageResp = await axios.get(
        `${
          host + '/nfs/file' + path + taskItem.value?.key
        }?nfsServer=${nfsServer}`,
        {
          responseType: 'blob',
          headers: {
            Authorization: token
          }
        }
      );
      mediaUrl = URL.createObjectURL(imageResp.data);
    } else {
      if (client === 'ali-oss') {
        const fileName = path.split('/')[0] + '/' + taskItem.value?.key;
        const aliClient = getAliClient(dataSource.token);
        mediaUrl = aliClient.signatureUrl(fileName);
      } else if (client === 'qcloud-cos') {
        const { bucket, region } = dataSource.token!;
        const cosClient = getCOSClient(dataSource.token);
        mediaUrl = await genCosUrl(
          cosClient,
          bucket,
          region,
          taskItem.value!.key
        );
      } else {
        const imageS3Client = getS3Client(dataSource.token);
        mediaUrl = imageS3Client.getSignedUrl('getObject', {
          Bucket: dataSource.token!.bucket,
          Key: taskItem.value?.key
        });
      }
    }
    ossData.value = mediaUrl;
  }
  async function getTextContent() {
    if (!taskItem.value) return '';
    const { host, path, nfsServer, token, bucket, client } = dataSource.token!;
    let textUrl = '';
    let textResp = null;
    if (taskMeta.isNas) {
      textResp = await axios.get(
        `${host + '/nfs/file' + taskItem.value!.key}?nfsServer=${nfsServer}`,
        {
          headers: { Authorization: token }
        }
      );
    } else {
      if (client === 'ali-oss') {
        const fileName = path.split('/')[0] + '/' + taskItem.value!.key;
        const aliClient = getAliClient(dataSource.token);
        textUrl = aliClient.signatureUrl(fileName);
      } else if (client === 'qcloud-cos') {
        const { bucket, region } = dataSource.token!;
        const cosClient = getCOSClient(dataSource.token);
        textUrl = await genCosUrl(
          cosClient,
          bucket,
          region,
          taskItem.value!.key
        );
      } else {
        const imageS3Client = getS3Client(dataSource.token);
        textUrl = imageS3Client.getSignedUrl('getObject', {
          Bucket: bucket,
          Key: taskItem.value!.key
        });
      }
      textResp = await axios.get(textUrl, { headers: infoStore.axiosHeaders });
    }
    ossData.value = textResp.data as string;
  }
  async function getJson() {
    try {
      jsonStr.value = '';
      if (!taskItem.value || !taskMeta.annotationToken) {
        return;
      }
      const { client } = taskMeta.annotationToken;
      const { fileKey, fileKeyWithoutPrefix } = taskItem.value;

      if (taskMeta.isNas) {
        const { host, nfsServer } = dataSource.token!;
        const jsonResp = await axios.get(
          `${host + '/nfs/file' + fileKeyWithoutPrefix}?nfsServer=${nfsServer}`,
          {
            headers: infoStore.axiosHeaders
          }
        );
        jsonStr.value = JSON.stringify(jsonResp.data);
      }
      switch (client) {
        case 'ali-oss': {
          const jsonName = taskMeta.isVerify
            ? taskMeta.annotationToken.path.split('/')[0] + '/' + fileKey
            : fileKey;
          const aliClient = getAliClient(taskMeta.annotationToken);
          const jsonUrl = aliClient.signatureUrl(jsonName);
          const resp = await axios.get(jsonUrl);
          jsonStr.value =
            resp.data instanceof Object ? JSON.stringify(resp.data) : resp.data;
          break;
        }
        case 'qcloud-oss': {
          const { bucket, region } = taskMeta.annotationToken;
          const cosClient = getCOSClient(taskMeta.annotationToken);
          const jsonUrl = await genCosUrl(cosClient, bucket, region, fileKey);
          const resp = await axios.get(jsonUrl);
          jsonStr.value = JSON.stringify(resp.data);
          break;
        }
        default: {
          const fileS3Client = getS3Client(taskMeta.annotationToken);
          const { Body } = await fileS3Client
            .getObject({
              Bucket: taskMeta.annotationToken.bucket,
              Key: fileKey
            })
            .promise();
          jsonStr.value = Body.buffer
            ? new TextDecoder().decode(Body)
            : Body.toString();
        }
      }
    } catch (error) {
      if (taskMeta.isVerify) {
        return Message.error('json 文件获取失败');
      }
    }
  }
  function verifyTextRes(json: Record<string, any>) {
    if (!json || !json.outputs || !Array.isArray(json.outputs)) {
      return false;
    }
    for (let i = 0; i < json.outputs.length; i++) {
      const { label, start, end } = json.outputs[i];
      if (label === undefined) {
        return false;
      }
      if (taskMeta.type === 5) {
        if (typeof start !== 'number' || typeof end !== 'number') {
          return false;
        }
        if (start < 0 || end < 0 || start >= end) {
          return false;
        }
      }
    }
    return true;
  }
  async function testModelService() {
    try {
      const { id, modelServiceId } = taskMeta;
      if ([4, 5].includes(taskMeta.type)) {
        const resp = await axios.post(
          '/api/annotations/testText',
          {
            Annotation: id,
            ModelService: modelServiceId
          },
          {
            headers: infoStore.axiosHeaders
          }
        );
        const isRightFormat = verifyTextRes(resp.data.data);
        if (!isRightFormat) {
          hasModelError.value = true;
          return;
        }
        modelTestRes.value = {
          json: resp.data.data,
          textContent: resp.data.text
        };
      } else {
        const datasetInfo = taskMeta.annotationDatasetMaps[0];
        const payload: Record<string, string> = {
          Dataset: datasetInfo.Dataset._id,
          ModelService: taskMeta.modelServiceId!
        };
        if (datasetInfo.Bucket) {
          payload.Bucket = datasetInfo.Bucket;
        }
        if (datasetInfo.Prefix) {
          payload.Prefix = datasetInfo.Prefix;
        }

        const testResp = await axios.post('/api/annotations/test', payload, {
          headers: infoStore.axiosHeaders
        });
        const recordResp = await axios.get(
          `/api/model/requestRecords/${testResp.data.record}`,
          {
            headers: infoStore.axiosHeaders
          }
        );
        const json = testResp.data;
        const imgUrl = JSON.parse(recordResp.data.RequestBody).file;
        modelTestRes.value = {
          json,
          imgUrl
        };
      }
    } catch (error) {
      hasModelError.value = true;
      currentTaskMeta.isRequesting = false;
      errorLogger(error);
    }
  }
  async function loadTask() {
    currentTaskMeta.isRequesting = true;
    const resp = await getNext();
    if (!resp) {
      return;
    }
    if (resp.Token === taskItem.value?.key) {
      // infoStore.currentTaskMeta.isRequesting = false;
    }
    taskItem.value = null;
    const { AnnotationDatasetMap, Token, _id: fileId, Fps } = resp;
    dataSource = taskMeta.annotationDatasetMaps.find(
      (m) => m._id === AnnotationDatasetMap
    )!;
    let fileKeyWithoutPrefix: string, fileKey: string;
    if (taskMeta.isVerify) {
      fileKey = resp.AnnotationToken;
      fileKeyWithoutPrefix = Token + '.json';
    } else {
      const fileName = Token.split('/').pop();
      fileKeyWithoutPrefix = taskMeta.isNas
        ? `${Token}.json`
        : `${fileName}.${fileId}.json`;
      fileKey = `${taskMeta.annotationToken!.path}${fileKeyWithoutPrefix}`;
    }
    taskItem.value = {
      key: Token,
      fileKey,
      fileKeyWithoutPrefix,
      fileId,
      bucket: dataSource.token!.bucket,
      fps: Fps
    };
    await nextTick();
    if (infoStore.isImageLabel || infoStore.isVideoLabel) {
      getMediaUrl();
    } else {
      getTextContent();
    }
    await getJson();
    if ([1, 2, 7, 8].includes(taskMeta.type)) {
      infoStore.lockLabel(0);
    }
    // currentTaskMeta.isRequesting = false; 放在视频 load 事件里
    currentTaskMeta.curAnnotation = -1;
  }
  async function uploadTaskResult(data: any) {
    try {
      if (!taskItem.value) {
        return;
      }
      if (taskMeta.isNas) {
        const { host, nfsServer, token } = (dataSource as AnnotationNasDataset)
          .uploadToken;
        await axios.put(
          `${
            host + '/nfs/file' + taskItem.value.fileKeyWithoutPrefix
          }?nfsServer=${nfsServer}`,
          data,
          {
            headers: { Authorization: token }
          }
        );
      } else {
        if (!taskMeta.annotationToken) {
          return;
        }
        if (taskMeta.annotationToken.client === 'qcloud-cos') {
          const cosClient = getCOSClient(taskMeta.annotationToken);
          const { bucket, region } = taskMeta.annotationToken;
          await uploadCosFile(
            cosClient,
            bucket,
            region,
            taskItem.value.fileKey,
            JSON.stringify(data)
          );
        } else {
          const fileS3Client = getS3Client(taskMeta.annotationToken);
          const key = taskMeta.isVerify
            ? taskMeta.annotationToken.path.split('/')[0] +
              '/' +
              taskItem.value.fileKey
            : taskItem.value.fileKey;
          await fileS3Client
            .putObject({
              Body: JSON.stringify(data),
              Bucket: taskMeta.annotationToken.bucket,
              Key: key,
              ContentType: 'application/json; charset=utf-8'
            })
            .promise();
        }
      }
    } catch (error) {
      console.error('文件上传失败');
    }
  }
  async function saveTask(
    data: any,
    justUploadFile: boolean,
    fps: number | undefined = undefined
  ) {
    if (!taskItem.value) return;
    await uploadTaskResult(data);
    if (justUploadFile) {
      return Message.success('保存成功');
    }
    currentTaskMeta.isRequesting = true;
    if (!fps && [7, 8].includes(taskMeta.type)) {
      fps = 24;
    }
    const annotateBody = {
      AnnotationToken: taskItem.value.fileKeyWithoutPrefix,
      FileId: taskItem.value.fileId,
      Fps: fps
    };
    const verifyBody = {
      FileId: taskItem.value.fileId,
      Fps: fps
    };
    const apiName = taskMeta.isVerify ? 'verify' : 'annotate';
    const body = taskMeta.isVerify ? verifyBody : annotateBody;
    await axios.post(`/api/annotations/${taskMeta.id}/${apiName}`, body, {
      headers: infoStore.axiosHeaders
    });
    taskMeta.taskProgress++;
    if (taskMeta.taskProgress < taskMeta.taskCount) {
      loadTask();
    } else {
      const confirm = await modalConfirm(
        '完成',
        taskMeta.isVerify ? '审核任务已全部完成' : '标注任务已全部完成',
        'success'
      );
      if (confirm) {
        goTaskDetailPage();
      }
    }
  }
  async function skipTask() {
    if (taskMeta.isVerify) {
      if (taskMeta.verifyAbandonCount === -2) {
        return;
      }
      taskMeta.verifyAbandonCount++;
      loadTask();
    } else {
      const confirm = await modalConfirm(
        '跳过当前',
        '跳过将不会保存标注数据，是否确认'
      );
      if (!confirm) {
        return;
      }
      try {
        await axios.put(
          `/api/annotations/${taskMeta.id}/abandonPending`,
          {
            FileId: taskItem.value?.fileId
          },
          { headers: infoStore.axiosHeaders }
        );
        loadTask();
      } catch (error) {
        Message.error('任务内无其他待标注视频，无法跳过');
      }
    }
  }

  return {
    taskItem,
    ossData,
    jsonStr,
    hasModelError,
    modelTestRes,
    loadTask,
    saveTask,
    skipTask,
    testModelService
  };
});
