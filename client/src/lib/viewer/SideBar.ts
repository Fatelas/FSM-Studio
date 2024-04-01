/* eslint-disable @typescript-eslint/no-explicit-any */
import { StateMachine } from "./Graphic";
import { createElementFromHTML } from "../../Utils";
import { App } from "./App";
import { SceneTab } from "./Tab";
import { Viewer } from "./Viewer";

declare global {
    interface Window { toggleCollapse: any; }
}

export class SideBar {
    element: HTMLElement;
    items: NodeListOf<Element>;
    content: SideBarContent;
    app: App | null;
    fileExplorerContent: HTMLElement;
    stateMachineExplorerContent: HTMLElement;
    stateMachineIssuesContent: HTMLElement;
    tableCache: Map<any, any>;

    constructor() {

        this.tableCache = new Map();

        this.element = createElementFromHTML(
            `
            <div class="sidebar" style="padding-top: 0px;">
                <div class="sw1">
                    <a href="#" style="display: flex; align-items: center;">
                        <i class="fas fa-folder" style="margin-right: 5px;"></i>
                    </a>
                    <a href="#" style="display: flex; align-items: center;">
                        <i class="fas fa-sitemap" style="margin-right: 5px;"></i>
                    </a>
                    <a href="#" style="display: flex; align-items: center;">
                        <i class="fas fa-solid fa-triangle-exclamation"></i>
                    </a>
                </div>
            </div>
        `
        );

        this.items = this.element.querySelectorAll('.fas');

        this.content = new SideBarContent();

        this.app = null;

        this.fileExplorerContent = createElementFromHTML(`

            <div class=".sidebar-wrapper">

                <h6 style = "text-align: center; font-size: 14px;">
                    Explorer
                </h6>
                <ul class="files">
                </ul>

            </div>

        `)
        const fileExplorer = this.element.querySelector('.fa-folder');
        fileExplorer?.parentNode?.addEventListener('click', () => {

            this.content.setContent(this.fileExplorerContent);

        });

        this.stateMachineExplorerContent = createElementFromHTML(`

            <div class=".sidebar-wrapper">

                <h6 style="text-align: center; font-size: 14px; margin: 5;">Structure</h6>
                <ul class="tree">
                </ul>

            </div>

        `)
        const stateMachineExplorer = this.element.querySelector('.fa-sitemap');
        stateMachineExplorer?.parentNode?.addEventListener('click', () => {

            this.content.setContent(this.stateMachineExplorerContent);

        });

        this.stateMachineIssuesContent = createElementFromHTML(`

            <div class=".sidebar-wrapper">

                <h6 style="text-align: center; font-size: 14px; margin: 5;">Issues</h6>
                <ul class="issues">
                </ul>

            </div>

        `)
        const stateMachineIssues = this.element.querySelector('.fa-triangle-exclamation');
        stateMachineIssues?.parentNode?.addEventListener('click', () => {

            this.content.setContent(this.stateMachineIssuesContent);

        });

    }

    bind(app: App, container?: HTMLElement) {

        this.app = app;

        if (container) {

            container.append(this.element);
            this.element.after(this.content.element);

        } else {

            this.app.element.append(this.element);
            this.element.after(this.content.element);

        }

        for (let i = 0; i < this.items.length; i++) {

            this.items[i]?.parentNode?.addEventListener('click', () => {

                if (this.content.opened) {

                    if (this.content.activeItem === i) {

                        this.content.close();

                    } else {

                        this.content.activeItem = i;

                    }

                } else {

                    this.content.activeItem = i;
                    this.content.open();

                }

                this.app?.resize();

            })

        }

        this.app.resize();

    }

    unbind() {

        if (this.app) {

            this.app = null;
            this.element.remove();
            this.content.element.remove();

        }

    }

