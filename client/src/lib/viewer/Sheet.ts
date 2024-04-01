import { Scene } from "./Scene";

export class Sheet {
    scene: Scene;

    constructor() {

        this.scene = new Scene();
        this.scene.sheet = this;

        // const history = [];

        this.scene.objects.handler.addEventListener("change", ({ detail: { objects, silent } }: { detail: { objects: never, silent: boolean } }) => {

            // console.log(event, target);
            // history.push(target || event);
            // console.log(history);

            if (!silent) {

                this.scene.history.add(JSON.stringify(this.scene.parser.toJSON(objects)));

            }

        })

    }

}