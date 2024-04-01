/* eslint-disable @typescript-eslint/no-explicit-any */
import { StateMachine } from "./Graphic";
import { loadFilesModal, saveFilesModal } from "./PopUpMenu";
import { EventHandler } from "./Event";
import { SideBar } from "./SideBar";
import { SceneTab, TextTab, ViewTab } from "./Tab";
import { createElementFromHTML } from "../../Utils";
import { Viewer } from "./Viewer";
import {
    TopBar, TopBarDropdownItem,
    TopBarDropdownSeperatorItem, TopBarItem
} from "./TopBar";
import AppEvents from "./AppEvents";

export class App {

    private w1: HTMLElement;
    private w2: HTMLDivElement;

    content: HTMLDivElement;
    viewers: { [key: string]: Viewer };
    element: HTMLElement;
    topBar: any;
    activeViewer: any;
    sideBar: SideBar;
    subHandler: any;
    eventHandler: any;

    constructor() {

        this.element = createElementFromHTML(
            `
            <div class="container-fluid wrapper">
                <div class="w1"></div>
            </div>
        `
        );
        this.w1 = this.element.querySelector('.w1') as HTMLElement;
        this.w2 = document.createElement('div');
        this.w2.classList.add('w2');
        this.content = document.createElement('div');
        this.content.classList.add('main-content');

        this.eventHandler = new EventHandler();
        this.subHandler = this.eventHandler.listen(window);

        this.viewers = {};

        this.topBar = new TopBar();
        this.topBar.bind(this, this.w1);

        new TopBarItem({
            name: "File", items: [
                new TopBarDropdownItem({
                    name: 'New Sheet', callback: () => {

                        if (this.activeViewer) {
                            const tab = new SceneTab();
                            tab.bind(this.activeViewer);
                            this.activeViewer.setActiveTab(tab.uuid);
                        } else {
                            const viewer = new Viewer();
                            viewer.bind(this, this.content);
                            this.activeViewer = viewer;
                            const tab = new SceneTab();
                            tab.bind(this.activeViewer);
                            this.activeViewer.setActiveTab(tab.uuid);
                        }

                    }
                }),
                new TopBarDropdownSeperatorItem(),
                new TopBarDropdownItem({
                    name: 'Export', callback: () => {

                        if (this.activeViewer) {

                            saveFilesModal.show({
                                app: this
                            });

                        }

                    }
                }),
                new TopBarDropdownItem({
                    name: 'Import', callback: () => {

                        if (this.activeViewer) {
                            const tab = new SceneTab();
                            tab.bind(this.activeViewer);
                            this.activeViewer.setActiveTab(tab.uuid);
                        } else {
                            const viewer = new Viewer();
                            viewer.bind(this, this.content);
                            this.activeViewer = viewer;
                            const tab = new SceneTab();
                            tab.bind(this.activeViewer);
                            this.activeViewer.setActiveTab(tab.uuid);
                        }

                        loadFilesModal.show({
                            app: this
                        });

                    }
                })
            ]
        }).bind(this.topBar);

        new TopBarItem({
            name: "Edit", items: [
                new TopBarDropdownItem({
                    name: 'Undo', callback: () => {

                        if (!this?.activeViewer?.activeTab) return;
                        const { scene } = this.activeViewer.activeTab.sheet;

                        scene.undo();

                    }
                }),
                new TopBarDropdownItem({
                    name: 'Redo', callback: () => {

                        if (!this?.activeViewer?.activeTab) return;
                        const { scene } = this.activeViewer.activeTab.sheet;

                        scene.redo();

                    }
                }),
            ]
        }).bind(this.topBar);

        new TopBarItem({
            name: "View", items: [
                new TopBarDropdownItem({
                    name: 'Zoom in', callback: () => {

                        if (this?.activeViewer?.activeTab?.sheet?.scene) {

                            const scene = this.activeViewer.activeTab.sheet.scene;

                            const offset = {
                                x: 0,
                                y: 0
                            }

                            const t = scene.transform.transform(offset);
                            scene.transform.translate(t.x, t.y);
                            scene.transform.scale(1.1);
                            scene.transform.translate(-t.x, -t.y);

                        }

                    }
                }),
                new TopBarDropdownItem({
                    name: 'Zoom out', callback: () => {

                        if (this?.activeViewer?.activeTab?.sheet?.scene) {

                            const scene = this.activeViewer.activeTab.sheet.scene;

                            const offset = {
                                x: 0,
                                y: 0
                            }

                            const t = scene.transform.transform(offset);
                            scene.transform.translate(t.x, t.y);
                            scene.transform.scale(0.9);
                            scene.transform.translate(-t.x, -t.y);

                        }

                    }
                }),
                new TopBarDropdownItem({
                    name: 'Zoom to 100%', callback: () => {

                        if (this?.activeViewer?.activeTab?.sheet?.scene) {

                            const scene = this.activeViewer.activeTab.sheet.scene;

                            scene.transform.s = 1;
                            scene.transform.dx = -scene.startPosition.x;
                            scene.transform.dy = -scene.startPosition.y;

                        }

                    }
                }),
                new TopBarDropdownItem({
                    name: 'Fit to content', callback: () => {

                        if (this?.activeViewer?.activeTab?.sheet?.scene) {

                            const scene = this.activeViewer.activeTab.sheet.scene;

                            scene.fitOnScreen();

                        }

                    }
                }),
                new TopBarDropdownSeperatorItem(),
                new TopBarDropdownItem({
                    name: 'View XML', callback: () => {

                        if (this?.activeViewer?.activeTab && this?.activeViewer?.activeTab instanceof SceneTab) {

                            const { activeTab } = this.activeViewer;

                            const viewer = new Viewer();
                            viewer.bind(this, this.content);
                            const tab = new TextTab();
                            tab.sheet = activeTab.sheet;
                            tab.bind(viewer);
                            viewer.setActiveTab(tab.uuid);
                            tab.setFormat('XML');

                        }

                    }
                }),
                new TopBarDropdownItem({
                    name: 'View JSON', callback: () => {

                        if (this?.activeViewer?.activeTab && this?.activeViewer?.activeTab instanceof SceneTab) {

                            const { activeTab } = this.activeViewer;

                            const viewer = new Viewer();
                            viewer.bind(this, this.content);
                            const tab = new TextTab();
                            tab.sheet = activeTab.sheet;
                            tab.bind(viewer);
                            viewer.setActiveTab(tab.uuid);

                        }

                    }
                }),
            ]
        }).bind(this.topBar);

        new TopBarItem({
            name: "Validation", items: [
                new TopBarDropdownItem({
                    name: 'Validate', callback: () => {

                        if (this?.activeViewer?.activeTab && this?.activeViewer?.activeTab instanceof SceneTab) {

                            const { activeTab } = this.activeViewer;

                            for (const object of activeTab.sheet.scene.objects._objects) {

                                if (object instanceof StateMachine) {

                                    object.validate();

                                }

                            }

                        }

                    }
                })
            ]
        }).bind(this.topBar);

        new TopBarItem({
            name: "Help", items: [
                new TopBarDropdownItem({
                    name: 'Scripting language documentation', callback: () => {

                        if (this.activeViewer) {
                            const tab = new ViewTab();
                            tab.bind(this.activeViewer);
                            this.activeViewer.setActiveTab(tab.uuid);
                        } else {
                            const viewer = new Viewer();
                            viewer.bind(this, this.content);
                            this.activeViewer = viewer;
                            const tab = new ViewTab();
                            tab.bind(this.activeViewer);
                            this.activeViewer.setActiveTab(tab.uuid);
                        }

                    }
                })
            ]
        }).bind(this.topBar);

        this.w1 && this.w1.append(this.w2);

        this.sideBar = new SideBar();
        this.sideBar.bind(this, this.w2);

        this.w2.append(this.content);

        document.body.append(this.element);

        AppEvents(this);

        this.resize();

        // if (localStorage.getItem('_currentState')) {

        //     this.load();

        // }

    }