    update() {

        if (this.app) {

            const viewers: Viewer[] = Object.values(this.app.viewers);

            const filesElement = this.fileExplorerContent.querySelector('.files');
            const treeElement = this.stateMachineExplorerContent.querySelector('.tree');
            const issuesElement = this.stateMachineIssuesContent.querySelector('.issues');

            const file = createElementFromHTML('<li style="cursor:pointer; display:flex; align-items: center; justify-content: space-between;"><i class="fa-solid fa-xmark close-icon"></i></li>');
            const machineOriginalElement = createElementFromHTML(`
            <li class="tree-item" onclick="toggleCollapse(event, this)">
                <i class="fa-regular fa-calendar"></i>
                Machine
                <ul class="nested-list"></ul>
            </li>
        `);
            const stateOriginalElement = createElementFromHTML(`
            <li class="tree-item" onclick="toggleCollapse(event, this)">
                <i class="fa-regular fa-circle"></i>
                State
                <ul class="nested-list"></ul>
            </li>
        `);
            const transitionOriginalElement = createElementFromHTML(`
            <li onclick="event.stopPropagation();">
                <i class="fa-solid fa-arrow-trend-up"></i>
                Transition
            </li>
        `)

            filesElement && (filesElement.innerHTML = '');

            this.tableCache = new Map();

            window.toggleCollapse = (event: MouseEvent, treeItem: HTMLElement) => {
                if (event.target === treeItem || !(event?.target as HTMLElement).closest('.nested-list')) {
                    const nestedList = treeItem.querySelector('.nested-list') as HTMLElement;
                    if (nestedList) {
                        treeItem.classList.toggle('collapsed');
                        nestedList.style.display = nestedList.style.display === 'block' ? 'none' : 'block';
                        this.tableCache.set(nestedList.getAttribute('data-uuid'), nestedList.style.display === 'block');

                        const item = nestedList?.parentNode?.querySelector('i');

                        nestedList.style.display !== 'block' &&
                            item?.classList.replace('fa-solid', 'fa-regular');

                        nestedList.style.display === 'block' &&
                            item?.classList.replace('fa-regular', 'fa-solid');

                    }
                }
            }

            for (const viewer of viewers) {

                const tabs = Object.values(viewer.tabs);

                for (const tab of tabs) {

                    const element = file.cloneNode(true) as HTMLElement;
                    element.prepend(tab.name);
                    tab.active && (element.style.backgroundColor = '#e6e6e6');
                    element.addEventListener('click', () => {

                        if (tab.viewer) {

                            tab.viewer.setActiveTab(tab.uuid);

                        }

                    });
                    element?.querySelector('.close-icon')?.addEventListener('click', e => {

                        e.preventDefault();
                        tab.close();

                    });

                    filesElement?.append(element);

                    if (tab instanceof SceneTab) {

                        !tab.update && (tab.update = () => {

                            // this.app?.save();

                            if (this.app?.activeViewer.activeTab === tab) {

                                treeElement && (treeElement.innerHTML = '');
                                issuesElement && (issuesElement.innerHTML = '');

                                if (tab.sheet) {

                                    for (const machine of tab.sheet.scene.objects._objects) {

                                        if (machine instanceof StateMachine) {

                                            const wrapper = document.createElement('div');
                                            wrapper.style.backgroundColor = machine.color;

                                            const title = document.createElement('div');
                                            title.innerHTML = machine.name;

                                            wrapper.append(title);

                                            for (const issue of machine.issues) {

                                                wrapper.append(issue.message);

                                            }

                                            issuesElement?.append(wrapper);

                                            const machineElement = machineOriginalElement.cloneNode(true) as HTMLElement;
                                            machineElement.childNodes[2].textContent = machine.name;
                                            machineElement.style.backgroundColor = machine.color;

                                            const machineListElement = machineElement.querySelector('.nested-list') as HTMLElement;
                                            machineListElement?.setAttribute('data-uuid', machine.uuid);
                                            machineListElement.style.display = 'none';

                                            const collapsed = this.tableCache.get(machine.uuid);
                                            collapsed && machineElement?.querySelector('i')?.classList.replace('fa-regular', 'fa-solid');
                                            collapsed && (machineListElement.style.display = 'block');
                                            collapsed && (machineListElement?.parentNode as HTMLElement).classList.add('collapsed');

                                            for (const state of machine.objects) {

                                                const stateElement = stateOriginalElement.cloneNode(true) as HTMLElement;
                                                stateElement.childNodes[2].textContent = state.name;

                                                const stateListElement = stateElement.querySelector('.nested-list') as HTMLElement;
                                                stateListElement?.setAttribute('data-uuid', state.uuid);
                                                stateListElement.style.display = 'none';

                                                const collapsed = this.tableCache.get(state.uuid);
                                                collapsed && stateElement?.querySelector('i')?.classList.replace('fa-regular', 'fa-solid');
                                                collapsed && (stateListElement.style.display = 'block');
                                                collapsed && (stateListElement?.parentNode as HTMLElement).classList.add('collapsed');

                                                machineListElement.append(stateElement);

                                                for (const transition of state.transitions) {

                                                    if (transition.from === state) {

                                                        const transitionElement = transitionOriginalElement.cloneNode(true);
                                                        transitionElement.childNodes[2].textContent = transition.condition;

                                                        stateListElement.append(transitionElement);

                                                    }


                                                }

                                            }

                                            treeElement?.append(machineElement);

                                        }

                                    }

                                }

                            }

                        })

                    }

                }


            }

        }

    }

}

class SideBarContent {
    element: HTMLElement;
    opened: boolean;
    activeItem: any;

    constructor() {

        this.element = createElementFromHTML(
            `
                <div class="collapse collapse-horizontal" id="sideContent"></div>
            `
        );
        this.opened = false;
        this.activeItem = null;

    }

    setContent(element: HTMLElement) {

        this.element.replaceChildren();
        if (element) {
            this.element.append(element);
        }

    }

    open() {

        this.opened = true;
        this.element.style.display = 'block';

    }

    close() {

        this.opened = false;
        this.element.style.display = 'none';

    }

}
