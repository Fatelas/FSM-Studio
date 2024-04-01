/* eslint-disable @typescript-eslint/no-explicit-any */
import { Parser } from "./Parser";

export class History {
    private _history: string[];
    private _current: number;
    private _max: number;

    constructor() {

        this._history = ['{"objects":[]}'];
        this._current = 0;
        this._max = 0;

    }

    undo() {

        if (this._current > 0) {

            return Parser.fromJSON(this._history[--this._current]);

        } else {

            return Parser.fromJSON(this._history[0]);

        }

    }

    redo() {

        if (this._current < this._max) {

            return Parser.fromJSON(this._history[++this._current]);

        } else {

            return Parser.fromJSON(this._history[this._current]);

        }

    }

    add(item: any) {

        this._max = this._current + 1;
        this._current++;
        this._history[this._current] = item;

    }

}