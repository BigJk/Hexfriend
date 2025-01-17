import { DEFAULT_ICONSET } from 'src/defaults/defaultIconset';
import { DEFAULT_TILESET } from 'src/defaults/defaultTileset';

import { coord_system } from 'src/types/cordinates';
import type { coordinates_data } from 'src/types/data';
import type { Iconset } from 'src/types/icon';
import { map_type } from 'src/types/settings';
import type { TerrainHexField } from 'src/types/terrain';
import type { Tile, Tileset } from 'src/types/tilesets';

import { coordsQToCube, genHexId } from 'src/helpers/hexHelpers';

interface saveData {
	saveVersion: number;
	title: string;

	coords: coordinates_data;

	TerrainField: TerrainHexField;
	tilesets: Tileset[];
	iconsets: Iconset[];
	paths: [];
	texts: [];
	icons: [];

	pathStyles: any[];
	textStyles: any[];
}

const CURRENT_SAVE_VERSION = 1;

let DEFAULT_SAVEDATA: saveData = {
	saveVersion: CURRENT_SAVE_VERSION,
	title: '',

	TerrainField: {
		hexWidth: 50,
		hexHeight: 45,
		orientation: 'flatTop',

		rows: 20,
		columns: 20,
		raised: 'even', // Which row / column should be higher / indented. This is implemented with an invisible hex. It's all quite messy.

		hexesOut: 10,

		mapType: map_type.SQUARE,
		blankHexColor: 0xf2f2f2,

		grid: { stroke: 0x333333, thickness: 2, shown: true },

		hexes: {},
	},

	coords: {
		shown: false,
		style: { fill: 0x000000, fontSize: 10, stroke: 0xffffff, strokeThickness: 2, fontFamily: 'Segoe UI' },
		system: coord_system.ROWCOL,
		seperator: '.',
		gap: 4,
	},

	tilesets: [DEFAULT_TILESET],

	iconsets: [DEFAULT_ICONSET],

	paths: [],
	icons: [],
	texts: [],

	pathStyles: [
		{ display: 'River', style: { color: 10813439, width: 6, cap: 'round', join: 'round' } },
		{ display: 'Path', style: { color: 16774327, width: 4, cap: 'round', join: 'bevel' } },
		{ display: 'Trail', style: { color: 16367733, width: 3, cap: 'round', join: 'round' } },
		{ display: 'Pass', style: { color: 12632256, width: 5, cap: 'round', join: 'miter' } },
		{ display: 'Border', style: { color: 16711680, width: 5, cap: 'round', join: 'round' } },
	],

	textStyles: [
		{
			display: 'Region',
			style: {
				fontFamily: 'Times New Roman',
				fill: '#ffffff',
				fontSize: 50,
				miterLimit: 2,
				strokeThickness: 10,
				stroke: '#000000',
				align: 'left',
				fontStyle: 'normal',
				fontWeight: 'normal',
			},
		},
		{
			display: 'Barony',
			style: {
				fontFamily: 'Times New Roman',
				fill: '#ffffff',
				fontSize: 40,
				miterLimit: 2,
				strokeThickness: 8,
				stroke: '#713800',
				align: 'left',
				fontStyle: 'normal',
				fontWeight: 'normal',
			},
		},
		{
			display: 'City',
			style: {
				fontFamily: 'Segoe UI',
				fill: '#ffffff',
				fontSize: 30,
				miterLimit: 2,
				strokeThickness: 5,
				stroke: '#800000',
				align: 'left',
				fontStyle: 'normal',
				fontWeight: 'normal',
			},
		},
		{
			display: 'Town',
			style: {
				fontFamily: 'Segoe UI',
				fill: '#ffffff',
				fontSize: 25,
				miterLimit: 2,
				strokeThickness: 5,
				stroke: '#000066',
				align: 'left',
				fontStyle: 'normal',
				fontWeight: 'normal',
			},
		},
		{
			display: 'Village',
			style: {
				fontFamily: 'Segoe UI',
				fill: '#000000',
				fontSize: 20,
				miterLimit: 2,
				strokeThickness: 0,
				stroke: '#ffffff',
				align: 'left',
				fontStyle: 'normal',
				fontWeight: 'normal',
			},
		},
		{
			display: 'River',
			style: {
				fontFamily: 'Segoe UI',
				fill: '#000000',
				fontSize: 17,
				miterLimit: 2,
				strokeThickness: 3,
				stroke: '#ffffff',
				align: 'left',
				fontStyle: 'italic',
				fontWeight: 'normal',
			},
		},
		{
			display: 'Dungeon',
			style: {
				fontFamily: 'Segoe UI',
				fill: '#ffffff',
				fontSize: 20,
				miterLimit: 2,
				strokeThickness: 6,
				stroke: '#aa0000',
				align: 'left',
				fontStyle: 'normal',
				fontWeight: 'bold',
			},
		},
	],
};

for (let col = 0; col < DEFAULT_SAVEDATA.TerrainField.columns; col++) {
	for (let row = 0; row < DEFAULT_SAVEDATA.TerrainField.rows; row++) {
		let cubeCoords = coordsQToCube('even', col, row);
		let q = cubeCoords.q;
		let r = cubeCoords.r;
		let s = cubeCoords.s;

		DEFAULT_SAVEDATA.TerrainField.hexes[genHexId(q, r, s)] = { q: q, r: r, s: s, tile: null };
	}
}

export default DEFAULT_SAVEDATA;
export type { saveData };
