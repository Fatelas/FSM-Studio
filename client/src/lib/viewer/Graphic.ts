/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectingStateMachine, isAddingTransition, links, setConnectingStateMachine, setIsAddingTransition, setSelectedReset, setSelectedState, setSelectedStateMachine, setSelectedTransition } from "./Logic";
import { itemsReset, itemsState, itemsStateMachine, itemsStateMachineInside, itemsStateMachineLink, itemsTransition } from "./ContextMenu";
import { arrowTo, drawArrow, drawEllipseByCenter, drawLine } from "./Draw";
import { HitBox } from "./Event";
import { VirtualMachine, validate } from "../../StatusInfinitum";
import { uuidv4 } from "../../Utils";
import { Scene } from "./Scene";
import { closest } from "./Math";
import { manageStateMachineLinkModal } from "./PopUpMenu";

export class Graphic {
    uuid: string;
    x: number;
    y: number;
    z: number;
    hitBoxes: Map<string, HitBox>;
    selected: boolean;
    visible: boolean;

    scene?: Scene;

    constructor({ x = 0, y = 0, z = 0, uuid = uuidv4() } = {}) {

        this.uuid = uuid;

        this.x = x;
        this.y = y;
        this.z = z;

        this.hitBoxes = new Map();

        this.selected = false;
        this.visible = true;

    }

    toJSON() {
        console.warn(this.constructor.name, ' missing toJSON implementation.');
        return {};
    }

    toXML() {
        console.warn(this.constructor.name, ' missing toXML implementation.');
        return '';
    }

    getBounds() {

        return { top: this.y, bottom: this.y, left: this.x, right: this.x }

    }

    render(...params: unknown[]) {

        for (const [, hitBox] of this.hitBoxes) {
            hitBox.render(...params);
        }

    }

}

export class State extends Graphic {
    name: string;
    private _oldName: string;
    transitions: Transition[];
    resets: Reset[];
    h: number;
    w: number;
    machine?: StateMachine;
    actualWidth: number;
    actualHeight: number;
    radius: number;
    private _outputsSplit: any;
    private _outputs: any;

    constructor({
        name = "State", outputs = "Output",
        x = 0, y = 0, z = 0,
        uuid }: { name?: string, outputs?: string, x?: number, y?: number, z?: number, uuid?: string } = {}) {

        super({ x, y, z, uuid });

        this.name = name;
        this.outputs = outputs;

        this._oldName = '';

        this.transitions = [];
        this.resets = [];

        this.h = 10;
        this.w = 10;

        this.radius = 0;
        this.actualWidth = 0;
        this.actualHeight = 0;


        const hitBox = new HitBox({
            _render: function ({ hitctx }: { hitctx: any }) {

                hitctx.strokeStyle = this._hitColor;
                hitctx.fillStyle = this._hitColor;

                drawEllipseByCenter(hitctx,
                    this.object?.x as number, this.object?.y as number,
                    ((this.object as unknown) as State)?.actualWidth as number, ((this.object as unknown) as State)?.actualHeight as number);

            }
        });

        hitBox.handler.contextMenu = (function (this: HitBox, pos: { x: number, y: number }) {

            const contextMenu = this?.object?.scene?.tab?.viewer?.contextMenu;

            if (contextMenu) {

                contextMenu.setTarget(this.object);
                contextMenu.setItems(itemsState);
                contextMenu.open(pos.x, pos.y);

            }

        }).bind(hitBox);

        hitBox.handler.click = (function (this: HitBox) {

            const state = this.object as State;

            if (isAddingTransition && isAddingTransition.from.machine === state.machine) {

                isAddingTransition.to = state;
                isAddingTransition.following = false;
                isAddingTransition.from !== isAddingTransition.to && state.transitions.push(isAddingTransition);

                for (const [, hitBox] of isAddingTransition.hitBoxes) {

                    hitBox.active = true;

                }

                state.machine && (state.machine.validated = null);

                state.scene?.objects.change("add", false, isAddingTransition);

                setIsAddingTransition(null);


            } else {

                state.selected = true;

            }

        }).bind(hitBox);

        hitBox.handler.out = (function (this: HitBox) {

            const state = this.object as State;

            state.selected = false;

        }).bind(hitBox);

        hitBox.bind(this);

    }

    getBounds() {

        return {

            top: this.y - this.h / 2,
            bottom: this.y + this.h / 2,
            left: this.x - this.w / 2,
            right: this.x + this.w / 2

        }

    }

    toJSON() {

        return {

            type: "State",
            options: {
                uuid: this.uuid,
                name: this.name,
                outputs: this.outputs,
                x: this.x,
                y: this.y,
                z: this.z
            }

        };

    }

