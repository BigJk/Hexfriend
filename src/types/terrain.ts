import type { map_type } from 'src/types/settings';
import type { Tile } from 'src/types/tilesets';

// Hexes are the data that get drawn as terrain
export interface TerrainHex {
	// If no tile, the hex is blank
	tile: Tile | null;

	q: number;
	r: number;
	s: number;
}

export interface TerrainHexField {
	hexWidth: number;
	hexHeight: number;

	grid: { stroke: number; thickness: number; shown: boolean };

	mapType: map_type;

	/* Radial Maps */
	hexesOut: number;

	/* All has to do with square maps */
	rows: number;
	columns: number;
	raised: 'odd' | 'even';

	orientation: 'flatTop' | 'pointyTop';
	blankHexColor: number;

	hexes: { [key: string]: TerrainHex };
}
