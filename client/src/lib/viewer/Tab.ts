/* eslint-disable @typescript-eslint/no-explicit-any */
import { State, StateMachine } from "./Graphic";
import { selectedReset, selectedStateMachine, selectedTransition, setSelectedReset, setSelectedStateMachine, setSelectedTransition } from "./Logic";
import { itemsDefault } from "./ContextMenu";
import { getClickPosition } from "./Event";
import { createElementFromHTML, prettifyXml, uuidv4 } from "../../Utils";
import { CanvasManager } from "./CanvasManager";
import { Sheet } from "./Sheet";
import { Viewer } from "./Viewer";
import { Parser } from "./Parser";

declare global {
    interface Window { js_beautify: any; }
}

let c = 0;

export class Tab {
    sheet?: Sheet;
    uuid: string;
    active: boolean;
    viewer: Viewer | null;
    name: string;
    element: HTMLElement;
    labelElement: HTMLElement;
    closeElement: HTMLElement;
    update?: any;

    constructor() {

        this.uuid = uuidv4();
        this.active = false;

        this.viewer = null;
        this.name = 'Tab ' + c++;

        this.element = createElementFromHTML(
            `
            <div class="nav-item">
                <a class="nav-link active">
                    <span class="tab-label"></span>
                    <i class="fa-solid fa-xmark close-icon"></i>
                </a>
            </div>
        `
        )
        this.labelElement = this.element.querySelector('.tab-label') as HTMLElement;
        this.labelElement && (this.labelElement.innerHTML = this.name);

        this.closeElement = this.element.querySelector('.close-icon') as HTMLElement;

        this.element.addEventListener('click', () => {

            if (this.viewer) {

                this.viewer.setActiveTab(this.uuid);

            }

        });

        this.closeElement && this.closeElement.addEventListener('click', () => {

            this.close();

        })

    }

    close() {

        const viewer = this.viewer;

        delete this.viewer?.tabs[this.uuid];

        if (viewer) {

            const values = Object.values(viewer.tabs);

            if (values.length === 0) {

                viewer.activeTab = null;

                viewer.unbind();

            } else if (this.active) {

                const val = values.at(-1);

                val && viewer.setActiveTab(val.uuid);

            }

        }

        this.unbind();

    }

    bind(viewer: Viewer) {

        this.viewer = viewer;
        this.viewer.tabs[this.uuid] = this;

        this.viewer.tabsElement.append(this.element);

        this.viewer?.app?.sideBar.update();

    }

    unbind() {

        if (this.viewer) {

            this.viewer?.app?.sideBar.update();

            delete this.viewer.tabs[this.uuid];
            this.viewer = null;

        }

        this.element.remove();

    }

    activate() {

        this.active = true;
        this.element.children[0].classList.add('active-tab');

        this.viewer?.resize();

        this.viewer?.app?.sideBar.update();

    }

    deactivate() {

        this.active = false;
        this.element.children[0].classList.remove('active-tab');

        this.viewer?.app?.sideBar.update();

    }

    setName(name: string) {

        this.name = name;
        this.labelElement && (this.labelElement.innerHTML = this.name);

    }

}

export class SceneTab extends Tab {
    event: () => void;

    constructor() {

        super();

        this.sheet = new Sheet();

        this.event = () => {

            this.update();

        }

    }