    toXML() {

        return `
        <State>
            <uuid>${this.uuid}</uuid>
            <name>${this.name}</name>
            <outputs>${this.outputs}</outputs>
            <x type="float">${this.x}</x>
            <y type="float">${this.y}</y>
            <z type="float">${this.z}</z>
        </State>
        `;

    }

    delete(force = false) {
        for (const transition of this.transitions) {
            transition.delete();
        }

        for (const reset of this.resets) {
            reset.delete();
        }

        if (this.machine && !force) {

            const index = this.machine.objects.indexOf(this);
            index > -1 && this.machine.objects.splice(index, 1);

        }

        this.scene?.objects.remove(this);
        setSelectedState(null);
    }

    setRadius(force = false) {

        const ctx = this?.scene?.canvasManager?.ctx as CanvasRenderingContext2D;

        if (ctx && force || this._oldName !== this.name) {

            ctx.font = '20px Arial';

            const { actualWidth, actualHeight } = this.mesure(ctx);

            if (actualWidth > actualHeight) {
                this.radius = actualWidth / 2 + 20;
            } else {
                this.radius = actualHeight / 2 + 20;
            }

            this._oldName = this.name;

        }
    }

    mesure(ctx: CanvasRenderingContext2D) {

        const metricsName = ctx.measureText(this.name);

        let metrics = metricsName;

        for (const line of this._outputsSplit) {
            const lineMetrics = ctx.measureText(line);
            if (lineMetrics.width > metrics.width) {
                metrics = lineMetrics;
            }
        }

        const actualWidth = metrics.width;
        const actualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

        return { actualWidth, actualHeight: 30 + (actualHeight + 4) * (this._outputsSplit.length + 1) };
    }

    set outputs(value) {
        this._outputs = value;
        if (value !== '') {
            this._outputsSplit = value.split("\n");
        } else {
            this._outputsSplit = [];
        }
    }

    get outputs() {
        return this._outputs;
    }

    renderOutputText(ctx: CanvasRenderingContext2D, anchor: { x: number, y: number }, height: number) {
        for (let i = 0; i < this._outputsSplit.length; i++) {
            const line = this._outputsSplit[i];
            ctx.fillText(line, anchor.x, anchor.y + 30 + (height + 4) * i);
        }
    }

    render({ ctx, hitctx }: { ctx: CanvasRenderingContext2D, hitctx: CanvasRenderingContext2D }, scene: Scene) {

        super.render({ hitctx });

        this.scene = scene;

        this.setRadius();

        ctx.fillStyle = 'black';
        ctx.strokeStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 1;

        ctx.font = '20px Arial';

        const { actualWidth, actualHeight } = this.mesure(ctx);

        const we = actualWidth / Math.sqrt(2) * 2;
        const he = actualHeight / Math.sqrt(2) * 2;

        this.actualWidth = we;
        this.actualHeight = he;

        drawEllipseByCenter(ctx, this.x, this.y, we, he);

        this.w = we;
        this.h = he;

        ctx.fillStyle = 'white';

        const metricsName = ctx.measureText(this.name);
        // const actualWidthName = metricsName.width;
        const actualHeightName = metricsName.actualBoundingBoxAscent + metricsName.actualBoundingBoxDescent;

        const textAnchor = {

            x: this.x,
            y: this.y - (actualHeight / 2) + actualHeightName + 10

        }

        ctx.fillText(
            this.name,
            textAnchor.x,
            textAnchor.y);

        ctx.strokeStyle = 'white';

        ctx.beginPath();
        ctx.moveTo(textAnchor.x - actualWidth / 2, textAnchor.y + 10);
        ctx.lineTo(textAnchor.x + actualWidth / 2, textAnchor.y + 10);
        ctx.stroke();

        ctx.strokeStyle = 'black';

        this.renderOutputText(ctx, textAnchor, actualHeightName);

        // if (this.selected) {

        //     const bounds = this.getBounds();
        //     ctx.strokeStyle = "#888";
        //     ctx.strokeRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);

        // }

    }

}

export class Transition extends Graphic {
    from: State;
    to: State;
    following: boolean;
    output: string;
    condition: string;

