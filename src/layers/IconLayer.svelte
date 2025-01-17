<script lang="ts">
	import type * as PIXI from 'pixi.js';
	import { Sprite } from 'svelte-pixi';

	import * as Panning from 'src/stores/panning';
	import * as TField from 'src/stores/tfield';

	import type { icon_data } from 'src/types/data';
	import type { TerrainHexField } from 'src/types/terrain';
	import type { tools } from 'src/types/toolData';

	import { coordsCubeToWorld, coordsWorldToCube } from 'src/helpers/hexHelpers';

	export let icons = [];

	export let L: PIXI.Loader;
	export let selectedTool: tools;
	export let controls;

	export let data_icon: icon_data;
	export let iconTextureLookupTable;

	let tfield: TerrainHexField;
	TField.store.subscribe((newTField) => {
		tfield = newTField;
	});

	let pan = {};
	Panning.store.subscribe((newPan) => {
		pan = newPan;
	});

	let iconId: number = 0;
	icons.forEach((i) => (iconId = Math.max(iconId, i.id)));
	iconId++;

	$: {
		// Ideally, this would only trigger on a load. It can trigger on any update for now though...
		icons.forEach((i) => (iconId = Math.max(iconId, i.id)));
		iconId++;
	}

	function getIconScale() {
		let scale: number;
		if (tfield.hexWidth < tfield.hexHeight) {
			scale = (tfield.hexWidth * (data_icon.pHex / 100)) / L.resources[getIconTextureId(data_icon.texId)].texture.width;
		} else {
			scale = (tfield.hexHeight * (data_icon.pHex / 100)) / L.resources[getIconTextureId(data_icon.texId)].texture.height;
		}

		return scale;
	}

	function getIconTextureId(id: string): string {
		if (Object.keys(iconTextureLookupTable).find((k) => k == id)) {
			return iconTextureLookupTable[id];
		}

		return id;
	}

	export function newIcon() {
		let iconX = Panning.curWorldX();
		let iconY = Panning.curWorldY();

		if (data_icon.snapToHex) {
			let clickedHexCoords = coordsWorldToCube(iconX, iconY, tfield.orientation, tfield.hexWidth, tfield.hexHeight, tfield.raised);
			let iconCoords = coordsCubeToWorld(
				clickedHexCoords.q,
				clickedHexCoords.r,
				clickedHexCoords.s,
				tfield.orientation,
				tfield.hexWidth,
				tfield.hexHeight,
				tfield.raised
			);
			iconX = iconCoords.x;
			iconY = iconCoords.y;
		}

		icons.push({ x: iconX, y: iconY, color: data_icon.color, scale: getIconScale(), id: iconId, texId: data_icon.texId });
		iconId++;
		icons = icons;
	}

	function deleteIcon(icon) {
		let iconIndex = icons.indexOf(icon);
		icons.splice(iconIndex, 1);
		icons = icons;
	}

	export function pointerdown() {
		if (data_icon.usingEraser) {
			return;
		}

		newIcon();
	}

	export function moveAllIcons(xMod: number, yMod: number) {
		icons.forEach((icon) => {
			icon.x += xMod;
			icon.y += yMod;
		});

		icons = icons;
	}
</script>

{#each icons as icon (icon.id)}
	<Sprite
		texture={L.resources[getIconTextureId(icon.texId)].texture}
		x={icon.x}
		y={icon.y}
		tint={icon.color}
		anchor={{ x: 0.5, y: 0.5 }}
		scale={{ x: icon.scale, y: icon.scale }}
		interactive={selectedTool == 'eraser' || (selectedTool == 'icon' && data_icon.usingEraser)}
		on:pointerdown={(e) => {
			if (e.detail.data.button == 0) deleteIcon(icon);
		}}
		on:pointerover={(e) => {
			if (controls.mouseDown[0]) deleteIcon(icon);
		}}
	/>
{/each}