    initListeners() {

        // mouse events

        this.viewer?.eventHandler?.addEventListener('wheel', (e: any, viewer: Viewer) => {

            if (!viewer.activeTab) return;
            const scene = viewer.activeTab.sheet?.scene;
            if (!scene) return;

            const offset = getClickPosition.call(scene, e);
            const t = scene.transform.transform(offset);
            scene.transform.translate(t.x, t.y);
            const factor = Math.sign(e.deltaY) > 0 ? 0.9 : 1.1;
            scene.transform.scale(factor);
            scene.transform.translate(-t.x, -t.y);

        })

        this.viewer?.eventHandler.addEventListener("contextmenu", (e: any, viewer: Viewer) => {
            e.preventDefault();

            if (!viewer.activeTab) return;
            const scene = viewer.activeTab.sheet?.scene;
            if (!scene) return;

            const boundingClientRect = scene?.canvasManager?.canvas.getBoundingClientRect() as DOMRect;
            const { x: cx, y: cy } = getClickPosition.call(scene, e);
            const pos = {
                x: cx + boundingClientRect.left,
                y: cy + boundingClientRect.top
            }

            const real = scene.findTarget(cx, cy);
            real?.handler?.contextMenu && real.handler.contextMenu(pos);
            viewer.contextMenu.activeScene = scene;
            if (real?.handler?.contextMenu) return;
            const target = real?.object;

            if (target) {

                target.contextMenu(pos);

            } else {

                viewer.contextMenu.setTarget(target);
                viewer.contextMenu.setItems(itemsDefault);
                viewer.contextMenu.open(pos.x, pos.y);

            }

        })

        let panStart = null;
        let downStart = null;
        let groupDrag = null;
        let selectStart = null;
        let dragStart = null;
        let selectedState: State | null = null;
        let downInfo: { target: any; pos: any; } | null = null;
        let changed = false;
        let resizingStateMachine: { target: any; original: any; } | null = null;

        this.viewer?.eventHandler.addEventListener('mousedown', (e: { button: number; }, viewer: { contextMenu: { close: () => void; }; activeTab: { sheet: { scene: any; }; }; }) => {

            if (e.button === 2) { return; }

            viewer.contextMenu.close();

            if (!viewer.activeTab) return;
            const { scene } = viewer.activeTab.sheet;
            if (!scene) return;
            const { x, y } = getClickPosition.call(scene, e);

            if (e.button !== 1) {
                selectedState = null;
                const target = scene.findTarget(x, y);
                target && target.handler.mouseDown({ x, y });
                downInfo = { target, pos: { x, y } };

                const object = target?.object;

                if (object instanceof StateMachine) {

                    if (object.inCorner({ x, y })) {

                        const { box } = target.object;

                        const original = {

                            x: box.x,
                            y: box.y,
                            width: box.width,
                            height: box.height

                        }

                        resizingStateMachine = { target: object, original };

                    }

                }

                if (object instanceof State) {

                    dragStart = scene.transform.transform({ x, y });
                    selectedState = object;

                }

                downStart = scene.transform.transform({ x, y });

                if (object) {

                    if (scene.selection) {

                        if (object !== scene.selection && scene.selection.objects.indexOf(object) === -1) {

                            scene.selection.delete();

                        } else {

                            groupDrag = scene.transform.transform({ x, y });

                        }

                    }

                } else {

                    scene.selection && scene.selection.delete();

                }

                if (!object && e.button === 0) {

                    selectStart = scene.transform.transform({ x, y });
                    scene.selectBox.x = selectStart.x;
                    scene.selectBox.y = selectStart.y;
                    scene.selectBox.width = 0;
                    scene.selectBox.height = 0;

                }

            } else if (e.button === 1) {

                panStart = scene.transform.transform({ x, y });

            }

        })

        this.viewer?.eventHandler.addEventListener('mousemove', (e: any, viewer: { activeTab: { sheet: { scene: any; }; }; }) => {

            if (!viewer.activeTab) return;
            const { scene } = viewer.activeTab.sheet;
            if (!scene) return;
            const { x, y } = getClickPosition.call(scene, e);

            const target = scene.findTarget(x, y)?.object;

            if (target) {
                document.body.style.cursor = 'pointer';

                if (target instanceof StateMachine) {

                    if (target.inCorner({ x, y })) {

                        document.body.style.cursor = 'nwse-resize';

                    }

                }

            } else {
                document.body.style.cursor = 'default';
            }

            if (resizingStateMachine) {

                if (downStart) {

                    const { target, original } = resizingStateMachine;
                    const { box } = target;

                    const { x: wx, y: wy } = scene.transform.transform({ x, y });

                    const dx = wx - downStart.x;
                    const dy = wy - downStart.y;

                    let width = original.width + dx;
                    let height = original.height + dy;

                    if (width < 100) {
                        width = 100;
                    }
                    if (height < 100) {
                        height = 100;
                    }

                    box.width = width;
                    box.height = height;

                }

            }

            if (groupDrag) {

                const dragEnd = scene.transform.transform({ x, y });
                const dx = dragEnd.x - groupDrag.x;
                const dy = dragEnd.y - groupDrag.y;

                groupDrag = scene.transform.transform({ x, y });

                scene.selection.dx += dx;
                scene.selection.dy += dy;

                changed = true;

            }

            if (selectStart) {

                const corner = scene.transform.transform({ x, y });
                scene.selectBox.width = corner.x - scene.selectBox.x;
                scene.selectBox.height = corner.y - scene.selectBox.y;

            }

            if (dragStart) {

                const dragEnd = scene.transform.transform({ x, y });
                const dx = dragEnd.x - dragStart.x;
                const dy = dragEnd.y - dragStart.y;

                dragStart = scene.transform.transform({ x, y });

                if (selectedState) {

                    selectedState.x += dx;
                    selectedState.y += dy;

                }

                changed = true;

            } else if (panStart) {

                const panEnd = scene.transform.transform({ x, y });
                const dx = panEnd.x - panStart.x;
                const dy = panEnd.y - panStart.y;
                scene.transform.translate(dx, dy);
                panStart = scene.transform.transform({ x, y });

            } else if (selectedStateMachine) {

                const realMousePosition = scene.transform.transform({ x, y });
                const dx = realMousePosition.x - downStart.x;
                const dy = realMousePosition.y - downStart.y;
                downStart = scene.transform.transform({ x, y });

                selectedStateMachine.box.x += dx;
                selectedStateMachine.box.y += dy;

                for (const object of selectedStateMachine.objects) {

                    object.x += dx;
                    object.y += dy;

                }

                changed = true;

            } else if (selectedReset) {

                const realMousePosition = scene.transform.transform({ x, y });

                const angle = Math.atan2(
                    selectedReset.to.y - realMousePosition.y,
                    selectedReset.to.x - realMousePosition.x);

                const dx = Math.cos(angle) * selectedReset._dradius;
                const dy = Math.sin(angle) * selectedReset._dradius;

                selectedReset._dx = dx;
                selectedReset._dy = dy;

                changed = true;

            } else if (selectedTransition) {

                // const realMousePosition = scene.transform.transform({ x, y });
                // selectedTransition.controlPoint = realMousePosition;

            }

        })

        this.viewer?.eventHandler.addEventListener('mouseup', (e: any, viewer: { activeTab: { sheet: { scene: any; }; }; }) => {

            if (!viewer.activeTab) return;
            const { scene } = viewer.activeTab.sheet;
            if (!scene) return;
            const { x, y } = getClickPosition.call(scene, e);

            const target = scene.findTarget(x, y);
            target && target.handler.mouseUp();

            if (target &&
                downInfo &&
                target === downInfo.target &&
                downInfo.pos.x - x === 0 &&
                downInfo.pos.y - y === 0) {

                target.handler.click({ x, y });

            }

            if (changed) {

                scene.objects.change("move", false);

            }

            downInfo = null;
            panStart = null;
            groupDrag = null;
            dragStart = null;
            changed = false;
            resizingStateMachine = null;

            setSelectedStateMachine(null);
            setSelectedReset(null);
            setSelectedTransition(null);

            if (selectStart) {

                const pointsX = [scene.selectBox.x, scene.selectBox.x + scene.selectBox.width];
                const pointsY = [scene.selectBox.y, scene.selectBox.y + scene.selectBox.height];

                scene.getSelection({

                    top: Math.min(...pointsY),
                    bottom: Math.max(...pointsY),
                    left: Math.min(...pointsX),
                    right: Math.max(...pointsX)

                });

                scene.selectBox.x = selectStart.x;
                scene.selectBox.y = selectStart.y;
                scene.selectBox.width = 0;
                scene.selectBox.height = 0;

                selectStart = null;

            }

        })

    }