    constructor({ x = 0, y = 0, from = new State(), to = new State(), output = "", condition = "", uuid = uuidv4() } = {}) {

        if (typeof from === "undefined" || typeof to === "undefined") {
            throw new Error();
        }

        super({ x, y, uuid });

        this.output = output;
        this.condition = condition;
        this.following = false;

        this.from = from;
        this.to = to;

        this.from.transitions.push(this);
        this.to.transitions.push(this);

        const hitBox = new HitBox({
            _render: function ({ hitctx }) {

                const { from, to, output, condition } = this.object as Transition;

                const textX = (from.x + to.x) / 2;
                const textY = (from.y + to.y) / 2 - 15;

                hitctx.fillStyle = this._hitColor;
                hitctx.strokeStyle = this._hitColor;
                hitctx.lineWidth = 10;

                drawLine(hitctx, from, to);

                hitctx.textAlign = 'center';
                hitctx.textBaseline = 'middle';
                hitctx.font = '20px Arial';

                const metricsOutput = hitctx.measureText(output);
                const metricsCondition = hitctx.measureText(condition);

                let metrics = metricsCondition;

                if (metricsOutput.width > metricsCondition.width) {
                    metrics = metricsOutput;
                }

                const actualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

                if (from === to) {

                    hitctx.fillRect(
                        textX + 100 - metrics.width / 2,
                        textY - 100 - actualHeight / 2,
                        metrics.width,
                        actualHeight + 15 + actualHeight);

                } else {

                    hitctx.fillRect(textX - metrics.width / 2, textY - actualHeight / 2, metrics.width, actualHeight + 15 + actualHeight);

                }
            }
        });

        hitBox.handler.contextMenu = (function (this: HitBox, pos: { x: number, y: number }) {

            const contextMenu = this.object?.scene?.tab?.viewer?.contextMenu;

            if (contextMenu) {

                contextMenu.setTarget(this.object);
                contextMenu.setItems(itemsTransition);
                contextMenu.open(pos.x, pos.y);

            }

        }).bind(hitBox);

        hitBox.handler.mouseDown = (function (this: HitBox) {

            setSelectedTransition(this.object);

        }).bind(hitBox);

        hitBox.bind(this);

    }

    getBounds() {

        const targets = [this.to, this.from];

        let minXTarget = { x: Infinity, w: 0 };
        let maxXTarget = { x: -Infinity, w: 0 };

        let minYTarget = { y: Infinity, h: 0 };
        let maxYTarget = { y: -Infinity, h: 0 };

        for (const object of targets) {

            if (object.x < minXTarget.x) {
                minXTarget = object;
            }


            if (object.x > maxXTarget.x) {
                maxXTarget = object;
            }


            if (object.y < minYTarget.y) {
                minYTarget = object;
            }


            if (object.y > maxYTarget.y) {
                maxYTarget = object;
            }

        }

        return {

            left: minXTarget.x - minXTarget.w / 2,
            right: maxXTarget.x + maxXTarget.w / 2,
            top: minYTarget.y - minYTarget.h / 2,
            bottom: maxYTarget.y + maxYTarget.h / 2

        }

    }

    toJSON() {

        return {

            type: "Transition",
            options: {
                uuid: this.uuid,
                output: this.output,
                condition: this.condition,

                link_from: this.from.uuid,
                link_to: this.to.uuid
            }

        };

    }

    toXML() {

        return `
        <Transition>
            <uuid>${this.uuid}</uuid>
            <output>${this.output}</output>
            <condition>${this.condition.replaceAll('&&', '&amp;&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</condition>
            <link_from>${this.from.uuid}</link_from>
            <link_to>${this.to.uuid}</link_to>
        </Transition>
        `;

    }

    delete() {

        const indexTo = this.to.transitions.indexOf(this);
        indexTo > -1 && this.to.transitions.splice(indexTo, 1);

        const indexFrom = this.from.transitions.indexOf(this);
        indexFrom > -1 && this.from.transitions.splice(indexFrom, 1);

        this.scene?.objects.remove(this);
    }

    render({ ctx, hitctx }: { ctx: CanvasRenderingContext2D, hitctx: CanvasRenderingContext2D }, scene: Scene) {

        super.render({ hitctx });

        this.scene = scene;

        if (this.following) {

            const boundingClientRect = scene?.canvasManager?.canvas.getBoundingClientRect();

            const mouse = scene.transform.transform({
                x: scene?.tab?.viewer?.app?.eventHandler.mouse.x,
                y: scene?.tab?.viewer?.app?.eventHandler.mouse.y
            });

            if (boundingClientRect) {

                const pos = {
                    x: mouse.x - boundingClientRect.left,
                    y: mouse.y - boundingClientRect.top
                }

                this.to.x = pos.x;
                this.to.y = pos.y;

            }

        }

        const startX = this.from.x;
        const startY = this.from.y;
        const endX = this.to.x;
        const endY = this.to.y;

        const conditionTextX = (startX + endX) / 2;
        const conditionTextY = (startY + endY) / 2 - 15;
        const textX = (startX + endX) / 2;
        const textY = (startY + endY) / 2 + 15;

        ctx.font = '20px Arial';
        ctx.fillStyle = 'black';
        ctx.strokeStyle = "black";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 2;

        ctx.fillStyle = 'black';

        const { from, to } = arrowTo(this.from, this.to);

        if (this.to === this.from) {

            ctx.fillText(this.condition, from.x + 100, conditionTextY - 100);
            ctx.fillText(this.output, from.x + 100, textY - 100);

            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.bezierCurveTo(from.x + 200, from.y, from.x, from.y - 200, from.x, from.y);
            ctx.stroke();

        } else {

            ctx.fillText(this.condition, conditionTextX, conditionTextY);
            ctx.fillText(this.output, textX, textY);

            drawLine(ctx, from, to);
            drawArrow(ctx, from, to);

        }

    }

}

