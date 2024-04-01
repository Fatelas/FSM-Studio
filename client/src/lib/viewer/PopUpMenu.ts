/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link, Reset, State, Transition } from "./Graphic";
import { links, setIsAddingTransition } from "./Logic";
import { VirtualMachine, run, runCondition } from "../../StatusInfinitum";
import { createElementFromHTML, uuidv4 } from "../../Utils";
import { Parser } from "./Parser";

declare global {
    interface Window { bootstrap: any; }
}

class PopUpMenu {
    options: any;
    title: string;
    body: string;
    uuid: string;
    element: HTMLDivElement;
    bsModal: bootstrap.Modal;

    constructor({ title = "title" } = {}, body = "") {

        this.options = { title };
        this.title = title;
        this.body = body;
        this.uuid = uuidv4();

        this.element = document.createElement('div');
        this.element.style.position = 'absolute';
        this.element.innerHTML = `
    
      <div id="${this.uuid}" class="modal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h3 class="modal-title">${this.title}</h3>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              ${this.body}
            </div>
            <div class="modal-footer">
              <!-- <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button> -->
              <button id="submit" type="button" class="btn btn-primary">Add</button>
            </div>
          </div>
        </div>
      </div>

    `
        document.body.append(this.element);
        // eslint-disable-next-line no-undef
        this.bsModal = new window.bootstrap.Modal('#' + this.uuid, {});


    }

    show(options: unknown) {

        this.options = options;

        this.clear();
        this.bsModal.show();

    }

