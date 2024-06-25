import AliOss from 'ali-oss';
import S3 from 'aws-sdk/clients/s3';
import COS from 'cos-js-sdk-v5';
import { Modal, Notice } from 'heywhale-ui';
import {
  BBox,
  Point,
  VideoEstimationKeyPoint,
  VideoEstimationKeyframe
} from '../types/type';

const clientCache: any = {};
export function getColor(index = 0, a = 1): string {
  const v = 50 * index;
  const c = Math.floor((10 + v) / 360) % 3;
  return `hsla(${(v % 360) - c * 9},${66 - 17 * c}%,${60 - 13 * c}%,${a})`;
}

export function deepClone<T = any>(origin: T): T {
  return JSON.parse(JSON.stringify(origin));
}

// 将颜色的不透明度从 1 变为 0.5
export function lowerTransparent(color: string) {
  let res = '';
  for (let i = 0; i < color.length; i++) {
    if (i === color.length - 2) {
      res += '0.3';
    } else {
      res += color[i];
    }
  }
  return res;
}

export function calcDistanceSquare(point1: Point, point2: Point): number {
  const v = (point1.x - point2.x) ** 2 + (point1.y - point2.y) ** 2;
  return v;
}

export function getUrlParam(name: string): string {
  const reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)');
  const r = window.location.search.substr(1).match(reg);
  return r ? window.decodeURIComponent(r[2]) : '';
}

export function getErrorMsg(e: any) {
  if (!e) {
    return 'Unknown error';
  }
  if (e.response && e.response.data) {
    return e.response.data.message || e.response.data.toString();
  }
  return e.toString();
}

export function toPercent(value?: number | string) {
  if (!value) {
    return '';
  }
  value = value.toString();
  if (value.includes('%')) {
    return value;
  }
  return Math.round(parseFloat(value) * 100) + '%';
}

export function limitStr(str: string, length: number) {
  return str.length >= length ? str.slice(0, length - 3) + '...' : str;
}

export function goDetailPage(shortName: string, id: string) {
  const url = `/org/${shortName}/label-task/${id}`;
  window.open(url, '_self');
}

export function clamp(min: number, max: number, val: number) {
  return Math.min(max, Math.max(min, val));
}

export function cloneData<T = any>(origin: T): T {
  return JSON.parse(JSON.stringify(origin));
}

export function formatVideoTime(
  s: number | undefined,
  framePerS: number,
  showFrame = true
) {
  function format(t: number) {
    if (t < 10) {
      return `0${t}`;
    }
    return t;
  }
  if (!s) {
    s = 0;
  }
  const h = Math.floor(s / 3600);
  const m = Math.floor((s - h * 3600) / 60);
  s = s - h * 3600 - m * 60;
  const f = Math.round(s * framePerS - Math.floor(s) * framePerS);
  if (showFrame) {
    return `${format(h)}:${format(m)}:${format(Math.floor(s))}:${format(f)}`;
  } else {
    return `${format(h)}:${format(m)}:${format(Math.floor(s))}`;
  }
}

function lerp(x1: number, x2: number, p1: number, p2: number, p: number) {
  return x1 + (x2 - x1) * ((p - p1) / (p2 - p1));
}

export function lerpEstimationKeyframes(
  key1: VideoEstimationKeyframe,
  key2: VideoEstimationKeyframe,
  curFrame: number
) {
  const keypointsLen = key1.keypoints.length;
  const pointLen = key1.polygon.length;
  const keypoints = [];
  for (let i = 0; i < keypointsLen; i++) {
    keypoints.push({
      x: lerp(
        key1.keypoints[i].x,
        key2.keypoints[i].x,
        key1.keyframe,
        key2.keyframe,
        curFrame
      ),
      y: lerp(
        key1.keypoints[i].y,
        key2.keypoints[i].y,
        key1.keyframe,
        key2.keyframe,
        curFrame
      ),
      name: key1.keypoints[i].name,
      visible: key1.keypoints[i].visible
    } as VideoEstimationKeyPoint);
  }
  const polygon: [number, number][] = [];
  for (let i = 0; i < pointLen; i++) {
    const pointRes = [];
    pointRes.push(
      lerp(
        key1.polygon[i][0],
        key2.polygon[i][0],
        key1.keyframe,
        key2.keyframe,
        curFrame
      )
    );
    pointRes.push(
      lerp(
        key1.polygon[i][1],
        key2.polygon[i][1],
        key1.keyframe,
        key2.keyframe,
        curFrame
      )
    );
    polygon.push(pointRes as [number, number]);
  }
  return {
    polygon,
    keypoints
  };
}