export class Reset extends Graphic {
    isSynchronous: boolean;
    to: State;
    _radius: number;
    _dx: number;
    _dy: number;
    label: { x: number; y: number; width: number; height: number; };
    points: { from: { x: number; y: number; }; to: { x: number; y: number; }; };
    _dradius: number;

    constructor({ x = 0, y = 0, isSynchronous = true, to = new State(), uuid = uuidv4(), dx = 0, dy = 0 } = {}) {

        if (typeof to === "undefined") {
            throw new Error();
        }

        super({ x, y, uuid });

        this.isSynchronous = isSynchronous;

        this.to = to;
        this.to.resets.push(this);

        this._radius = 5;
        this._dx = dx || this.to.x - this.x;
        this._dy = dy || this.to.y - this.y;
        this._dradius = Math.sqrt(this._dx * this._dx + this._dy * this._dy);

        this.label = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        }

        this.points = arrowTo({ x, y, w: this._radius, h: this._radius }, this.to);

        const hitBox = new HitBox({
            _render: function ({ hitctx }) {

                const { points, _radius, label } = this.object as Reset;

                const startX = points.from.x;
                const startY = points.from.y;
                const endX = points.to.x;
                const endY = points.to.y;

                hitctx.fillStyle = this._hitColor;
                hitctx.strokeStyle = this._hitColor;
                hitctx.lineWidth = 10;

                hitctx.beginPath();
                hitctx.moveTo(startX, startY);
                hitctx.lineTo(endX, endY);
                hitctx.stroke();

                hitctx.textAlign = 'left';
                hitctx.font = '20px Arial';

                hitctx.beginPath();
                hitctx.arc(startX, startY, _radius, 0, Math.PI * 2);
                hitctx.fill();

                const metrics = hitctx.measureText("RESET");
                const actualWidth = metrics.width;
                const actualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

                label.x = startX + 10;
                label.y = startY - 10;
                label.width = actualWidth;
                label.height = actualHeight;

                hitctx.fillRect(startX + 10, startY - 10 - actualHeight, actualWidth, actualHeight);

            }
        });

        hitBox.handler.mouseDown = (function (this: HitBox) {

            setSelectedReset(this.object);

        }).bind(hitBox);

        hitBox.handler.mouseUp = (function (this: HitBox) {

            setSelectedReset(null);

        }).bind(hitBox);

        hitBox.handler.contextMenu = (function (this: HitBox, pos: { x: number, y: number }) {

            const contextMenu = this.object?.scene?.tab?.viewer?.contextMenu;

            if (contextMenu) {

                contextMenu.setTarget(this.object);
                contextMenu.setItems(itemsReset);
                contextMenu.open(pos.x, pos.y);

            }

        }).bind(hitBox);