    resize() {

        const entries = Object.values(this.viewers);

        for (let i = 0; i < entries.length; i++) {

            entries[i].resize();

        }

    }

    // save() {

    //     const viewers = Object.values(this.viewers);

    //     const data = {
    //         viewers: []
    //     };

    //     for (const viewer of viewers) {

    //         const v = { uuid: viewer.uuid, tabs: [], active: viewer.active };

    //         const tabs = Object.values(viewer.tabs);

    //         for (const tab of tabs) {

    //             if (tab instanceof SceneTab) {

    //                 v.tabs.push({ uuid: tab.uuid, type: "scene", objects: JSON.stringify(tab.sheet?.scene.parser.toJSON()) });

    //             }

    //         }

    //         data.viewers.push(v);

    //     }

    //     localStorage.setItem('_currentState', JSON.stringify(data));

    // }

    // load() {

    //     const localString = localStorage.getItem('_currentState');
    //     const data = JSON.parse(localString);

    //     for (const viewer of data.viewers) {

    //         const v = new Viewer();
    //         v.bind(this, this.content);

    //         for (const tab of viewer.tabs) {

    //             const t = new SceneTab();
    //             t.bind(v);

    //             const objects = Parser.fromJSON(tab.objects);
    //             t.sheet?.scene.objects.set(objects);

    //             v.setActiveTab(t.uuid);

    //         }

    //         viewer.active && (this.activeViewer = v) && v.activate();

    //     }

    // }

}