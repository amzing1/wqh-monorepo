import { BBox, LabelKeyPoint, LabelSkeleton } from '../types/type';
import { getBBoxByPolygon } from './utils';

type AnnotationPointParams = {
  x: number;
  y: number;
  radius: number;
  fillColor: string;
  strokeColor: string;
  name?: string;
};
type AnnotationSegmentationParams = {
  segmentation: [number, number][];
  strokeColor: string;
  fillColor: string;
  isOver: boolean;
  id: string;
  visible: boolean;
  categroyId: number;
  name: string;
};
type SkeletonParams = {
  bbox: BBox;
  color: string;
  skeletons: LabelSkeleton[];
  keypoints: LabelKeyPoint[];
};
abstract class AnnotationPart {
  ctx: CanvasRenderingContext2D;
  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }
  drawWrapper(cb: () => void) {
    this.ctx.save();
    this.ctx.beginPath();
    cb();
    this.ctx.closePath();
    this.ctx.restore();
  }
}
export class AnnotationPoint extends AnnotationPart {
  x: number;
  y: number;
  radius: number;
  drawRadius: number = 0;
  fillColor: string;
  strokeColor: string;
  name: string = '';
  visible: boolean = true;
  isSelected: boolean = false;
  constructor(canvas: HTMLCanvasElement, params: AnnotationPointParams) {
    super(canvas);
    this.x = params.x;
    this.y = params.y;
    this.radius = params.radius;
    this.drawRadius = this.radius;
    this.fillColor = params.fillColor;
    this.strokeColor = params.strokeColor;
    this.name = params.name || '';
  }
  draw() {
    this.drawWrapper(() => {
      if (!this.visible) {
        return;
      }
      this.ctx.fillStyle = this.fillColor;
      this.ctx.strokeStyle = this.isSelected ? '#4f7fe0' : this.strokeColor;
      this.drawRadius = this.isSelected ? this.radius + 4 : this.drawRadius;
      this.ctx.lineWidth = 2;
      this.ctx.moveTo(this.x, this.y);
      this.ctx.arc(this.x, this.y, this.drawRadius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.fill();
      if (this.name) {
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 1;
        this.ctx.shadowBlur = 1;
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'right';
        this.ctx.font = '12px Helvetica Neue';
        this.ctx.fillText(this.name, this.x - 12, this.y + 4);
      }
    });
  }
  getPointIsIn(x: number, y: number) {
    const { x: tx, y: ty, radius } = this;
    if (
      x >= tx - radius &&
      x <= tx + radius &&
      y >= ty - radius &&
      y <= ty + radius
    ) {
      this.drawRadius = this.radius + 4;
      return true;
    }
    this.drawRadius = this.radius;
    return false;
  }
}
export class AnnotationSegmentation extends AnnotationPart {
  segmentation: [number, number][];
  strokeColor: string;
  fillColor: string;
  isOver: boolean;
  id: string;
  points: AnnotationPoint[] = [];
  shouldDrawPoints: boolean = true;
  bbox: BBox = [0, 0, 0, 0];
  skeleton: Skeleton | null = null;
  categroyId: number;
  visible: boolean = true;
  name: string;
  idx: number = 0;
  constructor(canvas: HTMLCanvasElement, params: AnnotationSegmentationParams) {
    super(canvas);
    this.segmentation = params.segmentation;
    this.strokeColor = params.strokeColor;
    this.fillColor = params.fillColor;
    this.isOver = params.isOver;
    this.id = params.id;
    this.categroyId = params.categroyId;
    this.name = params.name;
    this.visible = params.visible;
    this.getPoints();
    this.getBBox();
  }
  getPointIsIn(x: number, y: number) {
    // 不需要检测是否在多边形内，只需要检测是否在bbox内
    // return isPointInsidePolygon(
    //   [x, y],
    //   this.points.map((v) => [v.x, v.y])
    // );
    const bbox = this.bbox;
    return (
      x >= bbox[0] &&
      x <= bbox[0] + bbox[2] &&
      y >= bbox[1] &&
      y <= bbox[1] + bbox[3]
    );
  }
  draw() {
    if (!this.visible) return;
    this.drawWrapper(() => {
      this.ctx.fillStyle = this.fillColor;
      this.ctx.strokeStyle = this.strokeColor;
      this.points.forEach((v, i) => {
        if (i === 0) {
          this.ctx.moveTo(v.x, v.y);
        } else {
          this.ctx.lineTo(v.x, v.y);
        }
      });
      if (this.isOver && this.points.length) {
        this.ctx.lineTo(this.points[0].x, this.points[0].y);
        this.ctx.fill();
        this.ctx.strokeRect(...this.bbox);
      }
      this.ctx.stroke();
      if (this.shouldDrawPoints) {
        this.points.forEach((v) => v.draw());
      }
      if (this.isOver && this.skeleton && this.segmentation.length) {
        this.skeleton.draw();
      }
      // name
      if (this.bbox[2] > 0 && this.bbox[3] > 0 && this.isOver) {
        let text = this.idx === 0 ? this.name : `${this.name}(${this.idx})`;
        this.ctx.font = '12px Helvetica Neue';
        let textWidth = this.ctx.measureText(text).width;
        while (textWidth > this.bbox[2]) {
          text = text.slice(0, text.length - 1);
          textWidth = this.ctx.measureText(text).width;
        }
        this.ctx.fillStyle = this.ctx.strokeStyle;
        this.ctx.fillRect(this.bbox[0], this.bbox[1] - 19, textWidth + 8, 18);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(text, this.bbox[0] + 4, this.bbox[1] - 6);
      }
    });
  }
  setSegmentation(segs: [number, number][]): void;
  setSegmentation(
    segs: [number, number][],
    moveKeyPoints: true,
    disX: number,
    disY: number
  ): void;
  setSegmentation(
    segs: [number, number][],
    moveKeyPoints = false,
    disX = 0,
    disY = 0
  ): void {
    this.segmentation = segs;
    this.getPoints();
    this.getBBox();
    if (moveKeyPoints && this.skeleton) {
      this.skeleton!.keypoints.forEach((v) => {
        v.x += disX;
        v.y += disY;
      });
    }
  }
  getBBox() {
    const points: [number, number][] = this.points.map((v) => [v.x, v.y]);
    this.bbox = getBBoxByPolygon(points);
    if (this.skeleton) {
      this.skeleton.bbox = this.bbox;
    }
  }
  private getPoints() {
    const pointParams = {
      radius: 3,
      fillColor: '#fff',
      strokeColor: '#4f7fe0'
    };
    this.segmentation.forEach((v, i) => {
      if (this.points[i]) {
        this.points[i].x = v[0];
        this.points[i].y = v[1];
      } else {
        this.points.push(
          new AnnotationPoint(this.ctx.canvas, {
            x: v[0],
            y: v[1],
            ...pointParams
          })
        );
      }
    });
    if (this.points.length > this.setSegmentation.length) {
      this.points.length = this.segmentation.length;
    }
  }
}

export class Skeleton extends AnnotationPart {
  keypoints: AnnotationPoint[] = [];
  showKeyPoints: boolean = false;
  bbox: BBox = [0, 0, 0, 0];
  color: string;
  skeletons: LabelSkeleton[];
  constructor(canvas: HTMLCanvasElement, params: SkeletonParams) {
    super(canvas);
    this.bbox = params.bbox;
    this.color = params.color;
    this.skeletons = params.skeletons;
    this.setKeyPoints(params.keypoints);
    this.initKeyPointPos();
  }
  draw() {
    this.drawWrapper(() => {
      if (!this.showKeyPoints) return;
      this.skeletons.forEach((v) => {
        if (
          this.keypoints[v.startId].visible &&
          this.keypoints[v.endId].visible
        ) {
          const { x: sx, y: sy } = this.keypoints[v.startId];
          const { x: ex, y: ey } = this.keypoints[v.endId];
          this.ctx.moveTo(sx, sy);
          this.ctx.lineTo(ex, ey);
        }
      });
      this.ctx.strokeStyle = this.color;
      this.ctx.stroke();
      this.keypoints.forEach((v) => v.draw());
    });
  }
  deletekeyPoint(keyPointIdx: number) {
    this.keypoints[keyPointIdx].visible = false;
    // this.keypoints[keyPointIdx].isSelected = false;
  }
  setSelectedKeyPoint(keyPointIdx: number) {
    this.keypoints.forEach((v) => (v.isSelected = false));
    if (keyPointIdx >= 0) {
      this.keypoints[keyPointIdx].isSelected = true;
    }
  }
  private setKeyPoints(keypoints: LabelKeyPoint[]) {
    const common = {
      x: 0,
      y: 0,
      radius: 6,
      strokeColor: '#fff',
      fillColor: this.color
    };
    keypoints.forEach((v) => {
      this.keypoints.push(
        new AnnotationPoint(this.ctx.canvas, {
          ...common,
          name: v.name
        })
      );
    });
  }
  initKeyPointPos() {
    const l = this.keypoints.length;
    const h = this.bbox[3] - 28;
    this.showKeyPoints = h > 0 && this.bbox[2] > 10;
    if (this.showKeyPoints) {
      const addLen = h / (l - 1);
      for (let i = 0; i < this.keypoints.length; i++) {
        this.keypoints[i].x = this.bbox[0] + this.bbox[2] / 2;
        this.keypoints[i].y = this.bbox[1] + 8 + i * addLen + 6;
      }
    }
  }
}

export class AnnotationDrawer {
  ctx: CanvasRenderingContext2D;
  annotations: AnnotationSegmentation[];
  curAnno: AnnotationSegmentation | null = null;
  constructor(
    canvas: HTMLCanvasElement,
    annotations: AnnotationSegmentation[]
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.annotations = annotations;
    this.draw();
  }
  draw() {
    const innerDraw = () => {
      this.ctx.clearRect(
        0,
        0,
        this.ctx.canvas.offsetWidth,
        this.ctx.canvas.offsetHeight
      );
      this.annotations.forEach((v) => {
        v.shouldDrawPoints = v === this.curAnno;
        v.draw();
      });
      requestAnimationFrame(innerDraw);
    };
    innerDraw();
  }
  checkMousePoint(x: number, y: number) {
    const l = this.annotations.length;
    for (let i = 0; i < l; i++) {
      const anno = this.annotations[i];
      for (let j = 0; j < anno.points.length; j++) {
        if (
          !anno.isOver &&
          (j === anno.points.length - 1 || j === anno.points.length - 2)
        ) {
          continue;
        }

        if (anno.points[j].getPointIsIn(x, y)) {
          return {
            annoIdx: i,
            pointIdx: j
          };
        }
      }
      if (anno.skeleton) {
        for (let j = 0; j < anno.skeleton.keypoints.length; j++) {
          if (anno.skeleton.keypoints[j].getPointIsIn(x, y)) {
            return {
              annoIdx: i,
              pointIdx: -1,
              keyPointIdx: j
            };
          }
        }
      }
      if (anno.getPointIsIn(x, y)) {
        return {
          annoIdx: i,
          pointIdx: -1
        };
      }
    }
    return {
      annoIdx: -1,
      pointIdx: -1
    };
  }
}