        hitBox.bind(this);

    }

    getBounds() {
        const dx = this.label.x - (this.to.x - this._dx);
        const dy = this.label.y - (this.to.y - this._dy);

        return {
            top: this.to.y - this._dy - this._radius - this.label.height + dy,
            bottom: this.to.y - this._dy + this._radius,
            left: this.to.x - this._dx - this._radius,
            right: this.to.x - this._dx + this._radius + this.label.width + dx
        }

    }

    toJSON() {

        return {

            type: "Reset",
            options: {
                uuid: this.uuid,
                x: this.x,
                y: this.y,
                z: this.z,
                isSynchronous: this.isSynchronous,

                dx: this._dx,
                dy: this._dy,

                link_to: this.to.uuid
            }

        };

    }

    toXML() {

        return `
        <Reset>
            <uuid>${this.uuid}</uuid>
            <x type="float">${this.x}</x>
            <y type="float">${this.y}</y>
            <z type="float">${this.z}</z>
            <isSynchronous type="boolean">${this.isSynchronous}</isSynchronous>
            <dx type="float">${this._dx}</dx>
            <dy type="float">${this._dy}</dy>
            <link_to>${this.to.uuid}</link_to>
        </Reset>
        `;

    }

    delete() {

        const index = this.to.resets.indexOf(this);
        index > -1 && this.to.resets.splice(index, 1);

        this.scene?.objects.remove(this);
    }

    render({ ctx, hitctx }: { ctx: CanvasRenderingContext2D, hitctx: CanvasRenderingContext2D }, scene: Scene) {

        super.render({ hitctx });

        this.scene = scene;

        const x = this.to.x - this._dx;
        const y = this.to.y - this._dy;
        const angle = Math.atan2(this.to.y - y, this.to.x - x);

        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#000';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.arc(x, y, this._radius, 0, Math.PI * 2);
        this.isSynchronous && ctx.fill();
        ctx.stroke();

        this.points = arrowTo({ x, y, w: this._radius, h: this._radius }, this.to);

        ctx.beginPath();
        ctx.moveTo(this.points.from.x, this.points.from.y);
        ctx.lineTo(this.points.to.x, this.points.to.y);
        ctx.stroke();

        // Draw the arrowhead
        ctx.beginPath();
        ctx.moveTo(this.points.to.x, this.points.to.y);
        ctx.lineTo(
            this.points.to.x - 10 * Math.cos(angle - Math.PI / 6),
            this.points.to.y - 10 * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            this.points.to.x - 10 * Math.cos(angle + Math.PI / 6),
            this.points.to.y - 10 * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'black';
        ctx.textAlign = 'left';

        ctx.fillText("RESET", x + 10, y - 10);

    }

}

export class SelectBox extends Graphic {
    width: number;
    height: number;

    constructor({ x = 0, y = 0, width = 0, height = 0 }) {

        super({ x, y });

        this.width = width;
        this.height = height;

    }

    delete() {

        this.scene?.objects.remove(this);

    }

    render({ ctx }: { ctx: CanvasRenderingContext2D }, scene: Scene) {

        this.scene = scene;

        ctx.fillStyle = '#00ff0055';
        ctx.fillRect(this.x, this.y, this.width, this.height);

    }

}

export class Box extends Graphic {
    width: number;
    height: number;
    objects: State[];
    dx: number;
    dy: number;
    originalPositions: Map<any, any>;
    selection: boolean;

    constructor({ x = 0, y = 0, width = 100, height = 100, objects = [], selection = false } = {}) {

        super({ x, y });

        this.width = width;
        this.height = height;
        this.objects = objects;
        this.selection = selection;

        this.dx = 0;
        this.dy = 0;
        this.originalPositions = new Map();

        const hitBox = new HitBox({
            _render: function ({ hitctx }) {

                const { x, dx, y, dy, width, height } = this.object as Box;

                hitctx.fillStyle = this._hitColor;
                hitctx.fillRect(x + dx, y + dy, width, height);

            }
        });

        // hitBox.handler.contextMenu = (function (this: HitBox, pos: { x: number, y: number }) {

        //     const contextMenu = (this.object as StateMachine).scene?.tab?.viewer?.contextMenu;

        //     if (contextMenu) {

        //         contextMenu.setTarget(this.object);
        //         contextMenu.setItems(itemsBox);
        //         contextMenu.open(pos.x, pos.y);

        //     }

        // }).bind(hitBox);

        hitBox.bind(this);

    }

    getBounds() {

        if (this.objects.length === 0) {

            return {
                top: this.y,
                bottom: this.y + this.height,
                left: this.x,
                right: this.x + this.width
            };

        }

        let minX = this.x;
        let maxX = this.x + this.width;
        let minY = this.y;
        let maxY = this.y + this.height;

        if (this.selection) {

            minX = Infinity;
            minY = Infinity;

        }

        const objects = [];

        for (const object of this.objects) {

            objects.push(object);

            for (const reset of object.resets) {

                objects.push(reset);

            }

            // for (const transition of object.transitions) {

            //     objects.push(transition);

            // }

        }

        for (const object of objects) {

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

        }

        this.x = maxX - this.width;
        this.y = maxY - this.height;
        // this.width = maxX - minX;
        // this.height = maxY - minY;

        return {
            top: minY,
            bottom: maxY,
            left: minX,
            right: maxX
        };

    }

    setBounds() {

        const { top, bottom, left, right } = this.getBounds();

        this.x = left;
        this.y = top;
        this.width = right - left;
        this.height = bottom - top;

    }

