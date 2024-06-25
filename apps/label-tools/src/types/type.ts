import { AddAttr, Fn } from './util';

export type LabelItemProps = {
  shortcut: string;
  name: string;
  color: string;
  isSelected: boolean;
  showLockIcon: boolean;
  showToggleIcon: boolean;
  canChoose: boolean;
  chooseMulti: boolean;
};
export type LabelLayerProps = {
  name: string;
  isExpand: boolean;
  id: number | string;
  values: {
    id: number;
    visible: boolean;
    disabelOperate?: boolean;
    showRevertIcon?: boolean;
    [p: string]: any;
  }[];
};

/**infoStore */
export type ImageLabelType = 1 | 2 | 3;
export type TextLabelType = 4 | 5;
export type VideoLabelType = 6 | 7 | 8;
export type LabelType = ImageLabelType | TextLabelType | VideoLabelType;
export type DatasouceToken = {
  accessKeyId: string;
  bucket: string;
  host: string;
  path: string;
  region: string;
  s3ForcePathStyle: boolean;
  secretAccessKey: string;
  sessionToken: string;
  nfsServer: string;
  token: string;
  signature_version: string;
  client?: string;
} | null;
export type AnnotationDataset = {
  _id: string;
  token: DatasouceToken;
  Dataset: any;
  Bucket?: string;
  Prefix?: string;
};
export interface AnnotationNasDataset extends AnnotationDataset {
  uploadToken: {
    host: string;
    nfsServer: string;
    path: string;
    token: string;
  };
}
export type LabelCategory = {
  color: string;
  lock: boolean;
  name: string;
  shortcut?: string;
  hidden: boolean;
  id: number;
  keypoints: LabelKeyPoint[];
  skeletons: LabelSkeleton[];
};
export type LabelKeyPoint = {
  name: string;
};
export type LabelSkeleton = {
  startId: number;
  endId: number;
};
export type UserMeta = {
  orgId: string;
  orgShortName: string;
  userId: string;
};
export type TaskMeta = {
  // 通过 url 获取
  isAuto: boolean;
  isTest: boolean;
  isVerify: boolean;
  type: LabelType;
  id: string;
  modelServiceId?: string;
  // 通过标注任务详情接口获取
  taskCount: number;
  taskProgress: number;
  verifyAbandonCount: number;
  labels: LabelCategory[];
  isNas: boolean;
  canMulti: boolean;
  name: string;
  allowEmpty: boolean;
  annotationDatasetMaps: AnnotationDataset[];
  annotationToken: DatasouceToken;
};
export type CurrentTaskMeta = {
  curAnnotation: number;
  isRequesting: boolean;
  requestingSentence: string;
};

/**currentTaskStore */
export type TaskItem = {
  key: string;
  fileKey: string;
  fileKeyWithoutPrefix: string;
  fileId: string;
  bucket: string;
  fps?: number;
};

/**coco */
export interface Point {
  x: number;
  y: number;
}

export interface Image {
  file_name: string;
  width: number;
  height: number;
  id: number | string;
}
export interface VideoClassifyClip {
  start_frame: number;
  end_frame: number;
  color: string;
  id: number | string;
  isTemp?: boolean;
}
export interface VideoClassifyAnnotation {
  clipId: number | string;
  category_id: number;
  color: string;
  id: number | string;
}

export type BBox = [l: number, t: number, w: number, h: number];
export type VideoDetectionKeyframe = {
  keyframe: number;
  // bbox: BBox;
  polygon: [number, number][];
  lerpAfter: boolean;
  keypoints: VideoEstimationKeyPoint[];
};

export type ImageDetectionAnnotation = {
  polygon: [number, number][];
  category_id: number;
  color: string;
  id: number | string;
  name: string;
  visible?: boolean;
  isOver: boolean;
  idx?: number;
};

export type VideoDetectionAnnotation = {
  polygon: [number, number][];
  category_id: number;
  color: string;
  id: number | string;
  name: string;
  visible?: boolean;
  isOver: boolean;
  keyframes: VideoDetectionKeyframe[];
  keypoints: VideoEstimationKeyPoint[];
  idx?: number;
  track_id?: number | string;
};

export type VideoDetectionAnnotationsMap = {
  [p: string]: VideoDetectionAnnotation[];
};

export type VideoDetectionAnnoMeta = {
  isStart: boolean;
  startPos: [x: number, y: number];
  startOffset: [x: number, y: number];
  startBBox: BBox;
  isClickCurAnnotation: boolean;
  type: 'create' | 'move' | 'move-point' | 'move-keypoint';
  curPoint: -1 | 0 | 1 | 2 | 3;
  curKeyPoint: number;
  startKeyPoints: VideoEstimationKeyPoint[];
};

export type VideoEstimationKeyPoint = {
  name: string;
  x: number;
  y: number;
  visible: boolean;
};
export type VideoEstimationKeyframe = AddAttr<
  VideoDetectionKeyframe,
  'keypoints',
  VideoEstimationKeyPoint[]
>;

// 文本标注实体识别标签
export type TextRecognitionAnnotation = {
  start: number;
  end: number;
  label: number;
};

interface NodeInSelection extends HTMLElement {
  parentNode: HTMLElement;
}

export interface TextLabelSelection extends Selection {
  focusNode: NodeInSelection;
  anchorNode: NodeInSelection;
}
export interface TextLabelElement extends HTMLElement {
  labelNameEle: HTMLElement;
  start: number;
}

export type SetHooksParams = Partial<{
  inCreating: Fn;
  afterCreate: Fn;
  afterChange: Fn;
  setAnnoByDrawer: Fn;
  deleteKeyPoint: Fn;
}>;

export type SetAnnotationsParams = {
  id: string;
  polygon: [number, number][];
  keypoints: [number, number][];
  idx: number;
  originData: any;
}[];

export type VideoDetectionClip = {
  start: number;
  end: number;
  color: string;
};

export type CanvasPos = {
  w: number;
  h: number;
  dx: number;
  dy: number;
};

export type RangeWithText = {
  text: string;
  label: number;
} & Range;
