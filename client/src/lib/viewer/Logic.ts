/* eslint-disable @typescript-eslint/no-explicit-any */
import { Reset, StateMachine, Transition } from "./Graphic";

export let isAddingTransition: Transition;
export let addingTransitionOutputs = null;
export let addingTransitionConditions = null;
export let startState = null;

export let selectedState = null;
export let isDragging = false;
export let dragOffset = null;

export let isAddingReset = false;
export let addingResetSynchronous = false;

export let selectedReset: Reset;
export let selectedStateMachine: StateMachine;
export let dragStart = null;

export let selectedTransition = null;

export function setStartState(value: any) {

    startState = value;

}

export function setIsAddingTransition(value: any) {

    isAddingTransition = value;

}

export function addTransition(conditions: any, outputs: any) {

    addingTransitionConditions = conditions;
    addingTransitionOutputs = outputs;

}

export function setIsDragging(value: any) {

    isDragging = value;

}

export function setSelectedState(value: any) {

    selectedState = value;

}

export function setDragOffset(value: any) {

    dragOffset = value;

}

export function setIsAddingReset(value: any, synchronous: any) {

    addingResetSynchronous = synchronous;
    isAddingReset = value;

}

export function setSelectedReset(value: any) {

    selectedReset = value;

}

export function setSelectedStateMachine(value: any) {

    selectedStateMachine = value;

}

export function setDragStart(value: any) {

    dragStart = value;

}

export function setSelectedTransition(value: any) {

    selectedTransition = value;

}

export let connectingStateMachine = null;

export function setConnectingStateMachine(value: any) {

    connectingStateMachine = value;

}

export const links = new Map();
