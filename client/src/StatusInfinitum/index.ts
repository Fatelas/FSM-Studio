/* eslint-disable @typescript-eslint/no-explicit-any */
import { JSONstringifyOrder } from "../Utils";
import { State, StateMachine } from "../lib/viewer/Graphic";
import { Interpreter } from "./Interpreter";
import { Lexer } from "./Lexer";
import { Parser } from "./Parser";

export class VirtualMachine {
    variables: { [key: string]: object; };
    functions: { [key: string]: (...args: any[]) => any; };
    _outputs: { [key: string]: object; };
    _inputs: { [key: string]: object; };

    constructor() {

        this.variables = {};
        this.functions = {};

        this._outputs = {};
        this._inputs = {};

    }

}

export function run(code: string, vm: VirtualMachine) {

    // Run the lexer
    const tokens = Lexer(code);

    // Run the parser
    const statements = Parser(tokens);

    return Interpreter(statements, vm);

}

// eslint-disable-next-line no-unused-vars
export function runCondition(code: string, vm: VirtualMachine) {

    // Run the lexer
    const tokens = Lexer(code);

    // Run the parser
    const statements = Parser(tokens);

    for (const statement of statements) {

        if (statement.type === 'assignment') {

            throw new Error(`Invalid assignment in condition.`);

        }

    }

}

function extractVar(expression: any): any {

    const v = [];

    const type = expression?.value?.type || expression?.type;

    if (type === 'variable') {

        v.push(expression.value.name);

    } else {

        const left = expression?.value?.left || expression?.left;
        const right = expression?.value?.right || expression?.right;

        if (left) {

            v.push(...extractVar(left));

        }

        if (right) {

            v.push(...extractVar(right));

        }

    }

    return v;

}

export function checkOutputs(code: string, vm: VirtualMachine) {

    const inputs = Object.keys(vm._inputs);

    // Run the lexer
    const tokens = Lexer(code);

    // Run the parser
    const statements = Parser(tokens);

    const totalVars = [];

    for (const statement of statements) {

        if (statement.type === 'assignment') {

            const outName = statement.name;

            const vars = extractVar(statement.expression);

            vars.forEach((v: any) => {
                if (inputs.indexOf(v) > -1) {

                    throw new Error('Bad Ouput Logic: ouput depends on an input', { cause: { output: outName, input: v } });

                }
            });

            totalVars.push({ name: outName, variables: [...vars] });

            // if (vars.indexOf(outName) > -1) {
            //     throw new Error('Bad Ouput Logic: ouput depends on itself', { cause: { output: outName } });
            // }

        }

    }

    return totalVars;

}

function checkOutputValues(code: string, vm: VirtualMachine) {

    // Run the lexer
    const tokens = Lexer(code);

    // Run the parser
    const statements = Parser(tokens);

    for (const statement of statements) {

        if (statement?.type === 'assignment' && statement?.expression?.value?.value) {

            const val = statement.expression.value.value;
            const binary = Number(val).toString(2);

            vm._outputs[statement.name] = {

                value: val,
                string: `b<${binary.length}>`,
                length: binary.length

            }

        }


    }

}

function checkConditionSide(vm: VirtualMachine, side: any, otherSide: any) {

    if (!vm._outputs[side.value.name]) {

        let length = 1;
        let flag = false;

        try {

            const tempVM = JSON.parse(JSON.stringify(vm));
            const outputs = Object.entries(tempVM._outputs);

            for (const [key, value] of outputs) {

                tempVM.variables[key] = (value as any).value;

            }

            Interpreter([{
                type: "assignment",
                name: "_temp",
                expression: {
                    type: "unary",
                    withNot: false,
                    value: otherSide
                }
            }], tempVM);

            length = Number(tempVM.variables._temp).toString(2).length;
            flag = true;

        } catch (e) {

            console.log(e);

        }

        vm._inputs[side.value.name] = {

            string: `b<${flag ? length : '?'}>`,
            length: length

        }
    }

}

