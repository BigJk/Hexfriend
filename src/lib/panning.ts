import * as PIXI from 'pixi.js';
import { get, writable } from 'svelte/store';

export let store = writable({
	panning: false,

	oldX: 0,
	oldY: 0,

	offsetX: 0,
	offsetY: 0,

	screenX: 0,
	screenY: 0,

	zoomScale: 1,
});

function worldX(state) {
	return (state.screenX / PIXI.settings.RESOLUTION - state.offsetX) / state.zoomScale;
}

function worldY(state) {
	return (state.screenY / PIXI.settings.RESOLUTION - state.offsetY) / state.zoomScale;
}

export function curWorldX() {
	return worldX(get(store));
}

export function curWorldY() {
	return worldY(get(store));
}

export const handlers = {
	startPan: function (e: PointerEvent) {
		store.update((pan) => {
			pan.panning = true;
			pan.oldX = e.clientX;
			pan.oldY = e.clientY;

			return pan;
		});
	},

	handle: function (e: PointerEvent) {
		store.update((pan) => {
			pan.screenX = e.clientX;
			pan.screenY = e.clientY;

			if (pan.panning) {
				pan.offsetX += (e.clientX - pan.oldX) / PIXI.settings.RESOLUTION;
				pan.offsetY += (e.clientY - pan.oldY) / PIXI.settings.RESOLUTION;

				pan.oldX = e.clientX;
				pan.oldY = e.clientY;
			}

			return pan;
		});
	},

	endPan: function () {
		store.update((pan) => {
			pan.panning = false;

			return pan;
		});
	},

	zoom: function (e: WheelEvent) {
		store.update((pan) => {
			let xBeforeZoom = worldX(pan);
			let yBeforeZoom = worldY(pan);

			pan.zoomScale += e.deltaY / 1000;
			pan.zoomScale = Math.min(Math.max(pan.zoomScale, 0.05), 10);

			let xAfterZoom = worldX(pan);
			let yAfterZoom = worldY(pan);

			let dx = (xAfterZoom - xBeforeZoom) * pan.zoomScale;
			let dy = (yAfterZoom - yBeforeZoom) * pan.zoomScale;

			pan.offsetX += dx / PIXI.settings.RESOLUTION;
			pan.offsetY += dy / PIXI.settings.RESOLUTION;

			return pan;
		});
	},
};