    hide() {

        this.bsModal.hide();

    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    clear(...params: any[]) {

        console.warn("Class " + this.constructor.name + " missing clear() implementation");

    }

}

export const addStateModal = new (class AddStateModal extends PopUpMenu {
    nameTextArea: HTMLTextAreaElement;
    outputsTextArea: HTMLTextAreaElement;

    constructor(options = {}) {

        options = Object.assign({
            title: "Add state"
        }, options)

        const body = `
      <div class="form-floating" style="margin-bottom: 16px">
        <textarea class="form-control" id="addnameTextArea" style="max-height: 100px"></textarea>
        <label for="addnameTextArea">Name</label>
      </div>
      <div class="form-floating">
        <textarea class="form-control" id="addoutputsTextArea" style="height: 100px; max-height: 100px"></textarea>
        <label for="addoutputsTextArea">Outputs</label>
      </div>


      `

        super(options, body);

        this.nameTextArea = this.element.querySelector("#addnameTextArea") as HTMLTextAreaElement;
        this.outputsTextArea = this.element.querySelector("#addoutputsTextArea") as HTMLTextAreaElement;

        this.outputsTextArea.addEventListener('input', (e: any) => {

            if (e.target.value.trim() === '') {

                this.outputsTextArea.classList.remove('alert', 'alert-success');
                this.outputsTextArea.classList.remove('alert', 'alert-danger');

            } else {

                try {

                    run(e.target.value, new VirtualMachine());

                    this.outputsTextArea.classList.remove('alert', 'alert-danger');
                    this.outputsTextArea.classList.add('alert', 'alert-success');


                } catch (e) {

                    this.outputsTextArea.classList.remove('alert', 'alert-success');
                    this.outputsTextArea.classList.add('alert', 'alert-danger');
                }

            }

        })

        this.element.querySelector("#submit")?.addEventListener('click', () => {

            const scene = this.options.contextMenu.activeScene;

            const name = this.nameTextArea.value.trim();
            const outputs = this.outputsTextArea.value.trim();

            if (name !== "") {

                const boundingClientRect = scene.canvasManager.canvas.getBoundingClientRect();

                const position = scene.transform.transform({

                    x: this.options.contextMenu.rx - boundingClientRect.left,
                    y: this.options.contextMenu.ry - boundingClientRect.top

                });

                const machine = this.options.target;

                const state = new State({
                    name,
                    outputs,
                    x: position.x,
                    y: position.y
                });

                machine.objects.push(state);
                state.machine = machine;
                machine.validated = null;
                scene.objects.add(state);
                this.bsModal.hide();

            }

        })

    }

    clear() {
        this.nameTextArea.value = "";
        this.outputsTextArea.value = "";

        this.outputsTextArea.classList.remove('alert', 'alert-success');
        this.outputsTextArea.classList.remove('alert', 'alert-danger');
    }

})

export const editStateModal = new (class EditStateModal extends PopUpMenu {
    nameTextArea: any;
    outputsTextArea: any;

    constructor(options = {}) {

        options = Object.assign({
            title: "Edit state"
        }, options)

        const body = `
      <div class="form-floating" style="margin-bottom: 16px">
        <textarea class="form-control" id="editnameTextArea" style="max-height: 100px"></textarea>
        <label for="editnameTextArea">Name</label>
      </div>
      <div class="form-floating">
        <textarea class="form-control" id="editoutputsTextArea" style="height: 100px; max-height: 100px"></textarea>
        <label for="editoutputsTextArea">Outputs</label>
      </div>


      `

        super(options, body);

        this.nameTextArea = this.element.querySelector("#editnameTextArea");
        this.outputsTextArea = this.element.querySelector("#editoutputsTextArea");

        this.outputsTextArea.addEventListener('input', (e: any) => {

            if (e.target.value.trim() === '') {

                this.outputsTextArea.classList.remove('alert', 'alert-success');
                this.outputsTextArea.classList.remove('alert', 'alert-danger');

            } else {

                try {

                    run(e.target.value, new VirtualMachine());

                    this.outputsTextArea.classList.remove('alert', 'alert-danger');
                    this.outputsTextArea.classList.add('alert', 'alert-success');


                } catch (e) {

                    this.outputsTextArea.classList.remove('alert', 'alert-success');
                    this.outputsTextArea.classList.add('alert', 'alert-danger');
                }

            }

        })

        const submit = this.element.querySelector("#submit") as HTMLElement;
        submit.innerHTML = 'Edit';
        submit.addEventListener('click', () => {

            const name = this.nameTextArea.value.trim();
            const outputs = this.outputsTextArea.value.trim();

            if (name !== "") {

                this.options.state.name = name;
                this.options.state.outputs = outputs;

                this.options.state.setRadius(true);

                for (const reset of this.options.state.resets) {

                    reset.x = this.options.state.x - (this.options.state.radius + 20);
                    reset.x = this.options.state.x - (this.options.state.radius + 20);
                    reset._dx = reset.to.x - reset.x;
                    reset._dy = reset.to.y - reset.y;
                    reset._dradius = Math.sqrt(reset._dx * reset._dx + reset._dy * reset._dy);

                }

                this.options.state?.machine && (this.options.state.machine.validated = null);

                this.options.state.scene.objects.change("edit", false, this.options.state);

                this.bsModal.hide();
            }

        })

    }

    clear() {
        this.nameTextArea.value = this.options.state.name;
        this.outputsTextArea.value = this.options.state.outputs;

        this.outputsTextArea.classList.remove('alert', 'alert-success');
        this.outputsTextArea.classList.remove('alert', 'alert-danger');
    }

})

export const addTransitionModal = new (class AddTransitionModal extends PopUpMenu {
    conditionsTextArea: any;
    outputsTextArea: any;

    constructor(options = {}) {

        options = Object.assign({
            title: "Add transition"
        }, options)

        const body = `
      <div class="form-floating" style="margin-bottom: 16px">
        <textarea class="form-control" id="addconditionsTextArea" style="height: 100px; max-height: 100px"></textarea>
        <label for="addconditionsTextArea">Conditions</label>
      </div>
      <div class="form-floating">
        <textarea class="form-control" id="addtoutputsTextArea" style="height: 100px; max-height: 100px"></textarea>
        <label for="addtoutputsTextArea">Outputs</label>
      </div>


      `

        super(options, body);

        this.conditionsTextArea = this.element.querySelector("#addconditionsTextArea");

        this.conditionsTextArea.addEventListener('input', (e: any) => {

            if (e.target.value.trim() === '') {

                this.conditionsTextArea.classList.remove('alert', 'alert-success');
                this.conditionsTextArea.classList.remove('alert', 'alert-danger');

            } else {

                try {

                    runCondition(e.target.value, new VirtualMachine());

                    this.conditionsTextArea.classList.remove('alert', 'alert-danger');
                    this.conditionsTextArea.classList.add('alert', 'alert-success');


                } catch (e) {

                    this.conditionsTextArea.classList.remove('alert', 'alert-success');
                    this.conditionsTextArea.classList.add('alert', 'alert-danger');
                }

            }

        })

        this.outputsTextArea = this.element.querySelector("#addtoutputsTextArea");

        this.outputsTextArea.addEventListener('input', (e: any) => {

            if (e.target.value.trim() === '') {

                this.outputsTextArea.classList.remove('alert', 'alert-success');
                this.outputsTextArea.classList.remove('alert', 'alert-danger');

            } else {

                try {

                    run(e.target.value, new VirtualMachine());

                    this.outputsTextArea.classList.remove('alert', 'alert-danger');
                    this.outputsTextArea.classList.add('alert', 'alert-success');


                } catch (e) {

                    this.outputsTextArea.classList.remove('alert', 'alert-success');
                    this.outputsTextArea.classList.add('alert', 'alert-danger');
                }

            }

        })

        this.element.querySelector("#submit")?.addEventListener('click', () => {

            const scene = this.options.contextMenu.activeScene;

            const output = this.outputsTextArea.value.trim();
            const condition = this.conditionsTextArea.value.trim();

            const transition = new Transition({
                from: this.options.state,
                to: new State({}),
                output,
                condition
            });
            transition.following = true;
            for (const [, hitBox] of transition.hitBoxes) {

                hitBox.active = false;

            }
            scene.objects.add(transition, true);

            setIsAddingTransition(transition);

            this.bsModal.hide();

        })

    }

    clear() {

        this.conditionsTextArea.value = "";
        this.outputsTextArea.value = "";

        this.conditionsTextArea.classList.remove('alert', 'alert-success');
        this.conditionsTextArea.classList.remove('alert', 'alert-danger');
        this.outputsTextArea.classList.remove('alert', 'alert-success');
        this.outputsTextArea.classList.remove('alert', 'alert-danger');

    }

})

export const editTransitionModal = new (class EditTransitionModal extends PopUpMenu {
    conditionsTextArea: any;
    outputsTextArea: any;

    constructor(options = {}) {

        options = Object.assign({
            title: "Edit transition"
        }, options)

        const body = `
      <div class="form-floating" style="margin-bottom: 16px">
        <textarea class="form-control" id="editconditionsTextArea" style="height: 100px; max-height: 100px"></textarea>
        <label for="editconditionsTextArea">Conditions</label>
      </div>
      <div class="form-floating">
        <textarea class="form-control" id="edittoutputsTextArea" style="height: 100px; max-height: 100px"></textarea>
        <label for="edittoutputsTextArea">Outputs</label>
      </div>


      `

        super(options, body);

        this.conditionsTextArea = this.element.querySelector("#editconditionsTextArea");

        this.conditionsTextArea.addEventListener('input', (e: any) => {

            if (e.target.value.trim() === '') {

                this.conditionsTextArea.classList.remove('alert', 'alert-success');
                this.conditionsTextArea.classList.remove('alert', 'alert-danger');

            } else {

                try {

                    runCondition(e.target.value, new VirtualMachine());

                    this.conditionsTextArea.classList.remove('alert', 'alert-danger');
                    this.conditionsTextArea.classList.add('alert', 'alert-success');


                } catch (e) {

                    this.conditionsTextArea.classList.remove('alert', 'alert-success');
                    this.conditionsTextArea.classList.add('alert', 'alert-danger');
                }

            }

        })

        this.outputsTextArea = this.element.querySelector("#edittoutputsTextArea");

        this.outputsTextArea.addEventListener('input', (e: any) => {

            if (e.target.value.trim() === '') {

                this.outputsTextArea.classList.remove('alert', 'alert-success');
                this.outputsTextArea.classList.remove('alert', 'alert-danger');

            } else {

                try {

                    run(e.target.value, new VirtualMachine());

                    this.outputsTextArea.classList.remove('alert', 'alert-danger');
                    this.outputsTextArea.classList.add('alert', 'alert-success');


                } catch (e) {

                    this.outputsTextArea.classList.remove('alert', 'alert-success');
                    this.outputsTextArea.classList.add('alert', 'alert-danger');
                }

            }

        })

        const submit = this.element.querySelector("#submit") as HTMLElement;
        submit.innerHTML = 'Edit';
        submit.addEventListener('click', () => {

            const condition = this.conditionsTextArea.value.trim();
            const output = this.outputsTextArea.value.trim();

            this.options.transition.condition = condition;
            this.options.transition.output = output;

            this.options.transition?.to?.machine && (this.options.transition.to.machine.validated = null);

            this.options.transition.scene.objects.change("edit", false, this.options.transition);

            this.bsModal.hide();

        })

    }

    clear() {

        this.conditionsTextArea.value = this.options.transition.condition;
        this.outputsTextArea.value = this.options.transition.output;

        this.conditionsTextArea.classList.remove('alert', 'alert-success');
        this.conditionsTextArea.classList.remove('alert', 'alert-danger');
        this.outputsTextArea.classList.remove('alert', 'alert-success');
        this.outputsTextArea.classList.remove('alert', 'alert-danger');

    }

})

export const addResetModal = new (class AddResetModal extends PopUpMenu {

    constructor(options = {}) {

        options = Object.assign({
            title: "Add reset"
        }, options)

        const body = `
      <div class="form-check">
        <input class="form-check-input" type="radio" name="isSynchronous" id="addSynchronous" checked>
        <label class="form-check-label" for="addSynchronous">
          Synchronous
        </label>
      </div>
      <div class="form-check">
        <input class="form-check-input" type="radio" name="isSynchronous" id="addAsynchronous">
        <label class="form-check-label" for="addAsynchronous">
          Asynchronous
        </label>
      </div>

      `

        super(options, body);

        this.element.querySelector("#submit")?.addEventListener('click', () => {

            const scene = this.options.contextMenu.activeScene;

            const isSynchronous = (this.element.querySelector('input[name="isSynchronous"]:checked') as HTMLElement).id === "addSynchronous";

            const state = this.options.state;

            const reset = new Reset({
                to: state,
                isSynchronous,
                x: state.x - (state.radius + 20),
                y: state.y - (state.radius + 20)
            });

            scene.objects.add(reset);
            reset?.to?.machine && (reset.to.machine.validated = null);
            this.bsModal.hide();

        })

    }

    clear() {

        (this.element.querySelector('#addSynchronous') as HTMLInputElement).checked = true;
        (this.element.querySelector('#addAsynchronous') as HTMLInputElement).checked = false;

    }

})

export const editResetModal = new (class EditResetModal extends PopUpMenu {

    constructor(options = {}) {

        options = Object.assign({
            title: "Edit reset"
        }, options)

        const body = `
      <div class="form-check">
        <input class="form-check-input" type="radio" name="isSynchronous" id="editSynchronous" checked>
        <label class="form-check-label" for="editSynchronous">
          Synchronous
        </label>
      </div>
      <div class="form-check">
        <input class="form-check-input" type="radio" name="isSynchronous" id="editAsynchronous">
        <label class="form-check-label" for="editAsynchronous">
          Asynchronous
        </label>
      </div>

      `

        super(options, body);

        const submit = this.element.querySelector("#submit") as HTMLElement;
        submit.innerHTML = 'Edit';
        submit.addEventListener('click', () => {

            this.options.reset.isSynchronous = (this.element.querySelector('input[name="isSynchronous"]:checked') as HTMLElement).id === "editSynchronous";

            this.options.reset?.to?.machine && (this.options.reset.to.machine.validated = null);
            this.options.reset.scene.objects.change("edit", false, this.options.reset);


            this.bsModal.hide();

        })

    }

    clear() {

        if (this.options.reset.isSynchronous) {

            (this.element.querySelector('#editSynchronous') as HTMLInputElement).checked = true;
            (this.element.querySelector('#editAsynchronous') as HTMLInputElement).checked = false;

        } else {

            (this.element.querySelector('#editSynchronous') as HTMLInputElement).checked = false;
            (this.element.querySelector('#editAsynchronous') as HTMLInputElement).checked = true;

        }

    }

})

export const loadFilesModal = new (class LoadFilesModal extends PopUpMenu {

    constructor(options = {}) {

        options = Object.assign({
            title: "Load File"
        }, options)

        const body = `
      <div class="input-group mb-3">
        <input type="file" class="form-control" id="fileUpload">
        <label class="input-group-text" for="fileUpload">Upload</label>
      </div>

      `

        super(options, body);

        const input = this.element.querySelector("#fileUpload") as HTMLInputElement;
        const submit = this.element.querySelector("#submit") as HTMLElement;
        submit.innerHTML = 'Load';
        submit.addEventListener('click', () => {

            const scene = this.options.app.activeViewer.activeTab.sheet.scene;

            if (input.files && input.files.length !== 0) {

                const file = input.files[0];

                const reader = new FileReader();
                reader.addEventListener(
                    "load",
                    () => {
                        const type = file.type;
                        if (type === 'application/json') {

                            const objects = Parser.fromJSON(reader.result);
                            scene.objects.set(objects);

                        } else if (type === 'text/xml') {

                            const objects = Parser.fromXML(reader.result);
                            scene.objects.set(objects);

                        }

                        this.bsModal.hide();
                    },
                    false,
                );

                reader.addEventListener("error", e => {
                    console.log(e);
                });

                reader.readAsText(input.files[0]);

            }
        })

    }

    clear() {

        (this.element.querySelector("#fileUpload") as HTMLInputElement).value = "";

    }


})

export const saveFilesModal = new (class SaveFilesModal extends PopUpMenu {

    constructor(options = {}) {

        options = Object.assign({
            title: "Save File"
        }, options)

        const body = `
      <div class="input-group mb-3">
        <span class="input-group-text" id="filename-label">Filename</span>
        <input id="filename" type="text" class="form-control" placeholder="Diagram" aria-describedby="filename-label">
      </div>
      <div class="input-group mb-3">
        <label class="input-group-text" for="filetype">File type</label>
        <select class="form-select" id="filetype">
          <option selected>Choose...</option>
          <option value="1">JSON</option>
          <option value="2">XML</option>
          <option value="3">PNG</option>
        </select>
      </div>

      `

        super(options, body);

        const fileNameInput = this.element.querySelector("#filename") as HTMLInputElement;
        const fileTypeInput = this.element.querySelector("#filetype") as HTMLSelectElement;
        const submit = this.element.querySelector("#submit") as HTMLElement;
        submit.innerHTML = 'Save';
        submit.addEventListener('click', () => {

            const scene = this.options.app.activeViewer.activeTab.sheet.scene;

            let filename = fileNameInput.value;
            if (fileNameInput.value.trim() === "") {

                filename = "Diagram";

            }

            const filetype = fileTypeInput.value;
            if (filetype === '1') {

                scene.parser.downloadJSON(filename);

            } else if (filetype === '2') {

                scene.parser.downloadXML(filename);

            } else if (filetype === '3') {

                scene.parser.downloadPNG(filename);

            } else {

                return;

            }

            this.bsModal.hide();

        })

    }

    clear() {

        (this.element.querySelector("#filename") as HTMLInputElement).value = "Diagram";
        (this.element.querySelector("#filetype") as HTMLSelectElement).selectedIndex = 0;

    }


})

export const manageStateMachineModal = new (class SaveFilesModal extends PopUpMenu {
    machineName: any;
    tableContent: HTMLTableSectionElement | null;
    varName: any;
    varType: any;
    varSubmit: any;
    varSize: any;
    edit: any;
    vm: any;

    constructor(options = {}) {

        options = Object.assign({
            title: "Manage State Machine"
        }, options)

        const body = `

    <div class="input-group mb-3">
      <span class="input-group-text">Name</span>
      <input id="machineName" type="text" class="form-control" placeholder="State Machine" aria-label="machineName" aria-describedby="machineName">
    </div>

    <table class="table">
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Name</th>
          <th scope="col">Type</th>
          <th scope="col">Size</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">1</th>
          <td>Mark</td>
          <td>Otto</td>
          <td>@mdo</td>
        </tr>
      </tbody>
    </table>

    <div class="input-group mb-3">
      <input id="varName" type="text" class="form-control" placeholder="Input/Output">
      <select id="varType" class="form-select">
        <option value="1" selected>Input</option>
        <option value="2">Output</option>
      </select>
      <input id="varSize" type="number" min="1" class="form-control" placeholder="Size">
      <button id="varSubmit" class="btn btn-outline-primary" type="button">+</button>
    </div>
      `

        super(options, body);

        this.machineName = this.element.querySelector('#machineName');
        this.tableContent = this.element.querySelector('tbody');

        this.varName = this.element.querySelector('#varName');
        this.varType = this.element.querySelector('#varType');
        this.varSize = this.element.querySelector('#varSize');
        this.varSubmit = this.element.querySelector('#varSubmit');

        this.varSubmit.addEventListener('click', () => {

            const name = this.varName.value.trim();
            const type = this.varType.value;
            const size = this.varSize.value;

            if (name.trim() === "" || parseInt(size) <= 0) return;

            if (this.edit) {

                this.varName.readOnly = false;
                this.varName.classList.remove('form-control-plaintext');
                this.edit.element.remove();

                if (this.edit.isInput) {

                    delete this.vm._inputs[name];

                } else {

                    delete this.vm._outputs[name];

                }

            }

            if (type === "1") {

                if (!this.edit && this.vm._inputs[String(name)]) return;

                this.vm._inputs[String(name)] = {

                    name,
                    string: `b(${parseInt(size)})`,
                    length: parseInt(size)

                }

            } else if (type === "2") {

                if (!this.edit && this.vm._outputs[String(name)]) return;

                this.vm._outputs[String(name)] = {

                    name,
                    string: `b(${parseInt(size)})`,
                    length: parseInt(size)

                }

            }

            this.varName.value = "";
            this.varType.value = "1";
            this.varSize.value = null;

            this.clear(this.vm, this.machineName.value.trim());

        })

        const submit = this.element.querySelector("#submit") as HTMLElement;
        submit.innerHTML = 'Save';
        submit.addEventListener('click', () => {

            const machine = this.options.machine;
            const name = this.machineName.value.trim();

            if (name !== "") {

                machine.name = name;

                const cache = machine.vm;
                machine.vm = new VirtualMachine();

                for (const output of Object.values(cache._outputs as { [key: string]: any })) {

                    // if (!this.vm._outputs[output.name]) {

                    //     delete output.link.link;

                    // }

                }

                for (const output of Object.values(this.vm._outputs as { [key: string]: any })) {

                    machine.vm._outputs[output.name] = {

                        ...cache._outputs[output.name],
                        ...output

                    }

                    const real = machine.vm._outputs[output.name];

                    // if (real.dirty && real.link) {

                    //     real.link.link = null;
                    //     real.link = null;
                    //     delete real.dirty;

                    // }

                }

                for (const input of Object.values(this.vm._inputs as { [key: string]: any })) {

                    machine.vm._inputs[input.name] = {

                        ...cache._inputs[input.name],
                        ...input

                    }

                }

                this.bsModal.hide();

            }

        })

    }

    clear(tempVM: VirtualMachine, tempName: string) {

        const machine = this.options.machine;
        this.vm = tempVM || JSON.parse(JSON.stringify(machine.vm));

        this.varName.value = "";
        this.varType.value = "1";
        this.varSize.value = null;

        this.machineName.value = tempName || machine.name;

        if (this.tableContent) {

            this.tableContent.innerHTML = '';

            for (const input of Object.values(this.vm._inputs as { [key: string]: any })) {

                const n = this.tableContent.childNodes.length + 1;

                const row = createElementFromHTML(`
            <table class="table">
              <tbody>
                <tr class="table-warning">
                  <th scope="row">${n}</th>
                  <td class="_name">${input.name}</td>
                  <td class="_type">Input</td>
                  <td class="_size">${input.length}</td>
                  <td><i class="fa-solid fa-pencil edit"></i></td>
                  <td><i class="fa-solid fa-trash delete"></i></td>
                </tr>
              </tbody>
            </table>
      `).children[0].children[0];

                row.querySelector('.edit')?.addEventListener('click', () => {

                    this.edit = { element: row, isInput: true };
                    this.varName.value = input.name;
                    this.varType.value = "1";
                    this.varSize.value = input.length;
                    this.varName.readOnly = true;
                    this.varName.classList.add('form-control-plaintext');

                })

                row.querySelector('.delete')?.addEventListener('click', () => {

                    row.remove();
                    delete this.vm._inputs[input.name];

                })

                this.tableContent.append(row);

            }

            for (const output of Object.values(this.vm._outputs as { [key: string]: any })) {

                const n = this.tableContent.childNodes.length + 1;

                const row = createElementFromHTML(`
            <table class="table">
              <tbody>
                <tr class="table-info">
                  <th scope="row">${n}</th>
                  <td>${output.name}</td>
                  <td>Output</td>
                  <td>${output.length}</td>
                  <td><i class="fa-solid fa-pencil edit"></i></td>
                  <td><i class="fa-solid fa-trash delete"></i></td>
                </tr>
              </tbody>
            </table>
      `).children[0].children[0];

                row.querySelector('.edit')?.addEventListener('click', () => {

                    this.edit = { element: row, isInput: false };
                    this.varName.value = output.name;
                    this.varType.value = "2";
                    this.varSize.value = output.length;
                    this.varName.readOnly = true;
                    this.varName.classList.add('form-control-plaintext');

                })

                row.querySelector('.delete')?.addEventListener('click', () => {

                    row.remove();
                    delete this.vm._outputs[output.name];

                })

                this.tableContent.append(row);

            }

        }

    }


})

export const manageStateMachineLinkModal = new (class SaveFilesModal extends PopUpMenu {
    machineName: any;
    varName: any;
    varType: any;
    varSubmit: any;
    varSize: any;
    edit: any;
    vm: any;
    fromIO: any;
    toIO: any;
    lButton: any;
    from: any;
    to: any;
    tableContent: any;

    constructor(options = {}) {

        options = Object.assign({
            title: "Link State Machine"
        }, options)

        const body = `

        <div class="row">
            <div class="col-sm-5 mb-3 mb-sm-0">
            <div class="card">
                <ul id="fromIO" class="list-group list-group-flush">
                </ul>
            </div>
            </div>
            <div class="col-sm-2 d-flex align-items-center justify-content-center">
                <i id="linkButton" class="fa-solid fa-link"></i>
            </div>
            <div class="col-sm-5">
            <div class="card">
                <ul id="toIO" class="list-group list-group-flush">
                </ul>
            </div>
            </div>
        </div>

        <table class="table">
            <thead>
            <tr>
                <th scope="col">#</th>
                <th scope="col">Name</th>
                <th scope="col">Size</th>
            </tr>
            </thead>
            <tbody>
            <tr>
                <th scope="row">1</th>
                <td>Mark</td>
                <td>Otto</td>
                <td>@mdo</td>
            </tr>
            </tbody>
        </table>

        `

        super(options, body);

        this.fromIO = this.element.querySelector('#fromIO');
        this.toIO = this.element.querySelector('#toIO');
        this.lButton = this.element.querySelector('#linkButton');
        this.tableContent = this.element.querySelector('tbody');

        this.from = null;
        this.to = null;

        this.lButton.addEventListener('click', () => {

            const uuids = [this.options.from.uuid, this.options.to.uuid];
            const key = uuids.sort().join('|');

            const existingLink = links.get(key);

            if (existingLink) {

                const pairKey = `${this.from.name} | ${this.to.name}`;
                existingLink.pairs.set(pairKey, { from: this.from, to: this.to, string: `${this.from.name} <-> ${this.to.name}` });

                links.set(key, existingLink);

                this.options = existingLink;

            } else {

                const link = new Link({ from: this.options.from, to: this.options.to });

                const pairKey = `${this.from.name} | ${this.to.name}`;
                link.pairs.set(pairKey, { from: this.from, to: this.to, string: `${this.from.name} <-> ${this.to.name}` });

                links.set(key, link);
                this.options.from.scene.objects.add(link);

                this.options = link;

            }

            this.clear();

        })

        const submit = this.element.querySelector("#submit") as HTMLElement;
        submit.remove();

    }

    clear() {

        this.fromIO.innerHTML = '';
        this.toIO.innerHTML = '';

        if (this.options.from && this.options.to) {

            const from = this.options.from;
            const to = this.options.to;

            for (const input of Object.values(from.vm._inputs)) {

                const element = createElementFromHTML(`<li class="list-group-item">${input.name + ' ' + input.string}</li>`);

                element.addEventListener('click', (e) => {

                    this.from = input;
                    this.to = null;

                    for (const item of this.fromIO.querySelectorAll(".list-group-item")) {

                        item.classList.remove('active');

                    }

                    e.target.classList.add('active');

                    this.toIO.innerHTML = '';

                    for (const output of Object.values(to.vm._outputs)) {

                        if (output.length !== input.length) continue;

                        const element = createElementFromHTML(`<li class="list-group-item">${output.name + ' ' + output.string}</li>`);

                        element.addEventListener('click', (e) => {

                            this.to = output;

                            for (const item of this.toIO.querySelectorAll(".list-group-item")) {

                                item.classList.remove('active');

                            }

                            e.target.classList.add('active');

                        })

                        this.toIO.append(element);

                    }

                })

                this.fromIO.append(element);

            }

            for (const output of Object.values(from.vm._outputs)) {

                const element = createElementFromHTML(`<li class="list-group-item">${output.name + ' ' + output.string}</li>`);

                element.addEventListener('click', (e) => {

                    this.from = output;
                    this.to = null;

                    for (const item of this.fromIO.querySelectorAll(".list-group-item")) {

                        item.classList.remove('active');

                    }

                    e.target.classList.add('active');

                    this.toIO.innerHTML = '';

                    for (const input of Object.values(to.vm._inputs)) {

                        if (output.length !== input.length) continue;

                        const element = createElementFromHTML(`<li class="list-group-item">${input.name + ' ' + input.string}</li>`);

                        element.addEventListener('click', (e) => {

                            this.to = input;

                            for (const item of this.toIO.querySelectorAll(".list-group-item")) {

                                item.classList.remove('active');

                            }

                            e.target.classList.add('active');

                        })

                        this.toIO.append(element);

                    }

                })

                this.fromIO.append(element);

            }

            if (this.tableContent) {

                this.tableContent.innerHTML = '';

                const uuids = [this.options.from.uuid, this.options.to.uuid];
                const linkKey = uuids.sort().join('|');

                const existingLink = links.get(linkKey);

                if (existingLink) {

                    for (const [key, pair] of existingLink.pairs) {

                        const n = this.tableContent.childNodes.length + 1;

                        const row = createElementFromHTML(`
                            <table class="table">
                              <tbody>
                                <tr class="table-warning">
                                  <th scope="row">${n}</th>
                                  <td class="_name">${pair.string}</td>
                                  <td class="_size">${pair.from.length}</td>
                                  <td><i class="fa-solid fa-trash delete"></i></td>
                                </tr>
                              </tbody>
                            </table>
                      `).children[0].children[0];

                        row.querySelector('.delete')?.addEventListener('click', () => {

                            existingLink.pairs.delete(key);
                            if (existingLink.pairs.size === 0) {

                                links.delete(linkKey);

                                this.options.from.scene.objects.remove(existingLink);

                            }
                            row.remove();

                        })

                        this.tableContent.append(row);

                    }

                }

            }

        }

    }


})