export function checkConditions(code: string, vm: VirtualMachine) {

    // Run the lexer
    const tokens = Lexer(code);

    // Run the parser
    const statements = Parser(tokens);

    for (const statement of statements) {

        if (statement.type === 'condition') {

            const left = statement.expression.left;
            const right = statement.expression.right;

            if (left.value && left.value.type === 'variable') {

                checkConditionSide(vm, left, right);

            }

            if (right.value && right.value.type === 'variable') {

                checkConditionSide(vm, right, left);

            }

        }

    }

}

export function validate(stateMachine: StateMachine) {

    const resets = [];
    const states = [];
    const transitions = [];
    const inputs = stateMachine.vm._inputs;
    const outputs = stateMachine.vm._outputs;

    for (const object of stateMachine.objects) {

        states.push(object);

        for (let i = 0; i < object.resets.length; i++) {

            resets.push(object.resets[i]);

        }

        for (let i = 0; i < object.transitions.length; i++) {

            const transition = object.transitions[i];
            const index = transitions.indexOf(transition);

            if (index === -1) {

                transitions.push(object.transitions[i]);

            }

        }

    }

    try {

        if (resets.length === 0) {

            throw new Error('Missing Reset Logic: need at least 1 reset.');

        }

        if (resets.length === 2) {

            if (resets[0].isSynchronous === resets[1].isSynchronous) {

                throw new Error(`Bad Reset Logic: both resets are ${resets[0].isSynchronous ? 'synchronous' : 'asynchronous'}.`);

            }

        }

        if (resets.length > 2) {

            throw new Error('Bad Reset Logic: more than 2 resets.');

        }

        const table: any[] = [];
        const conditions: { [key: string]: string[]; } = {};
        const stateStuck: { [key: string]: boolean; } = {};
        const stateNames: { [key: string]: State; } = {};
        const revOuputs = new Map();

        for (const state of states) {

            if (stateNames[state.name.trim()]) {

                throw new Error('Bad Logic: 2 state have the same name.', {
                    cause: {
                        states: [stateNames[state.name.trim()], state]
                    }
                });

            } else {

                stateNames[state.name.trim()] = state;

            }

            conditions[state.uuid] = [];
            stateStuck[state.uuid] = true;

            const values: { [key: string]: number[]; } = {};

            for (const [name, input] of Object.entries(inputs)) {

                const length = Math.pow(2, (input as any).length);

                const vals = [];

                for (let i = 0; i < length; i++) {

                    vals.push(i);

                }

                values[name] = vals;

            }

            const vValues = Object.values(values);

            const maxL: number = vValues.reduce((a: any, c: any) => a * c.length, 1) as number;

            const lines = [];

            let c = 0;

            for (const val of vValues) {

                const line = [];

                const rep = Math.pow(2, c);

                c += val.length.toString(2).length - 1;

                let j = 0;

                while (j < maxL) {

                    for (let i = 0; i < val.length; i++) {

                        for (let k = 0; k < rep; k++) {

                            line.push(i);
                            j++;

                        }

                    }
                }

                lines.push(line);

            }

            for (let i = 0; i < maxL; i++) {

                const vals: { [key: string]: number; } = {};

                const vs = Object.keys(values);

                for (let j = 0; j < vs.length; j++) {

                    const name = vs[j];

                    vals[name] = lines[j][i];

                }

                table.push({ state: state.uuid, ...vals });

            }

        }

        for (const state of states) {

            const vm = new VirtualMachine();

            checkOutputValues(state.outputs, vm);

            const outputString = JSONstringifyOrder(vm._outputs);

            const stateOutputs = Object.keys(vm._outputs);

            for (const stateOutput of stateOutputs) {

                if (outputs[stateOutput] === undefined) {

                    throw new Error('Missing Ouput Declaration: State defines output not defined in State Machine', {
                        cause: {
                            states: [state, stateOutput]
                        }
                    });

                } else if (outputs[stateOutput].length < vm._outputs[stateOutput].length) {

                    throw new Error('Ouput Size Mismatch: State defines output larger then State Machine output size', {
                        cause: {
                            states: [state, stateOutput]
                        }
                    });

                }

            }

            const revOuput = revOuputs.get(outputString);

            if (revOuput) {

                throw new Error('Conflicting State Assignment: 2 states have the same output.', {
                    cause: {
                        states: [state, revOuput]
                    }
                });

            } else {

                outputString !== "{}" && revOuputs.set(outputString, state);

            }

        }

        for (const transition of transitions) {

            for (let i = 0; i < table.length; i++) {

                const line = table[i];

                // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
                const { state, to, ...vars } = line;

                if (state === transition.from.uuid) {

                    const vm = new VirtualMachine();

                    vm.variables = vars;

                    const conditionResult = run(transition.condition, vm);

                    if (conditionResult && conditionResult !== 'else') {

                        if (conditions[state][i]) {

                            throw new Error('Indeterminate Transitions: 2 transitions have the same condition result.');

                        } else {

                            conditions[state][i] = conditionResult;

                        }

                        table[i] = { ...line, to: transition.to.uuid };

                        if (transition.output) {

                            const tvm = new VirtualMachine();
                            const svm = new VirtualMachine();

                            const vm = new VirtualMachine();
                            checkOutputValues(transition.output, vm);

                            const transitionOutputs = Object.keys(vm._outputs);

                            for (const transitionOutput of transitionOutputs) {

                                if (outputs[transitionOutput] === undefined) {

                                    throw new Error('Missing Ouput Declaration: Transition defines output not defined in State Machine', {
                                        cause: {
                                            states: [transition, transitionOutput]
                                        }
                                    });

                                } else if (outputs[transitionOutput].length < vm._outputs[transitionOutput].length) {

                                    throw new Error('Ouput Size Mismatch: Transition defines output larger then State Machine output size', {
                                        cause: {
                                            states: [state, transitionOutput]
                                        }
                                    });

                                }

                            }

                            run(transition.output, tvm);
                            run(transition.to.outputs, svm);

                            for (const key in tvm.variables) {

                                if (svm.variables[key as keyof object]) {

                                    throw new Error('Output Variable Conflict: transition has same var in output has detination state.');

                                }

                            }

                        }

                    }

                }

            }

        }

        for (const transition of transitions) {

            for (let i = 0; i < table.length; i++) {

                const line = table[i];

                // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
                const { state, to, ...vars } = line;

                if (state === transition.from.uuid) {

                    const vm = new VirtualMachine();

                    vm.variables = vars;

                    const conditionResult = run(transition.condition, vm);

                    if (conditionResult === 'else' && !conditions[state][i]) {

                        conditions[state][i] = "else";
                        table[i] = { ...line, to: transition.to.uuid };

                    }

                }

            }
        }

        console.table(table);

        const transitionHits: { [key: string]: boolean; } = {};

        for (const line of table) {

            const { state, to } = line;

            if (to) {

                transitionHits[state] = true;

            }

        }

        for (const line of table) {

            const { state, to, ...vars } = line;

            if (transitionHits[state] && !to) {
                throw new Error('Unused Combinations: missing transition for input.', {
                    cause: { state, vars }
                });
            }

            if (stateStuck[line.state]) {

                if (line.state !== line.to) {

                    stateStuck[line.state] = false;

                }

            }

        }

        for (const [state, stuck] of Object.entries(stateStuck)) {

            if (stuck) {
                throw new Error('Stuck at States and Outputs: state only ever transitions to itself.', {

                    cause: { state }

                });
            }

        }

        return { valid: true, issues: [] };

    } catch (e) {

        return { valid: false, issues: [e] };

    }

}