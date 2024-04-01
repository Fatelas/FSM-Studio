/* eslint-disable @typescript-eslint/no-explicit-any */
import { Point } from "./Math";
import { uuidv4 } from "../../Utils";
import { Graphic } from "./Graphic";
import { Viewer } from "./Viewer";

let currColor = 1;

export function getHitColor() {

    const val = currColor.toString(16).padStart(6, "0");
    currColor += 64;
    return '#' + val;

}

function componentToHex(c: number) {
    const hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r: number, g: number, b: number) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

export function getClickPosition(this: any, e: any) {

    const BoundingClientRect = this.canvasManager.canvas.getBoundingClientRect();

    return {
        x: e.clientX - BoundingClientRect.left,
        y: e.clientY - BoundingClientRect.top
    }
}

let lastTarget: any = null;

export function findTarget(this: any, x: number, y: number, cb1?: (...args: any[]) => any, cb2?: (...args: any[]) => any) {

    const data = this.canvasManager.hitctx.getImageData(x, y, 1, 1).data;
    const hex = rgbToHex(data[0], data[1], data[2]);

    cb2 && lastTarget && cb2(lastTarget);

    let target = null;

    for (const object of this.objects._objects) {

        for (const [, hitBox] of object.hitBoxes) {

            if (hitBox._hitColor === hex) {
                cb1 && cb1(object);
                target = hitBox;
            } else {
                // cb2 && cb2(object);
            }

        }

    }

    lastTarget = target;

    return target;

}

function getCompleteKeyCode(e: any) {

    return '' +
        (e.altKey && 'alt + ' || '') +
        (e.ctrlKey && 'ctrl + ' || '') +
        (e.metaKey && 'meta + ' || '') +
        (e.shiftKey && 'shift + ' || '') + e.code;

}

function getReverseCompleteKeyCode(code: string) {

    let event: any = {};
    const split = code.split('+');

    for (let subCode of split) {

        subCode = subCode.trim();

        if (subCode === 'alt') {
            event.altKey = true;
        }

        if (subCode === 'ctrl') {
            event.ctrlKey = true;
        }

        if (subCode === 'meta') {
            event.metaKey = true;
        }

        if (subCode === 'shift') {
            event.shiftKey = true;
        }

    }

    event.code = split.at(-1)?.trim();

    event = Object.assign({
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false
    }, event);

    return event;

}

class Handler {

    constructor() {

    }

    contextMenu(...params: any[]): void;
    contextMenu() { }

    click(...params: any[]): void;
    click() { }

    mouseUp(...params: any[]): void;
    mouseUp() { }

    out(...params: any[]): void;
    out() { }

    mouseDown(...params: any[]): void;
    mouseDown() { }

}

export class HitBox {
    uuid: string;
    options: any;
    handler: any;
    object?: Graphic;
    active: boolean;

    _hitColor: string;
    _render: any;

    constructor({ options = {},
        uuid = uuidv4(),
        _hitColor = getHitColor(),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _render = function (this: HitBox, ...params: any[]) { },
        active = true } = {}) {

        this.uuid = uuid;

        this._hitColor = _hitColor;
        this._render = _render;

        this.options = options;
        this.handler = new Handler();
        this.active = active;

    }

    bind(object: Graphic) {

        this.object = object;
        this.object.hitBoxes.set(this.uuid, this);

    }

    render(...params: unknown[]) {

        if (this.active) {

            this._render.call(this, ...params);

        }

    }

}

class SubEventHandler {
    uuid: string;
    element: HTMLElement;
    handlers: Map<any, any>;
    handled: Map<any, any>;
    viewer: Viewer | null;

    constructor(element: HTMLElement) {

        this.uuid = uuidv4();

        this.element = element;

        this.handlers = new Map();
        this.handled = new Map();

        this.viewer = null;

    }

    listener(type: string, e: any) {

        const handlers = this.handlers.get(type);

        const entries = handlers.entries();

        let entry = entries.next();

        while (!entry.done) {

            const value = entry.value[1];

            value(e, this.viewer);

            entry = entries.next();

        }

    }

    updateHandlers() {

        const entries = this.handlers.entries();

        let entry = entries.next();

        while (!entry.done) {

            const [key] = entry.value;

            if (!this.handled.get(key)) {

                this.handled.set(key, true);

                this.element.addEventListener(key, (e) => { this.listener(key, e); });

            }

            entry = entries.next();

        }

    }

    addEventListener(event: any, cb: (...args: any[]) => any) {

        const handler = this.handlers.get(event);
        const uuid = uuidv4();

        if (handler) {

            handler.set(uuid, cb);

        } else {

            this.handlers.set(event, new Map().set(uuid, cb));

        }

        this.updateHandlers();

        return uuid;

    }

    remove() {

    }

}

export class EventHandler {
    events: Map<any, any>;
    mouse: Point;
    keys: Map<string, any>;
    listening: Map<any, any>;

    constructor() {

        this.mouse = new Point(0, 0);
        this.keys = new Map();

        this.events = new Map();
        this.listening = new Map();

        window.addEventListener('mousemove', e => {

            this.mouse = new Point(e.clientX, e.clientY);

        });

        let lastkey: any = null;

        window.addEventListener('keydown', e => {

            this.keys.set(lastkey, false);
            this.keys.set(e.code, !!e.code);

            lastkey = e.code;

        })

        window.addEventListener('keyup', e => {

            if (this.keys.get(e.code)) {

                this.keypress(e);

            }

            this.keys.set(e.code, !e.code);

        })

    }

    keypress(e: any) {

        const completeKeyCode = getCompleteKeyCode(e);

        const events = this.events.get(completeKeyCode);

        if (events) {

            for (const event of events) {
                event(e);
            }

        }

    }

    addKeyPressEvent(code: string, cb: (...args: any[]) => any) {

        const reverseCompleteKeyCode = getCompleteKeyCode(getReverseCompleteKeyCode(code));

        if (this.events.get(reverseCompleteKeyCode)) {

            this.events.get(reverseCompleteKeyCode).push(cb);

        } else {

            this.events.set(reverseCompleteKeyCode, [cb]);

        }

    }

    listen(element: HTMLElement) {

        const handler = new SubEventHandler(element);

        this.listening.set(handler.uuid, handler);

        return handler;

    }

}