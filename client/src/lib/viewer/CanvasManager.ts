import { resizeCanvasToDisplaySize } from "../../Utils";

export class CanvasManager {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    hitcanvas: HTMLCanvasElement;
    hitctx: CanvasRenderingContext2D;
    wrapper: HTMLDivElement;

    constructor(container: HTMLElement) {

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;

        this.hitcanvas = document.createElement('canvas');
        this.hitctx = this.hitcanvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;

        this.wrapper = document.createElement('div');
        this.wrapper.className = 'wrapper-canvas';

        this.wrapper.append(this.canvas);

        container && container.append(this.wrapper);

        this.resize();
        window.addEventListener('resize', () => { this.resize() });

    }

    resize() {

        resizeCanvasToDisplaySize(this.wrapper, this.canvas, this.hitcanvas);

    }

}