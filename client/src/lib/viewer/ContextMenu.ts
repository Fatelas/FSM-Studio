/* eslint-disable @typescript-eslint/no-explicit-any */
import { Box, StateMachine } from "./Graphic";
import { addResetModal, addStateModal, addTransitionModal, editResetModal, editStateModal, editTransitionModal, manageStateMachineLinkModal, manageStateMachineModal } from "./PopUpMenu";
import { createElementFromHTML } from "../../Utils";
import { Scene } from "./Scene";
import { setConnectingStateMachine } from "./Logic";

export class ContextMenu {
    private _x: number;
    private _y: number;
    private _visibility: boolean;

    element: HTMLElement;
    activeScene: Scene | null;
    rx: number;
    ry: number;
    target: any;

    constructor() {

        this.element = createElementFromHTML(`
        
            <ul class="dropdown-menu context-menu">
                
            </ul>
        
        `);

        this._x = 0;
        this._y = 0;
        this._visibility = true;

        this.x = 0;
        this.y = 0;
        this.rx = 0;
        this.ry = 0;
        this.visibility = false;
        this.activeScene = null;
        this.target = null;

        document.body.append(this.element);

    }

    set x(value: number) {
        this._x = value;
        this.element.style.left = value + 'px';
    }

    get x() {
        return this._x;
    }

    set y(value: number) {
        this._y = value;
        this.element.style.top = value + 'px';
    }

    get y() {
        return this._y;
    }

    set visibility(value: boolean) {
        this._visibility = value;
        this.element.style.display = value ? 'block' : 'none';
    }

    get visibiity() {
        return this._visibility;
    }

    wrap() {

        const menuBoundingClientRect = this.element.getBoundingClientRect();
        const canvasBoundingClientRect = {

            right: window.innerWidth,
            bottom: window.innerHeight

        }

        if (menuBoundingClientRect.x + menuBoundingClientRect.width > canvasBoundingClientRect.right) {
            this.x -= menuBoundingClientRect.width;
        }

        if (menuBoundingClientRect.y + menuBoundingClientRect.height > canvasBoundingClientRect.bottom) {
            this.y -= menuBoundingClientRect.height;
        }

    }

    open(x: number, y: number) {

        this.x = x;
        this.y = y;
        this.rx = x;
        this.ry = y;
        this.visibility = true;

        this.wrap();
    }

    close() {
        this.visibility = false;
    }

    setItems(items: ContextMenuItem[]) {
        this.element.replaceChildren();
        items.forEach(item => {
            item.extraCb = (e: any) => {

                this.close();
                item.cb(e, {
                    contextMenu: this,
                    target: this.target
                });

            }
            this.element.append(item.element);
        })
    }

    setTarget(target: any) {

        this.target = target;

    }

}

class ContextMenuItem {
    element: HTMLElement;
    link: HTMLElement;
    extraCb: any;
    cb: any;

    constructor(label: string, cb: any) {

        this.element = createElementFromHTML(`
            <li><a class="dropdown-item" href="#"></a></li>
        `);
        this.link = this.element.querySelector('.dropdown-item') as HTMLElement;
        this.link.textContent = label;
        this.cb = cb;
        this.extraCb = () => { };
        this.link.addEventListener('click', e => {

            this.extraCb(e);

        });

    }

}

export const itemsDefault = [
    new ContextMenuItem('Create State Machine', (e: any, { contextMenu }: { contextMenu: ContextMenu }) => {
        const scene = contextMenu.activeScene;
        const boundingClientRect = scene?.canvasManager?.canvas.getBoundingClientRect();
        if (boundingClientRect) {
            const position = scene?.transform.transform({
                x: contextMenu.rx - boundingClientRect.left,
                y: contextMenu.ry - boundingClientRect.top
            });

            const machine = new StateMachine({
                x: position?.x,
                y: position?.y
            });
            scene?.objects.add(machine);

        }
    }),
    new ContextMenuItem('Fit To Screen', (e: any, { contextMenu }: { contextMenu: ContextMenu }) => {
        const scene = contextMenu.activeScene;
        scene?.fitOnScreen();
    }),
    new ContextMenuItem('Clear Canvas', (e: any, { contextMenu }: { contextMenu: ContextMenu }) => {
        const scene = contextMenu.activeScene;
        scene?.objects.clear();
    }),
];

export const itemsStateMachineInside = [
    new ContextMenuItem('Add State', (e: any, { contextMenu, target }: { contextMenu: ContextMenu, target: any }) => {
        addStateModal.show({ contextMenu, target });
    })
];

export const itemsStateMachine = [
    new ContextMenuItem('Manage State Machine', (e: any, { target }: { target: any }) => {
        manageStateMachineModal.show({ machine: target });
    }),
    new ContextMenuItem('Validate', (e: any, { target }: { target: any }) => {
        target.validate();
    }),
    new ContextMenuItem('Delete State Machine', (e: any, { target }: { target: any }) => {
        target.delete();
    }),
    new ContextMenuItem('Connect State Machine', (e: any, { target }: { target: any }) => {
        setConnectingStateMachine(target);
    })
];

export const itemsStateMachineLink = [
    new ContextMenuItem('Edit State Machine Link', (e: any, { target }: { target: any }) => {
        manageStateMachineLinkModal.show(target);
    })
];

export const itemsState = [
    new ContextMenuItem('Delete State', (e: any, { target }: { target: any }) => {
        target.machine && (target.machine.validated = null);
        target.delete();
    }),
    new ContextMenuItem('Edit State', (e: any, { contextMenu, target }: { contextMenu: ContextMenu, target: any }) => {
        editStateModal.show({ contextMenu, state: target });
    }),
    new ContextMenuItem('Add Transition', (e: any, { contextMenu, target }: { contextMenu: ContextMenu, target: any }) => {
        addTransitionModal.show({ contextMenu, state: target });
    }),
    new ContextMenuItem('Add Reset', (e: any, { contextMenu, target }: { contextMenu: ContextMenu, target: any }) => {
        addResetModal.show({ contextMenu, state: target });
    })
];

export const itemsTransition = [
    new ContextMenuItem('Delete Transition', (e: any, { target }: { target: any }) => {
        target.to.machine && (target.to.machine.validated = null);
        target.delete();
    }),
    new ContextMenuItem('Edit Transition', (e: any, { contextMenu, target }: { contextMenu: ContextMenu, target: any }) => {
        editTransitionModal.show({ contextMenu, transition: target });
    })
];

export const itemsReset = [
    new ContextMenuItem('Delete Reset', (e: any, { target }: { target: any }) => {
        target.to.machine && (target.to.machine.validated = null);
        target.delete();
    }),
    new ContextMenuItem('Edit Reset', (e: any, { contextMenu, target }: { contextMenu: ContextMenu, target: any }) => {
        editResetModal.show({ contextMenu, reset: target });
    })
];

// export const itemsBox = [
//     new ContextMenuItem('Create State Machine', (e: any, { contextMenu, target }: { contextMenu: ContextMenu, target: any }) => {
//         const scene = contextMenu.activeScene;
//         const boundingClientRect = scene?.canvasManager?.canvas.getBoundingClientRect();
//         if (boundingClientRect) {
//             const position = scene?.transform.transform({
//                 x: contextMenu.rx - boundingClientRect.left,
//                 y: contextMenu.ry - boundingClientRect.top
//             });

//             const machine = new StateMachine({
//                 x: position?.x,
//                 y: position?.y
//             });
//             scene?.objects.add(machine);

//         }
//         target.delete();
//     })
// ];