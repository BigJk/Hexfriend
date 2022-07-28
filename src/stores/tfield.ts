import { writable } from 'svelte/store';

import type { TerrainHexField } from 'src/types/terrain';

let tfield: TerrainHexField;

export let store = writable(tfield);