    bind(viewer: Viewer) {

        super.bind(viewer);

        if (this.viewer && !this.viewer.canvasManager) {

            this.viewer.canvasManager = new CanvasManager(this.viewer.content);
            this.viewer.eventHandler = this.viewer?.app?.eventHandler.listen(this.viewer.canvasManager.canvas);
            this.viewer.eventHandler.viewer = this.viewer;
            this.initListeners();

        }

    }

    activate() {

        super.activate();
        this.sheet?.scene.bind(this);

        this.sheet?.scene.objects.handler.removeEventListener('change', this.event);
        this.sheet?.scene.objects.handler.addEventListener('change', this.event);

    }

    deactivate() {

        super.deactivate();
        this.sheet?.scene.unbind();

    }

}

export class TextTab extends Tab {
    edit: HTMLDivElement;
    editWrapper: HTMLDivElement;
    format: string;
    event: () => void;
    editor?: AceAjax.Editor;
    private _replaced?: HTMLCanvasElement;
    private _wrapper?: HTMLElement;

    constructor() {

        super();

        this.sheet = new Sheet();
        this.edit = document.createElement('div');
        this.edit.style.display = 'flex';
        this.edit.style.flexGrow = '1';
        this.edit.style.paddingRight = '5px';
        this.editWrapper = document.createElement('div');
        this.editWrapper.style.display = 'flex';
        this.editWrapper.style.flexGrow = '1';
        this.edit.append(this.editWrapper);
        this.format = 'json'; //Default is JSON

        this.event = () => {

            this.change();

        }

    }

