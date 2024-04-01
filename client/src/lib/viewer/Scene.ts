/* eslint-disable @typescript-eslint/no-explicit-any */
import { SelectBox, StateMachine, Box } from "./Graphic";
import { findTarget } from "./Event";
import { History } from "./History";
import { Point } from "./Math";
import { Parser } from "./Parser";
import { CanvasManager } from "./CanvasManager";
import { Tab } from "./Tab";
import { Sheet } from "./Sheet";

class Transform {
    scene: Scene;
    s: number;
    dx: number;
    dy: number;
    MINZOOM: number;
    MAXZOOM: number;

    constructor(scene: Scene) {
        this.scene = scene;
        this.s = 1;
        this.dx = 0;
        this.dy = 0;

        this.MINZOOM = 0.1;
        this.MAXZOOM = 5.0;
    }

    scale(s: number) {

        const next = this.s * 1 / s;

        if (next > this.MAXZOOM) {
            s = 1.0 / (this.MAXZOOM / this.s);
        } else if (next < this.MINZOOM) {
            s = 1.0 / (this.MINZOOM / this.s);
        }

        this.s *= 1 / s;

        if (this.s > this.MAXZOOM) {
            this.s = this.MAXZOOM;
        } else if (this.s < this.MINZOOM) {
            this.s = this.MINZOOM;
        }

        this.dx *= 1 / s;
        this.dy *= 1 / s;
    }

    translate(dx: number, dy: number) {
        this.dx -= dx;
        this.dy -= dy;
    }

    transform({ x, y }: { x: number, y: number }) {
        return {
            x: this.s * x + this.dx,
            y: this.s * y + this.dy
        };
    }

    reverseTransform({ x, y }: { x: number, y: number }) {

        return {
            x: (x - this.dx) / this.s,
            y: (y - this.dy) / this.s
        };
    }
}

export class ObjectManager {
    _objects: any[];
    handler: any;
    scene?: Scene;

    constructor(objects: any[] = []) {

        this._objects = objects;

        this.handler = document.createElement('handler');

    }

    change(event: string, silent: boolean, target?: any) {

        this._objects.sort((a: any, b: any) => {

            return b.z - a.z;

        });

        this.handler.dispatchEvent(
            new CustomEvent('change',
                { detail: { event, target, objects: this._objects, silent } }
            )
        );

    }

    set(objects: any[], silent = false) {

        this._objects = [...objects];
        this.change("set", silent, objects);

    }

    add(object: any, silent = false) {

        this._objects.push(object);
        this.change("add", silent, object);

    }

    remove(object: any, silent = false) {

        const index = this._objects.indexOf(object);
        index > -1 && this._objects.splice(index, 1) && (this.change("remove", silent, object));

    }

    clear(silent = false) {

        this._objects = [];
        this?.change("clear", silent);

    }

    clone() {

        return new ObjectManager([...this._objects]);

    }

}

export class Scene {
    canvasManager?: CanvasManager | null;
    transform: Transform;
    objects: ObjectManager;
    tab?: Tab | null;
    parser: Parser;
    sheet?: Sheet;
    history: any;
    guides: any[];
    selectBox: SelectBox;
    renderHandler: () => void;
    requestAnimationFrameId?: number;
    startPosition: Point;
    selection: any;

    constructor() {

        this.objects = new ObjectManager();
        this.objects.scene = this;
        this.guides = [];
        this.history = new History();
        this.transform = new Transform(this);

        this.selectBox = new SelectBox({ x: 0, y: 0 });
        this.guides.push(this.selectBox);

        this.parser = new Parser(this);

        this.renderHandler = () => { this.render(); };

        this.startPosition = new Point(64, 64);

        this.transform.translate(this.startPosition.x, this.startPosition.y);

    }

    bind(tab: Tab) {

        this.tab = tab;
        this.canvasManager = tab?.viewer?.canvasManager as CanvasManager;

        this.requestAnimationFrameId = requestAnimationFrame(this.renderHandler);

    }

    unbind() {

        cancelAnimationFrame(this.requestAnimationFrameId as number);

        this.canvasManager = null;
        this.tab = null;

    }

    undo() {
        this.objects.set(this.history.undo(), true);
    }

    redo() {
        this.objects.set(this.history.redo(), true);
    }

    openContextMenu() { }

    findTarget(x: number, y: number, cb1?: any, cb2?: any) {
        return findTarget.call(this, x, y, cb1, cb2);
    }

