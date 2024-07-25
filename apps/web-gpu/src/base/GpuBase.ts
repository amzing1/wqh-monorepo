export type InitParams = {
  alphaMode: GPUCanvasAlphaMode;
  sampleCount: number;
  topology: GPUPrimitiveTopology;
};

export class GpuBase {
  canvas: HTMLCanvasElement;
  context: GPUCanvasContext;
  device: GPUDevice;
  private params: InitParams = {
    alphaMode: 'premultiplied',
    sampleCount: 4,
    topology: 'triangle-list'
  };
  private presentationFormat: GPUTextureFormat = 'rgba8unorm-srgb';
  private view: GPUTextureView | null = null;
  constructor(canvas: HTMLCanvasElement, params?: InitParams) {
    if (params) {
      this.params = params;
    }
    const context = canvas.getContext('webgpu');
    if (!device || !context) {
      console.error('init env failed');
      return;
    }
    this.canvas = canvas;
    (async () => await this.init())();
    this.context = context;

    const devicePixelRatio = window.devicePixelRatio;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
      device,
      format: this.presentationFormat,
      alphaMode: this.params?.alphaMode || 'premultiplied'
    });
    this.getView();
  }
  async init() {
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter?.requestDevice();
    return device;
  }

  createPipeline(vs: string, fs: string) {
    return this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({
          code: vs
        })
      },
      fragment: {
        module: this.device.createShaderModule({
          code: fs
        }),
        targets: [
          {
            format: this.presentationFormat
          }
        ]
      },
      primitive: {
        topology: this.params.topology
      },
      multisample: {
        count: this.params.sampleCount
      }
    });
  }
  getView() {
    const texture = this.device.createTexture({
      size: [this.canvas.width, this.canvas.height],
      sampleCount: this.params.sampleCount,
      format: this.presentationFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
    this.view = texture.createView();
  }
}