    setFormat(format: string) {

        this.format = format;
        this.updateEditorContent();

    }

    activate() {

        super.activate();

        const scene = this.sheet?.scene;

        this.viewer?.content.append(this.edit);
        // eslint-disable-next-line no-undef
        this.editor = ace.edit(this.editWrapper);
        this.editor.setTheme("ace/theme/monokai");

        this.editor.resize();

        this.editor.commands.addCommand({
            name: 'run',
            bindKey: { win: 'Ctrl-S', mac: 'Command-S' },
            exec: (editor: { getValue: () => any; }) => {

                let value = editor.getValue();

                if (value === '') {

                    value = this.format === 'json' ? '{"objects":[]}' : '<objects></objects>';

                }

                scene && scene.objects.set(this.format === 'json' ? Parser.fromJSON(value) : Parser.fromXML(value));

            }
        });

        // eslint-disable-next-line no-undef
        this.updateEditorContent();

        this.sheet?.scene.objects.handler.removeEventListener('change', this.event);
        this.sheet?.scene.objects.handler.addEventListener('change', this.event);

        if (this.viewer?.canvasManager) {

            this._replaced = this.viewer.canvasManager.canvas;
            this._wrapper = this._replaced.parentNode as HTMLElement;
            this._wrapper?.remove();
            this._replaced.remove();

        }

    }

    change() {

        const scene = this.sheet?.scene;

        // eslint-disable-next-line no-undef
        const value = this.format === 'json' ? window.js_beautify(JSON.stringify(scene?.parser.toJSON())) : prettifyXml(scene?.parser.toXML() as string);

        this.editor?.getSession().setValue(value);

    }

    deactivate() {

        this.edit.remove();
        this._wrapper && this.viewer?.content.append(this._wrapper);
        this._replaced && this._wrapper && this._wrapper.append(this._replaced);
        super.deactivate();

    }

    updateEditorContent() {

        const scene = this.sheet?.scene;

        // eslint-disable-next-line no-undef
        const value = this.format === 'json' ? window.js_beautify(JSON.stringify(scene?.parser.toJSON())) : prettifyXml(scene?.parser.toXML() as string);

        this.editor?.session.setMode(this.format === 'json' ? "ace/mode/json" : "ace/mode/xml");
        this.editor?.setValue(value);

    }

}

export class ViewTab extends Tab {
    wrapper: HTMLDivElement;
    frame: HTMLIFrameElement;
    private _replaced: any;
    private _wrapper: any;

    constructor() {

        super();

        this.setName('Scripting Language');

        this.wrapper = document.createElement('div');
        this.wrapper.classList.add('shadow-div');
        this.wrapper.style.width = '100%';
        this.wrapper.style.height = '100%';
        this.frame = document.createElement('iframe');
        this.frame.style.width = '100%';
        this.frame.style.height = '100%';
        this.frame.src = './help.html';
        this.wrapper.append(this.frame);

    }

    activate() {

        super.activate();

        if (this.viewer?.canvasManager) {

            this._replaced = this.viewer.canvasManager.canvas;
            this._wrapper = this._replaced.parentNode;
            this._replaced.remove();

        }

        this.viewer?.content.append(this.wrapper);

    }

    deactivate() {

        this.wrapper.remove();
        this._replaced && this._wrapper && this._wrapper.append(this._replaced);
        super.deactivate();

    }

}
