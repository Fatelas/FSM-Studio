/* eslint-disable @typescript-eslint/no-explicit-any */
import { Graphics } from "./Graphic";
import { Scene } from "./Scene";
import { htmlDecode, uuidv4 } from "../../Utils";
import { Tab } from "./Tab";
import { Viewer } from "./Viewer";
import { CanvasManager } from "./CanvasManager";
import { links } from "./Logic";

function downloadURI(uri: string, name: string) {
    const link = document.createElement("a");
    link.download = name;
    link.href = uri;
    link.click();
}

function getObjectWithUUID(objects: any[], uuid: string) {

    for (const object of objects) {

        if (object.uuid === uuid) {
            return object;
        }

    }


}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getObjectWithOldUUID(objects: any[], uuid: string) {

    for (const object of objects) {

        if (object._olduuid === uuid) {
            return object;
        }

    }


}

function hasLinks(object: any) {

    for (const key in object.options) {

        if (key.startsWith('link_') || key.startsWith('list_link')) {

            return true;

        }

    }

    return false;

}

function bindLinks(parsedObjects: any[], object: any) {

    for (const key in object.options) {

        if (key.startsWith('link_')) {

            const uuid = object.options[key];
            delete object.options[key];
            const newKey = key.slice('link_'.length);
            object.options[newKey] = getObjectWithUUID(parsedObjects, uuid);

        } else if (key.startsWith('list_link_')) {

            const uuids = object.options[key];
            delete object.options[key];
            const newKey = key.slice('list_link_'.length);

            const objects = [];

            for (let i = 0; i < uuids.length; i++) {

                objects.push(getObjectWithUUID(parsedObjects, uuids[i]));

            }

            object.options[newKey] = objects;

        }

    }

}

function sortLinks(objects: any[]) {

    objects.sort((a, b) => {

        return (hasLinks(a) as any) - (hasLinks(b) as any);

    });

}

export class Parser {
    scene: Scene;

    constructor(scene: Scene) {

        this.scene = scene;

    }

    toJSON(objects?: any) {

        const sceneJSON: { objects: any[] } = { objects: [] };

        for (const object of objects || this.scene.objects._objects) {


            const json = object.toJSON();

            if (JSON.stringify(json) !== "{}") {

                sceneJSON.objects.push(json);

            }

        }

        return sceneJSON;

    }

    static fromJSON(json: string) {

        const sceneJSON = JSON.parse(json);

        const objects = [];

        sortLinks(sceneJSON.objects);

        for (const object of sceneJSON.objects) {

            bindLinks(objects, object);

            const realObject = new Graphics[object.type](object.options);

            if (object.type === 'StateMachine') {

                for (const state of object.options.objects) {

                    state.machine = realObject;

                }

            }

            if (object.type === 'Link') {

                const uuids = [object.options.from.uuid, object.options.to.uuid];
                const key = uuids.sort().join('|');

                links.set(key, realObject);

            }

            objects.push(realObject);

        }

        return objects;
    }

    toPNG() {

        if (this.scene.canvasManager) {

            const json = this.scene?.parser.toJSON();

            const screenshotScene = new Scene();
            const viewer = new Viewer();
            const tab = new Tab();
            tab.bind(viewer);
            screenshotScene.bind(tab);
            screenshotScene.canvasManager = new CanvasManager(document.createElement('div'));
            screenshotScene.canvasManager.canvas.width = this.scene?.canvasManager?.canvas.width;
            screenshotScene.canvasManager.canvas.height = this.scene?.canvasManager?.canvas.height;
            const objects = Parser.fromJSON(JSON.stringify(json));
            screenshotScene.objects.set(objects);
            screenshotScene.render();
            screenshotScene.fitOnScreen();
            screenshotScene.render();

            return screenshotScene.canvasManager.canvas.toDataURL();

        }
    }

    toXML() {

        let XML = '<?xml version="1.0" encoding="UTF-8"?> \n';
        const XMLOpener = '<objects>';
        const XMLCloser = '</objects>';

        XML += XMLOpener;

        for (const object of this.scene.objects._objects) {

            XML += object.toXML();

        }

        return XML + XMLCloser;

    }

    static parseXML(sceneXML: any, sceneObjects: any[]) {

        for (const object of sceneXML) {

            const options: { [key: string]: any } = {};

            for (const option of object.children) {

                const type = option.getAttribute('type');

                if (type) {

                    if (type === 'float') {

                        options[option.tagName] = parseFloat(option.innerHTML);

                    } else if (type === 'boolean') {

                        options[option.tagName] = option.innerHTML === 'true';

                    } else if (type === 'json') {

                        options[option.tagName] = JSON.parse(option.innerHTML);

                    }

                } else {

                    options[option.tagName] = option.innerHTML;

                }

            }

            sceneObjects.push({ type: object.tagName, options });

        }

        return sceneObjects;
    }

    static fromXML(XML: string) {

        const xmlParser = new DOMParser();

        const sceneXML = xmlParser.parseFromString(XML, "text/xml");

        const objects = [];

        const sceneObjects: any[] = [];

        const children = sceneXML.getElementsByTagName('objects')[0].children;

        Parser.parseXML(children, sceneObjects);

        sortLinks(sceneObjects);

        for (const object of sceneObjects) {

            bindLinks(objects, object);

            if (object.type === 'Transition') {
                
                object.options.condition = htmlDecode(object.options.condition);

            }

            const realObject = new Graphics[object.type](object.options);

            if (object.type === 'StateMachine') {

                for (const state of object.options.objects) {

                    state.machine = realObject;

                }

            }

            if (object.type === 'Link') {

                const uuids = [object.options.from.uuid, object.options.to.uuid];
                const key = uuids.sort().join('|');

                links.set(key, realObject);

            }

            objects.push(realObject);

        }

        return objects;

    }

    downloadJSON(name = 'diagram') {

        const object = this.toJSON();

        const file = new Blob([JSON.stringify(object)]);
        downloadURI(URL.createObjectURL(file), name + '.json');

    }

    downloadXML(name = 'diagram') {

        const object = this.toXML();

        const file = new Blob([object]);
        downloadURI(URL.createObjectURL(file), name + '.xml');

    }

    downloadPNG(name = 'diagram') {

        const PNG = this.toPNG();
        PNG && downloadURI(PNG, name + '.png');

    }

    clone(objects: any[]) {

        const clones = Parser.fromJSON(JSON.stringify(this.toJSON(objects)));

        clones.sort((a, b) => {

            return (!!(a.from || a.to) as any) - (!!(b.from || b.to) as any);

        })

        for (const clone of clones) {

            clone._olduuid = clone.uuid;
            clone.uuid = uuidv4();
            clone.x += 100;
            clone.y += 100;

        }

        return clones;

    }

}