    delete() {

        this.scene?.objects.remove(this);

    }

    update() {

        for (const object of this.objects) {

            let originalPos = this.originalPositions.get(object.uuid);

            if (!originalPos) {

                originalPos = { x: object.x, y: object.y };

                this.originalPositions.set(object.uuid, originalPos);

            }

            object.x = originalPos.x + this.dx;
            object.y = originalPos.y + this.dy;

        }

    }

    render({ ctx, hitctx }: { ctx: CanvasRenderingContext2D, hitctx: CanvasRenderingContext2D }, scene: Scene) {

        super.render({ hitctx });

        this.scene = scene;

        this.update();

        ctx.strokeStyle = "#888";
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x + this.dx, this.y + this.dy, this.width, this.height);

    }

}

let stColor = 0;
const colors: number[] = [];

export function genColor() {

    // const sr = Math.min(stColor, 255);
    // const sg = Math.min(Math.max((stColor - 255), 0), 255);
    // const sb = Math.min(Math.max((stColor - (255 + 255)), 0), 255);

    // const r = sr;
    // const g = sg;
    // const b = sb;

    // stColor++;

    // console.log(r, g, b);

    // return `hsl(${r},${g},${b})`;

    const color = Math.min(360, stColor);

    if (colors.indexOf(color) === -1) {

        colors.push(color);

        const h = color;

        stColor += 35;

        return `hsl(${h},100%,70%)`;

    } else {

        return `hsl(${0},100%,70%)`;

    }

}

export function genColors() {

    let lastLength = -1;

    const retColors = [];

    while (lastLength !== colors.length) {

        lastLength = colors.length;

        retColors.push(genColor());

    }

    return retColors;

}

export const palette = genColors();
palette.splice(-3);

let currPaletteColor = 0;

function getPalleteColor() {

    return palette[currPaletteColor++ % palette.length];

}

export class StateMachine extends Graphic {
    vm: VirtualMachine;
    objects: State[];
    validated: boolean | null;
    name: string;
    box: Box;
    color: string;
    collapsed: boolean;
    margin: number;
    checkMark: HTMLImageElement;
    xMark: HTMLImageElement;
    issues: any[];
    width: number;
    height: number;

    constructor({ uuid = uuidv4(), x = 0, y = 0, name = 'State Machine', vm = new VirtualMachine(), color = getPalleteColor(), objects = [] } = {}) {

        const box = new Box({ x, y, width: 100, height: 100, objects });

        const bounds = box.getBounds();

        super({ x: bounds.left, y: bounds.top, z: 1, uuid });

        this.name = name;
        this.box = box;
        this.objects = this.box.objects;

        this.vm = vm;
        this.color = color;

        this.collapsed = false;
        this.margin = 25;

        this.width = 0;
        this.height = 0;

        this.checkMark = document.getElementById("checkmark") as HTMLImageElement;
        this.xMark = document.getElementById("xmark") as HTMLImageElement;
        this.validated = null;
        this.issues = [];

        const hitBoxInside = new HitBox({
            _render: function ({ hitctx }) {

                const { x, y, width, height, collapsed } = this.object as StateMachine;

                if (!collapsed) {

                    hitctx.fillStyle = this._hitColor;
                    hitctx.fillRect(x, y, width, height);

                }

            }

        });
        hitBoxInside.handler.contextMenu = (function (this: HitBox, pos: { x: number, y: number }) {

            const contextMenu = (this.object as StateMachine)?.scene?.tab?.viewer?.contextMenu;

            if (contextMenu) {

                contextMenu.setTarget(this.object);
                contextMenu.setItems(itemsStateMachineInside);
                contextMenu.open(pos.x, pos.y);

            }

        }).bind(hitBoxInside);
        hitBoxInside.bind(this);

        const hitBox = new HitBox({
            _render: function ({ hitctx }) {

                const { x, y, width, height, collapsed } = this.object as StateMachine;

                hitctx.strokeStyle = this._hitColor;
                hitctx.fillStyle = this._hitColor;

                hitctx.lineWidth = 5;
                !collapsed && hitctx.strokeRect(x, y, width, height);
                hitctx.fillRect(x - hitctx.lineWidth / 2, y - 20 - 2, width + hitctx.lineWidth, 20);
                !collapsed && hitctx.strokeRect(x, y - 20, width, 20);

            }
        });

        hitBox.handler.contextMenu = (function (this: HitBox, pos: { x: number, y: number }) {

            const contextMenu = (this.object as StateMachine).scene?.tab?.viewer?.contextMenu;

            if (contextMenu) {

                contextMenu.setTarget(this.object);
                contextMenu.setItems(itemsStateMachine);
                contextMenu.open(pos.x, pos.y);

            }

        }).bind(hitBox);

        hitBox.handler.click = (function (this: HitBox, pos: { x: number, y: number }) {

            const machine = this.object as StateMachine;

            if (connectingStateMachine) {

                const linking = connectingStateMachine as StateMachine;

                const uuids = [linking.uuid, machine.uuid];
                const key = uuids.sort().join('|');

                if (!links.get(key)) {

                    manageStateMachineLinkModal.show({ from: linking, to: machine });

                }

                setConnectingStateMachine(null);
                return;

            }

            if (!machine.inCorner(pos)) {

                machine.collapsed = !machine.collapsed;

                for (let i = 0; i < machine.objects.length; i++) {

                    const object = machine.objects[i];

                    object.visible = !machine.collapsed;

                    for (let i = 0; i < object.resets.length; i++) {

                        object.resets[i].visible = !machine.collapsed;

                    }

                    for (let i = 0; i < object.transitions.length; i++) {

                        object.transitions[i].visible = !machine.collapsed;

                    }

                }

            }

        }).bind(hitBox);

        hitBox.handler.mouseDown = (function (this: HitBox, pos: { x: number, y: number }) {

            const machine = this.object as StateMachine

            if (!machine.inCorner(pos)) {

                setSelectedStateMachine(machine);

            }

        }).bind(hitBox);

        hitBox.handler.mouseUp = (function (this: HitBox) {

            setSelectedStateMachine(null);

        }).bind(hitBox);

        hitBox.bind(this);

    }

