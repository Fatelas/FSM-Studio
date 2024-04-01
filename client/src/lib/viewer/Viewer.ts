/* eslint-disable @typescript-eslint/no-explicit-any */
import { ContextMenu } from "./ContextMenu";
import { createElementFromHTML, resizeViewers, uuidv4 } from "../../Utils";
import { App } from "./App";
import { CanvasManager } from "./CanvasManager";
import { SceneTab, Tab, TextTab } from "./Tab";

export class Viewer {
    private _events: { mousemove: (e: any) => void; mouseup: () => void; };

    uuid: string;
    active: boolean;
    app: App | null;
    element: HTMLElement;
    tabsWrapperElement: HTMLElement;
    tabsElement: HTMLElement;
    split: HTMLElement;
    content: HTMLElement;
    activeTab: Tab | null;
    bounds: DOMRect | null;
    contextMenu: ContextMenu;
    canvasManager: CanvasManager | null;
    tabs: { [key: string]: Tab };
    eventHandler?: any;

    constructor() {

        this.uuid = uuidv4();
        this.active = false;

        this.app = null;
        this.activeTab = null;
        this.bounds = null;
        this._events = { mousemove: () => { }, mouseup: () => { } };
        this.canvasManager = null;

        this.element = createElementFromHTML(
            `
            <div class="editor-area">
                <div class="tabs-wrapper">
                    <div class="tabs-wrapper-left">
                        <div class="nav nav-tabs" style='border:none;'>
                        </div>
                    </div>
                    <div class="tabs-wrapper-right">
                        <i class="fa-solid fa-table-columns close-icon"></i>
                    </div>
                </div>
                <div class="tab-content">
                </div>
            </div>
        `
        );
        this.tabsWrapperElement = this.element.querySelector('.tabs-wrapper') as HTMLElement;
        this.tabsElement = this.element.querySelector('.nav-tabs') as HTMLElement;
        this.split = this.element.querySelector('.close-icon') as HTMLElement;
        this.content = this.element.querySelector('.tab-content') as HTMLElement;


        this.tabs = {};

        this.contextMenu = new ContextMenu();

        this.tabsElement && this.tabsElement.addEventListener('wheel', e => {

            if (e.deltaY > 0) {

                this.tabsElement && (this.tabsElement.scrollLeft += 50);

            } else {

                this.tabsElement && (this.tabsElement.scrollLeft -= 50);

            }

        })

        this.element.addEventListener('mousedown', () => {

            if (this.app) {

                this.activate();

            }

        });

        this.split && (this.split.style.visibility = 'hidden');
        this.split && this.split.addEventListener('mousedown', () => {

            if (this.app) {

                const viewer = new Viewer();
                viewer.bind(this.app, this.app.content);
                const tab = new TextTab();
                tab.sheet = this.activeTab?.sheet;
                tab.bind(viewer);
                viewer.setActiveTab(tab.uuid);

            }

        });

        this.resize();

    }

    resizer() {

        let start: { x: number; y: number; } | null = null;
        this.bounds = this.element.getBoundingClientRect();
        let inside = false;

        this._events = {

            mousemove: e => {

                if (start) {

                    this.app && resizeViewers(this.app);

                    const deltaX = e.clientX - start.x;

                    if (this.bounds) {

                        const width = this.bounds.width + deltaX;

                        if (width > 100) {

                            this.content.style.width = `${width}px`;
                            this.content.style.height = `${this.bounds.height}px`;

                            this.tabsWrapperElement && (this.tabsWrapperElement.style.width = `${width}px`);

                            this.element.style.display = 'block';
                            this.element.style.width = `${width}px`;
                            this.element.classList.remove('editor-area');

                        }

                    }

                } else {

                    this.bounds = this.content.getBoundingClientRect();

                    if (e.clientX > this.bounds.right - 5) {

                        document.body.style.cursor = 'ew-resize';
                        inside = true;

                    } else {

                        inside = false;

                    }

                }

            },

            mouseup: () => {

                if (start) {

                    start = null;
                    this.bounds = this.content.getBoundingClientRect();
                    this.app && this.app.resize();

                }

            }

        }

        this.element.addEventListener('mousedown', e => {

            if (this.app) {

                if (Object.values(this.app.viewers).at(-1) === this) {

                    return;

                }

                if (inside) {

                    start = { x: e.clientX, y: e.clientY };
                    this.bounds = this.content.getBoundingClientRect();

                }

            }

        });

        window.addEventListener('mousemove', this._events.mousemove);
        window.addEventListener('mouseup', this._events.mouseup);

    }

    bind(app: App, container: HTMLElement) {

        this.app = app;
        this.app.viewers[this.uuid] = this;

        if (container) {

            container.append(this.element);

        } else {

            this.app.element.append(this.element);

        }

        this.resizer();

        this.app.resize();

        this.activeTab && this.activeTab.activate();

    }

    unbind() {

        this.element.remove();

        if (this.app) {

            delete this.app.viewers[this.uuid];
            const values = Object.values(this.app.viewers);

            if (values.length === 0) {

                this.app.activeViewer = null;

            } else if (this.active) {

                this.app.activeViewer = values.at(-1);

            }

            window.removeEventListener('mousemove', this._events.mousemove);
            window.removeEventListener('mouseup', this._events.mouseup);

            resizeViewers(this.app);
            this.app.resize();

        }

    }

    resize() {

        this.bounds = this.element.getBoundingClientRect();

        if (this.canvasManager) {

            this.canvasManager.resize();

        }

    }

    setActiveTab(uuid: string) {

        this.activeTab && this.activeTab.deactivate();
        this.activeTab = this.tabs[uuid];
        this.activeTab && this.activeTab.activate();

        if (this.activeTab instanceof SceneTab) {

            this.split.style.visibility = 'initial';


        } else {

            this.split.style.visibility = 'hidden';

        }

    }

    activate() {

        this.active = true;

        if (this.app) {

            this.app.activeViewer.deactivate();
            this.app.activeViewer = this;
            this.app.activeViewer.element.classList.add('active');

        }

        this.activeTab?.update && this.activeTab.update();

    }

    deactivate() {

        this.active = false;
        this.app && this.app.activeViewer.element.classList.remove('active');

    }

}