export function getBBoxByPolygon(points: [number, number][]): BBox {
  let [xMin, xMax, yMin, yMax] = [Infinity, -Infinity, Infinity, -Infinity];
  points.forEach((v) => {
    if (v[0] < xMin) {
      xMin = v[0];
    }
    if (v[0] > xMax) {
      xMax = v[0];
    }
    if (v[1] < yMin) {
      yMin = v[1];
    }
    if (v[1] > yMax) {
      yMax = v[1];
    }
  });
  return [xMin, yMin, xMax - xMin, yMax - yMin];
}

export function getS3Client({
  accessKeyId,
  host = '',
  region = '',
  secretAccessKey = '',
  sessionToken = '',
  bucket = '',
  s3ForcePathStyle = false
}: any) {
  const isS3 = region && region !== 'op-premise';
  const cacheKey = `${accessKeyId}_${isS3 ? region : host}_${bucket}`;

  if (!clientCache[cacheKey]) {
    const opt: any = {
      region,
      endpoint: isS3 ? `https://s3.${region}.amazonaws.com.cn` : host,
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
      sessionToken: sessionToken
    };
    opt.signatureVersion = 'v4';
    if (!isS3 || s3ForcePathStyle) {
      opt.s3ForcePathStyle = true;
    }
    if (host) {
      opt.endpoint = host;
    }
    clientCache[cacheKey] = new S3(opt);
  }
  return clientCache[cacheKey];
}
export function genGetUrl(s3Client: any, bucket: string, key: string) {
  return s3Client.getSignedUrl('getObject', {
    Bucket: bucket,
    Key: key
  });
}

export function getAliClient(config: any) {
  if (clientCache[config.accessKeyId]) {
    return clientCache[config.accessKeyId];
  }
  const client = new AliOss({
    endpoint: config.host,
    region: config.region,
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.secretAccessKey,
    stsToken: config.sessionToken,
    bucket: config.bucket
  });
  clientCache[config.accessKeyId] = client;
  return client;
}

export function getCOSClient(config: any) {
  if (clientCache[config.accessKeyId]) {
    return clientCache[config.accessKeyId];
  }
  const client = new COS({
    getAuthorization(options, callback) {
      callback({
        TmpSecretId: config.accessKeyId,
        TmpSecretKey: config.secretAccessKey,
        SecurityToken: config.sessionToken,
        ExpiredTime: config.expiredTime,
        StartTime: config.startTime
        // ScopeLimit: true // 细粒度控制权限需要设为 true，会限制密钥只在相同请求时重复使用
      });
    },
    Domain: `${config.bucket}.cos.${config.region}.myqcloud.com`
  });
  clientCache[config.accessKeyId] = client;
  return client;
}

export async function genCosUrl(
  cosClient: any,
  Bucket: string,
  Region: string,
  Key: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    cosClient.getObjectUrl(
      {
        Bucket,
        Region,
        Key
      },
      function (err: Error, data: { Url: string }) {
        if (err) {
          reject(err);
        }
        resolve(data.Url);
      }
    );
  });
}

export async function uploadCosFile(
  cosClient: any,
  Bucket: string,
  Region: string,
  Key: string,
  Body: string
) {
  return new Promise((resolve, reject) => {
    cosClient.uploadFile(
      {
        Bucket,
        Region,
        Key,
        Body
      },
      function (err: Error, data: any) {
        if (err) {
          reject(err);
        }
        resolve(data);
      }
    );
  });
}

export async function modalConfirm(
  title: string,
  content: string,
  type: string = 'confirm'
): Promise<boolean> {
  return new Promise((resolve) => {
    Modal[type]({
      title,
      content,
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        resolve(true);
      },
      onCancel: () => {
        resolve(false);
      }
    });
  });
}

export async function errorLogger(e: any) {
  const errorMsg = getErrorMsg(e);
  Notice.error({
    title: 'Error',
    desc: errorMsg
  });
}