    inCorner({ x = 0, y = 0 } = {}) {

        const bounds = this.getBounds();
        if (this.scene) {

            const { x: wx, y: wy } = this.scene.transform.transform({ x, y });

            if (wx > bounds.right - 5 &&
                wy > bounds.bottom - 5) {

                return true;

            } else {

                return false;

            }

        }

    }

    getBounds() {

        const { top, bottom, left, right } = this.box.getBounds();

        return {

            left: left - this.margin,
            right: right + this.margin,
            top: top - this.margin,
            bottom: bottom + this.margin

        };

    }

    delete() {

        for (let i = 0; i < this.objects.length; i++) {

            this.objects[i].delete(true);

        }

        this.scene?.objects.remove(this);

        this.objects = [];

    }

    addInput({ name, size }: { name: string, size: number }) {

        this.vm._inputs[String(name)] = {

            name,
            string: `b(${size})`,
            length: size

        }

        this.scene?.objects.change("input", false, this);

    }

    addOutput({ name, size }: { name: string, size: number }) {

        this.vm._outputs[String(name)] = {

            name,
            string: `b(${size})`,
            length: size

        }

        this.scene?.objects.change("output", false, this);

    }

    toJSON() {

        return {

            type: "StateMachine",
            options: {
                uuid: this.uuid,
                name: this.name,

                x: this.x,
                y: this.y,

                color: this.color,
                vm: this.vm,

                list_link_objects: this.objects.map(object => object.uuid)
            }

        };

    }

    toXML() {

        return `
        <StateMachine>
            <uuid>${this.uuid}</uuid>
            <name>${this.name}</name>

            <x type="float">${this.x}</x>
            <y type="float">${this.y}</y>

            <color>${this.color}</color>
            <vm type="json">${JSON.stringify(this.vm)}</vm>

            <list_link_objects type="json">${JSON.stringify(this.objects.map(object => object.uuid))}</list_link_objects>
        </StateMachine>
        `;

    }

