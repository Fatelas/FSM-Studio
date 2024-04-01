/* eslint-disable @typescript-eslint/no-explicit-any */
import { createElementFromHTML } from "../../Utils";
import { App } from "./App";

export class TopBar {
    private element: HTMLElement;

    itemsElement: HTMLElement | null;
    app: App | null;

    constructor() {

        this.element = createElementFromHTML(
            `
            <nav class="navbar navbar-expand bg-body-tertiary">
                <div class="container-fluid">
                <a class="navbar-brand" href="#" style="margin-left: 1rem;">
                    <i class="fa-solid fa-diagram-project"></i>
                </a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent"
                    aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarSupportedContent">
                    <ul class="navbar-nav me-auto mb-0"></ul>
                    </div>
                </div>
            </nav>
        `
        );
        this.itemsElement = this.element.querySelector('.navbar-nav');

        this.app = null;

    }

    bind(app: App, container: HTMLElement) {

        this.app = app;

        if (container) {

            container.append(this.element);

        } else {

            this.app.element.append(this.element);

        }

        this.app.resize();

    }

    unbind() {

        if (this.app) {

            this.app = null;
            this.element.remove();

        }

    }

}

export class TopBarItem {
    private element: HTMLElement;
    private labelElement: HTMLElement | null;
    private itemsElement: HTMLElement | null;

    name: string;
    items: TopBarDropdownItem[];

    topBar: TopBar | null;

    constructor(
        { name = "", items = [] }:
            { name?: string, items?: TopBarDropdownItem[] } =
            {}) {

        this.element = createElementFromHTML(
            `
            <li class="nav-item dropdown">
                <a class="nav-link" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                    File
                </a>
                <ul class="dropdown-menu">
                </ul>
            </li>
        `
        );
        this.labelElement = this.element.querySelector('.nav-link');
        this.itemsElement = this.element.querySelector('.dropdown-menu');

        this.labelElement && (this.labelElement.innerHTML = name);

        this.name = name;
        this.items = items;

        this.topBar = null;

        for (let i = 0; i < this.items.length; i++) {

            this.itemsElement &&
                this.itemsElement.append(items[i].element);

        }

    }

    bind(topBar: TopBar) {

        this.topBar = topBar;
        this.topBar.itemsElement && this.topBar.itemsElement.append(this.element);

    }

    unbind() {

        if (this.topBar) {

            this.topBar = null;
            this.element.remove();

        }

    }

}

export class TopBarDropdownItem {
    element: HTMLElement;
    label?: HTMLElement | null;
    callback: (this: HTMLElement, e: MouseEvent) => any;
    disabled: boolean;

    constructor({ name = "", callback = () => { }, disabled = false }:
        { name?: string, callback?: (this: HTMLElement, e: MouseEvent) => any, disabled?: boolean } =
        {}) {

        this.element = createElementFromHTML(
            `
            <li><a class="dropdown-item" href="#">New sheet</a></li>
        `
        )
        this.label = this.element.querySelector('.dropdown-item');
        this.label && (this.label.innerHTML = name);
        this.callback = callback;
        this.disabled = disabled;

        this.disabled && this.label &&
            this.label.classList.add('disabled');


        this.element.addEventListener('click', this.callback);

    }

}

export class TopBarDropdownSeperatorItem extends TopBarDropdownItem {

    constructor() {

        super({});

        this.element.remove();
        delete this.label;
        this.element = createElementFromHTML(
            `
            <li><hr class="dropdown-divider"></li>
        `
        )

    }

}