    calcBounds() {

        let count = 0;

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        for (const object of this.objects._objects) {

            if (object instanceof StateMachine) {

                const bounds = object.getBounds();

                if (bounds.left < minX) {
                    minX = bounds.left;
                }


                if (bounds.right > maxX) {
                    maxX = bounds.right;
                }


                if (bounds.top < minY) {
                    minY = bounds.top;
                }


                if (bounds.bottom > maxY) {
                    maxY = bounds.bottom;
                }

                count++;

            }

        }

        if (count === 0) {
            return {
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,

                x: 0,
                y: 0,
                w: 0,
                h: 0
            };
        }

        const left = minX;
        const right = maxX;
        const top = minY;
        const bottom = maxY;

        return {

            left,
            right,
            top,
            bottom,

            x: left + (right - left) / 2,
            y: top + (bottom - top) / 2,
            w: Math.abs(right - left),
            h: Math.abs(bottom - top)

        }

    }

    fitOnScreen() {

        const target = this.calcBounds();

        this.panZoom(target);

    }

    getSelection({ top, bottom, left, right }) {

        const selection = [];

        for (const object of this.objects._objects) {

            if (object instanceof StateMachine) {
                continue;
            }

            const bounds = object.getBounds();

            if (bounds.top > top && bounds.top < bottom &&
                bounds.bottom > top && bounds.bottom < bottom &&
                bounds.left > left && bounds.left < right &&
                bounds.right > left && bounds.right < right
            ) {
                selection.push(object);
                object.selected = true;
            } else {
                object.selected = false;
            }

        }

        this.selection = new Box({
            objects: selection,
            selection: true
        });

        this.selection.z = -1;

        this.selection.render(this.canvasManager, this);

        this.selection.setBounds();

        if (selection.length !== 0) {

            this.selection.toJSON = () => { return {} };
            this.objects.add(this.selection);

        }

    }

    panZoom(target: any) {

        if (this.canvasManager) {

            let min = target.w;
            let max = target.h;
            let measureMin = this.canvasManager.canvas.width;
            let measureMax = this.canvasManager.canvas.height;

            if (this.canvasManager.canvas.height < this.canvasManager.canvas.width) {
                measureMin = this.canvasManager.canvas.height;
                measureMax = this.canvasManager.canvas.width;
                min = target.h;
                max = target.w;
            }

            let scale = 1 / measureMin * (min + 64);
            const sMax = 1 / scale * max;

            if (sMax > measureMax) {

                scale = 1 / measureMax * (max + 64);

            }

            this.transform.s = scale;
            this.transform.dx = target.x - (scale * this.canvasManager.canvas.width / 2);
            this.transform.dy = target.y - (scale * this.canvasManager.canvas.height / 2);

        }

    }

    grid({ top, bottom, left, right }: { top: number, bottom: number, left: number, right: number }) {

        const ctx = this.canvasManager?.ctx;

        if (ctx) {

            ctx.beginPath();

            const offsetY = top - (top % 16);
            const offsetX = left - (left % 16);

            for (let y = offsetY; y < bottom; y += 16) {

                ctx.moveTo(left, y);
                ctx.lineTo(right, y);

            }

            for (let x = offsetX; x < right; x += 16) {

                ctx.moveTo(x, top);
                ctx.lineTo(x, bottom);

            }

            ctx.lineWidth = 1;
            ctx.strokeStyle = "#888";
            ctx.stroke();

            //Red x axis line

            ctx.beginPath();

            ctx.moveTo(left, 0);
            ctx.lineTo(right, 0);

            ctx.strokeStyle = "#f00";
            ctx.stroke();

            //Green y axis line

            ctx.beginPath();

            ctx.moveTo(0, top);
            ctx.lineTo(0, bottom);

            ctx.strokeStyle = "#0f0";
            ctx.stroke();

        }

    }

    render() {

        const { canvas, ctx, hitctx } = this.canvasManager as CanvasManager;

        const { x: left, y: top } = this.transform.transform({ x: 0, y: 0 });
        const { x: right, y: bottom } = this.transform.transform({ x: canvas.width, y: canvas.height });
        const width = Math.abs(right - left);
        const height = Math.abs(bottom - top);

        ctx.save();
        hitctx.save();

        ctx.scale(1 / this.transform.s, 1 / this.transform.s);
        ctx.translate(-this.transform.dx, -this.transform.dy);

        hitctx.scale(1 / this.transform.s, 1 / this.transform.s);
        hitctx.translate(-this.transform.dx, -this.transform.dy);

        ctx.clearRect(left, top, width, height);
        hitctx.clearRect(left, top, width, height);

        this.grid({ top, bottom, left, right });

        for (const guide of this.guides) {
            guide.render(this.canvasManager, this);
        }

        for (let i = 0; i < this.objects._objects.length; i++) {
            const object = this.objects._objects[i];
            object.visible && object.render(this.canvasManager, this);
        }

        ctx.restore();
        hitctx.restore();

        this.requestAnimationFrameId = requestAnimationFrame(this.renderHandler);

    }

}