    render({ ctx, hitctx }: { ctx: CanvasRenderingContext2D, hitctx: CanvasRenderingContext2D }, scene: Scene) {

        super.render({ hitctx });

        this.scene = scene;

        const { left: minX, top: minY, right: maxX, bottom: maxY } = this.box.getBounds();
        this.box.x = minX;
        this.box.y = minY;

        this.x = minX - this.margin;
        this.y = minY - this.margin;
        this.width = maxX - minX + this.margin * 2;
        this.height = maxY - minY + this.margin * 2;

        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;
        ctx.lineWidth = 5;
        !this.collapsed && ctx.strokeRect(this.x, this.y, this.width, this.height);

        ctx.fillStyle = this.color;
        // ctx.strokeStyle = '#212121';
        ctx.fillRect(this.x - ctx.lineWidth / 2, this.y - 20 - 2, this.width + ctx.lineWidth, 20);
        ctx.fillStyle = "#000";
        ctx.fillText(this.name, this.x + ctx.lineWidth, this.y - 20 + ctx.lineWidth);

        if (!this.collapsed) {

            const inputValues = Object.values(this.vm._inputs);

            for (let i = 0; i < inputValues.length; i++) {

                const value: any = inputValues[i];

                const topLeft = { x: this.x - 64, y: this.y + 30 * i };

                ctx.fillStyle = this.color;
                ctx.fillRect(topLeft.x, topLeft.y, 64, 32);
                ctx.fillStyle = "#000";
                ctx.fillText(`${value.name}: ${value.string}`,
                    topLeft.x + ctx.lineWidth,
                    topLeft.y + ctx.lineWidth
                );

            }

            const outputValues = Object.values(this.vm._outputs);

            for (let i = 0; i < outputValues.length; i++) {

                const value: any = outputValues[i];

                const topLeft = { x: this.x + this.width, y: this.y + 30 * i };

                ctx.fillStyle = this.color;
                ctx.fillRect(topLeft.x, topLeft.y, 64, 32);
                ctx.fillStyle = "#000";
                ctx.fillText(`${value.name}: ${value.string}`,
                    topLeft.x + ctx.lineWidth,
                    topLeft.y + ctx.lineWidth
                );

            }

        }

        if (this.validated === true) {

            ctx.drawImage(
                this.checkMark,
                this.x + this.width - 22, this.y - 22,
                20, 20
            );

        } else if (this.validated === false) {

            ctx.drawImage(
                this.xMark,
                this.x + this.width - 20, this.y - 22,
                20, 20
            );

        }

    }

    validate() {

        const value = validate(this);

        this.validated = value.valid;
        this.issues = value.issues;

        this.scene?.tab?.update();

        return this.validated;

    }

}

export class Link extends Graphic {
    from: StateMachine;
    to: StateMachine;
    pairs: Map<any, any>;

    constructor({ uuid = uuidv4(), from, to, pairs = [] } = {}) {

        super({ uuid });

        this.from = from;
        this.to = to;
        this.pairs = new Map();

        for (const set of pairs) {

            this.pairs.set(set.key, set.pair)

        }

        const hitBox = new HitBox({
            _render: function ({ hitctx }) {

                const { from, to } = this.object as Link;

                hitctx.strokeStyle = this._hitColor;
                hitctx.fillStyle = this._hitColor;

                const fleft = { x: from.x, y: from.y - 10 };
                const fright = { x: from.x + from.width, y: from.y - 10 };

                const tleft = { x: to.x, y: to.y - 10 };
                const tright = { x: to.x + to.width, y: to.y - 10 };

                drawLine(hitctx, closest(to, [fleft, fright]), closest(from, [tleft, tright]));

            }
        });

        hitBox.handler.contextMenu = (function (this: HitBox, pos: { x: number, y: number }) {

            const contextMenu = (this.object as StateMachine).scene?.tab?.viewer?.contextMenu;

            if (contextMenu) {

                contextMenu.setTarget(this.object);
                contextMenu.setItems(itemsStateMachineLink);
                contextMenu.open(pos.x, pos.y);

            }

        }).bind(hitBox);

        hitBox.bind(this);

    }

    toJSON() {

        const pairs = [];

        for (const [key, pair] of this.pairs) {

            pairs.push({ key, pair });

        }

        return {

            type: "Link",
            options: {
                uuid: this.uuid,

                link_from: this.from.uuid,
                link_to: this.to.uuid,

                pairs: pairs

            }

        };

    }

    toXML() {

        const pairs = [];

        for (const [key, pair] of this.pairs) {

            pairs.push({ key, pair });

        }

        return `
        <Link>
            <uuid>${this.uuid}</uuid>

            <link_from>${this.from.uuid}</link_from>
            <link_to>${this.to.uuid}</link_to>

            <pairs type="json">${JSON.stringify(pairs).replaceAll('&&', '&amp;&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</pairs>
        </Link>
        `;

    }

    render({ ctx, hitctx }: { ctx: CanvasRenderingContext2D, hitctx: CanvasRenderingContext2D }, scene: Scene) {

        super.render({ hitctx });

        this.scene = scene;

        ctx.strokeStyle = '#000';

        const fleft = { x: this.from.x, y: this.from.y - 10 };
        const fright = { x: this.from.x + this.from.width, y: this.from.y - 10 };

        const tleft = { x: this.to.x, y: this.to.y - 10 };
        const tright = { x: this.to.x + this.to.width, y: this.to.y - 10 };

        drawLine(ctx, closest(this.to, [fleft, fright]), closest(this.from, [tleft, tright]));

    }

}

export const Graphics: { [key: string]: any } = {

    State,
    Transition,
    Reset,
    StateMachine,
    Link

}