import { App } from "./App";

export default function (app: App) {

    app.subHandler.addEventListener('mousedown', (e: MouseEvent) => {

        const contextMenu = (e.target as HTMLElement)?.closest('.context-menu');

        if (!contextMenu) {

            const entries = Object.values(app.viewers);

            for (let i = 0; i < entries.length; i++) {

                entries[i].contextMenu.close();

            }

        }

    });

    // key events

    let viewHit = false;

    app.eventHandler.addKeyPressEvent('KeyH', () => {

        if (!app?.activeViewer?.activeTab) return;

        const { scene } = app.activeViewer.activeTab.sheet;

        if (!scene) return;

        if (!viewHit) {

            scene.canvasManager.canvas.replaceWith(scene.canvasManager.hitcanvas);

        } else {

            scene.canvasManager.hitcanvas.replaceWith(scene.canvasManager.canvas);

        }

        viewHit = !viewHit;

    });

    app.eventHandler.addKeyPressEvent('ctrl + KeyZ', () => {

        if (!app?.activeViewer?.activeTab) return;
        const { scene } = app.activeViewer.activeTab.sheet;

        scene.undo();

    });

    app.eventHandler.addKeyPressEvent('ctrl + KeyY', () => {

        if (!app?.activeViewer?.activeTab) return;
        const { scene } = app.activeViewer.activeTab.sheet;

        scene.redo();

    });

}