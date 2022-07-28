<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { tick } from 'svelte';
	import { Container, Pixi } from 'svelte-pixi';

	import Controls from 'src/lib/ControlTooltips.svelte';
	import IconsetCreator from 'src/lib/IconsetCreator.svelte';
	import MapSettings from 'src/lib/MapSettings.svelte';
	import SavedMaps from 'src/lib/SavedMaps.svelte';
	import TerrainField from 'src/lib/TerrainField.svelte';
	import TerrainGenerator from 'src/lib/TerrainGenerator.svelte';
	import TilesetCreator from 'src/lib/TilesetCreator.svelte';
	import ToolButtons from 'src/lib/ToolButtons.svelte';

	import { db } from 'src/lib/db';
	import { download } from 'src/lib/download2';
	import { collapseWaveGen } from 'src/lib/terrainGenerator';

	import type { saveData } from 'src/defaults/defaultSaveData';
	import DEFAULT_SAVEDATA from 'src/defaults/defaultSaveData';

	import * as Panning from 'src/stores/panning';
	import * as TField from 'src/stores/tfield';

	import { coord_system } from 'src/types/cordinates';
	import type { coordinates_data, icon_data, path_data, terrain_data, text_data } from 'src/types/data';
	import type { Iconset } from 'src/types/icon';
	import type { TerrainHex, TerrainHexField } from 'src/types/terrain';
	import type { Tileset } from 'src/types/tilesets';
	import { tools } from 'src/types/toolData';

	import { coordsCubeToWorld, getHexPath } from 'src/helpers/hexHelpers';

	import CoordsLayer from 'src/layers/CoordsLayer.svelte';
	import IconLayer from 'src/layers/IconLayer.svelte';
	import PathLayer from 'src/layers/PathLayer.svelte';
	import TextLayer from 'src/layers/TextLayer.svelte';

	import IconPanel from 'src/panels/IconPanel.svelte';
	import PathPanel from 'src/panels/PathPanel.svelte';
	import TerrainPanel from 'src/panels/TerrainPanel.svelte';
	import TextPanel from 'src/panels/TextPanel.svelte';

	/* STATE */

	let loadedSave: saveData = DEFAULT_SAVEDATA;
	let loadedId: number | null = null;

	let appState: 'normal' | 'tilesetCreator' | 'iconsetCreator' = 'normal';

	let showSettings = false;
	let showTerrainGenerator = false;

	let offsetContainer = new PIXI.Container();

	let tfield: TerrainHexField;
	TField.store.subscribe((newTField) => {
		tfield = newTField;
	});

	/* STUFF TO BIND TO */
	let comp_terrainField;
	let comp_iconLayer;
	let comp_pathLayer;
	let comp_textLayer;
	let comp_coordsLayer;

	//offsetContainer.addChild(terrainGraphics);

	/* APPLICATION */
	PIXI.settings.RESOLUTION = 4;

	let app = new PIXI.Application({
		backgroundAlpha: 0,
		width: window.innerWidth,
		height: window.innerHeight,
		resizeTo: window,
		resolution: PIXI.settings.RESOLUTION,
		antialias: false,
	});

	let showSavedMaps = false;

	let loading = true;

	let loadedTilesets: Tileset[];
	let loadedIconsets;

	let controls = {
		mouseDown: [false, false, false, false, false],
	};

	let selectedTool: tools = tools.TERRAIN;

	/* DATA */
	/* Data is bound to both layer and panel of a particluar tool. It contains all the shared state they need, and is bound to both */

	let data_terrain: terrain_data = {
		//bgColor: null,
		//symbol: null,

		tile: null,

		usingEyedropper: false,
		usingPaintbucket: false,
		usingEraser: false,
	};

	let data_icon: icon_data = {
		color: null,
		texId: null,
		pHex: 80,
		snapToHex: true,
		usingEraser: false,
	};

	let data_path: path_data = {
		style: { color: 0, width: 3, cap: PIXI.LINE_CAP.ROUND, join: PIXI.LINE_JOIN.ROUND },
		selectedPath: null,
		snap: false,
	};

	let data_text: text_data = {
		style: {
			fontFamily: 'Segoe UI',
			fill: '#000000',
			fontSize: 25,
			miterLimit: 2,
			strokeThickness: 0,
			stroke: '#f2f2f2',
			align: 'left',
			fontStyle: 'normal',
			fontWeight: 'normal',
		},
		selectedText: null,
		editorRef: null,
		usingTextTool: false,
	};
	$: data_text.usingTextTool = selectedTool == tools.TEXT;

	let data_coordinates: coordinates_data = {
		shown: true,
		style: { fill: 0x000000, fontSize: 10 },
		system: coord_system.ROWCOL,
		seperator: '.',
		gap: 4,
	};

	const L: PIXI.Loader = new PIXI.Loader();

	// Never cleared, to stop duplicate textures being added
	// Theoretically a memory leak... but bounded by how many unique tiles can be loaded. Shouldn't be a problem?
	let symbolTextureLookupTable = {
		// tile id: id of tile who's texture we use
	};

	let iconTextureLookupTable = {
		// icon texId: id of tile who's texture we use
	};

	function exportMap(exportType) {
		console.log(exportType);
		switch (exportType) {
			case 'image/png':
				download(
					app.renderer.plugins.extract.base64(offsetContainer),
					`${loadedSave.title ? loadedSave.title : 'Untitled Hexfriend'}`,
					exportType
				);
				break;

			case 'application/json':
				download(JSON.stringify(loadedSave), `${loadedSave.title ? loadedSave.title : 'Untitled Hexfriend'}.hexfriend`, exportType);
				break;
		}
	}

	function redrawEntireMap() {
		// Refreshes all hexes and coordinates
		comp_terrainField.renderAllHexes();
		//comp_coordsLayer.generateCoords(loadedSave.coords.system)
		//comp_coordsLayer.updateCoordPositions()
	}

	/* TOOL METHODS */

	/* ALL PURPOSE POINTER METHODS */
	function pointerdown(e: PointerEvent) {
		controls.mouseDown[e.button] = true;

		if (controls.mouseDown[2]) Panning.handlers.startPan(e);

		switch (selectedTool) {
			case tools.TERRAIN:
				if (controls.mouseDown[0]) comp_terrainField.pointerdown();
				break;

			case 'icon':
				if (controls.mouseDown[0]) comp_iconLayer.pointerdown();
				break;

			case 'path':
				if (controls.mouseDown[0]) comp_pathLayer.pointerdown();
				break;

			case 'text':
				if (controls.mouseDown[0]) comp_textLayer.pointerdown();
				break;

			case 'eraser':
				if (controls.mouseDown[0]) comp_terrainField.erase();
				/* Icons are handled in the IconLayer */
				break;
		}
	}

	function pointerup(e: PointerEvent) {
		controls.mouseDown[e.button] = false;

		if (!controls.mouseDown[2]) Panning.handlers.endPan();

		switch (selectedTool) {
			case 'text':
				comp_textLayer.pointerup();
				break;
		}
	}

	function pointermove(e: PointerEvent) {
		Panning.handlers.handle(e);

		switch (selectedTool) {
			case tools.TERRAIN:
				if (controls.mouseDown[0]) comp_terrainField.pointerdown();
				break;

			case tools.TEXT:
				comp_textLayer.pointermove();
				break;

			case tools.ERASER:
				if (controls.mouseDown[0]) comp_terrainField.erase();
				/* Icons are handled differently in the icon handler */
				break;
		}
	}

	async function save() {
		if (loadedSave.title == '') {
			let t = prompt('Map Title:');
			if (t != null) {
				loadedSave.title = t;
			} else {
				alert('Cancelled save');
				return;
			}
		}

		console.log(loadedSave);

		let c = JSON.stringify(loadedSave);
		let p = app.renderer.plugins.extract.base64(offsetContainer);

		if (loadedId) {
			const id = await db.mapSaves.update(loadedId, {
				mapTitle: loadedSave.title,
				previewBase64: p,
			});

			await db.mapStrings.update(loadedId, {
				mapString: c,
			});

			console.log(`Updated saved map with id ${loadedId}`);
		} else {
			const id = await db.mapSaves.add({
				mapTitle: loadedSave.title,
				previewBase64: p,
			});

			await db.mapStrings.add({
				mapString: c,
			});

			console.log(`Added map with id ${id}`);
			loadedId = Number(id);
		}

		alert('Saved');
	}

	function load(data: saveData, id: number | null) {
		// Clean up
		console.log(`Loaded ${id}`);
		loading = true;

		loadSave(data, id);
		//await loadSave(data, id)

		data_path.selectedPath = null;
		data_text.selectedText = null;

		//await tick()

		// await tick() // The terrain field needs time to hook onto
		//comp_terrainField.renderAllHexes()
	}

	function createNewMap() {
		/* TODO: Save Data Checking */

		load(JSON.parse(JSON.stringify(DEFAULT_SAVEDATA)), null);

		showSavedMaps = false;
	}

	function loadSave(data: saveData, id: number | null) {
		loadedTilesets = data.tilesets;
		loadedIconsets = data.iconsets;

		TField.store.set(data.TerrainField);

		data_coordinates = data.coords;

		// Load Textures
		loadedTilesets.forEach((tileset) => {
			loadTilesetTextures(tileset, false);
		});

		// Load Icons
		loadedIconsets.forEach((iconset: Iconset) => {
			loadIconsetTextures(iconset, false);
		});

		//L.onComplete.add( );

		L.load(async () => {
			loadedSave = data;
			loadedId = id;

			let firstTile = loadedTilesets[0].tiles[0];
			data_terrain.tile = { ...firstTile, symbol: firstTile.symbol ? { ...firstTile.symbol } : null };
			//bgColor = firstTile.bgColor
			//data_terrain.symbol = firstTile.symbol ? {...firstTile.symbol} : null

			let firstIcon = loadedIconsets[0].icons[0];
			data_icon.color = firstIcon.color;
			data_icon.texId = firstIcon.texId;

			// Center the map
			let tf = loadedSave.TerrainField;

			Panning.store.update((pan) => {
				pan.zoomScale = 1 / PIXI.settings.RESOLUTION;
				if (tf.orientation == 'flatTop') {
					let mapWidth = tf.columns * tf.hexWidth * 0.75 + tf.hexWidth * 0.25;
					let mapHeight = (tf.rows - 1) * tf.hexHeight - tf.hexHeight * 0.5;

					pan.offsetX = window.innerWidth / 2 - (mapWidth / 2) * pan.zoomScale;
					pan.offsetY = window.innerHeight / 2 - (mapHeight / 2) * pan.zoomScale;
				} else {
					let mapHeight = tf.rows * tf.hexHeight * 0.75 + tf.hexHeight * 0.25;
					let mapWidth = (tf.columns - 1) * tf.hexWidth - tf.hexWidth * 0.5;

					pan.offsetX = -(window.innerWidth / 2 - (mapWidth / 2) * pan.zoomScale);
					pan.offsetY = -(window.innerHeight / 2 - (mapHeight / 2) * pan.zoomScale);
				}

				pan.offsetX /= PIXI.settings.RESOLUTION;
				pan.offsetY /= PIXI.settings.RESOLUTION;

				return pan;
			});

			loading = false;
			await tick();
			comp_terrainField.clearTerrainSprites();
			comp_terrainField.renderAllHexes();

			//comp_coordsLayer.eraseAllCoordinates();
			comp_coordsLayer.generateAllCoords();
		});

		/* Set up tools - would be nice to remember tool settings but this works regardless of loaded tileset */

		//loadedSave = data
		//loadedId = id
	}

	function loadTilesetTextures(tileset: Tileset, loadImmediately: boolean = true) {
		tileset.tiles.forEach(async (tile) => {
			//console.log(tile.symbol.texId)

			if (tile.symbol) {
				let entry = Object.entries(L.resources).find(([id, r]) => r.url == tile.symbol.base64);

				if (entry) {
					// Texture already exists! Add this tile's ID to the lookup table
					symbolTextureLookupTable[tile.id] = entry[0];
				} else {
					L.add(tile.id, tile.symbol.base64);
				}
			}
		});

		if (!loadImmediately) return;

		L.load();
	}

	function loadIconsetTextures(iconset: Iconset, loadImmediately: boolean = true) {
		iconset.icons.forEach(async (icon) => {
			//console.log(tile.symbol.texId)

			let entry = Object.entries(L.resources).find(([id, r]) => r.url == icon.base64);

			if (entry) {
				// Texture already exists! Add this tile's ID to the lookup table
				iconTextureLookupTable[icon.texId] = entry[0];
			} else {
				L.add(icon.texId, icon.base64);
			}
		});

		if (!loadImmediately) return;

		L.load(() => {
			console.log('Gaming.');
		});
	}

	loadSave(JSON.parse(JSON.stringify(DEFAULT_SAVEDATA)), null); // Same as creating a new map

	let pan = {};
	Panning.store.subscribe((newPan) => {
		pan = newPan;
	});

	/* HOT ZONE */
</script>

{#if appState == 'normal' && !loading}
	<main
		on:contextmenu|preventDefault={(e) => {}}
		on:wheel={Panning.handlers.zoom}
		on:pointerdown={pointerdown}
		on:pointermove={pointermove}
		on:pointerup={pointerup}
	>
		<Pixi {app}>
			<Container instance={offsetContainer} x={pan.offsetX} y={pan.offsetY} scale={{ x: pan.zoomScale, y: pan.zoomScale }}>
				<TerrainField bind:this={comp_terrainField} bind:data_terrain {controls} {L} {comp_coordsLayer} {symbolTextureLookupTable} />

				<PathLayer bind:this={comp_pathLayer} bind:paths={loadedSave.paths} bind:data_path {pan} {controls} {selectedTool} />

				<IconLayer
					bind:this={comp_iconLayer}
					bind:icons={loadedSave.icons}
					bind:data_icon
					{L}
					{pan}
					{selectedTool}
					{controls}
					{iconTextureLookupTable}
				/>

				<!--
          			Needs Optimization badly
        		-->
				<CoordsLayer bind:this={comp_coordsLayer} bind:data_coordinates />

				<TextLayer bind:this={comp_textLayer} bind:texts={loadedSave.texts} bind:data_text {pan} />
			</Container>
		</Pixi>
	</main>

	<!-- Terrain Buttons -->
	{#if showTerrainGenerator}
		<TerrainGenerator {loadedTilesets} {comp_terrainField} bind:showTerrainGenerator />
	{:else if selectedTool == 'terrain'}
		<TerrainPanel {loadedTilesets} {app} {L} bind:data_terrain {symbolTextureLookupTable} />
	{:else if selectedTool == 'icon'}
		<IconPanel {L} {app} {loadedIconsets} bind:data_icon {iconTextureLookupTable} />
	{:else if selectedTool == 'path'}
		<PathPanel bind:data_path {comp_pathLayer} bind:pathStyles={loadedSave.pathStyles} />
	{:else if selectedTool == 'text'}
		<TextPanel bind:data_text {comp_textLayer} bind:textStyles={loadedSave.textStyles} />
	{/if}

	<!--
      -->

	<div id="tool-buttons">
		<ToolButtons bind:selectedTool bind:hexOrientation={tfield.orientation} />

		<!--

    -->
	</div>

	<div id="setting-buttons">
		<div id="save-buttons">
			<button on:click={save} title={'Save'}> <img src="assets/img/tools/save.png" alt="Save" /> </button>
		</div>
		<button
			on:click={() => {
				showSavedMaps = true;
			}}
			title={'Maps'}><img src="assets/img/tools/maps.png" alt="Maps" /></button
		>
		<button
			on:click={() => {
				showSettings = true;
			}}
			title={'Map Settings'}><img src="assets/img/tools/settings.png" alt="Map Settings" /></button
		>
	</div>

	{#if showSavedMaps}
		<SavedMaps bind:showSavedMaps {createNewMap} {load} />
	{/if}

	<MapSettings
		{loadedSave}
		bind:showSettings
		bind:appState
		bind:showTerrainGenerator
		{comp_terrainField}
		{comp_coordsLayer}
		{comp_iconLayer}
		{comp_pathLayer}
		{comp_textLayer}
		bind:data_coordinates
		renderAllHexes={() => {
			comp_terrainField.renderAllHexes();
		}}
		renderGrid={() => {
			comp_terrainField.renderGrid();
		}}
		redrawEntireMap={() => {
			redrawEntireMap();
		}}
		{exportMap}
		{load}
		bind:loadedTilesets
		bind:loadedIconsets
		loadTilesetTextures={(tileset) => {
			loadTilesetTextures(tileset);
		}}
		loadIconsetTextures={(iconset) => {
			loadIconsetTextures(iconset);
		}}
	/>

	<Controls {selectedTool} {data_terrain} {data_icon} {data_path} {data_text} />
{:else if appState == 'tilesetCreator'}
	<TilesetCreator bind:appState />
{:else if appState == 'iconsetCreator'}
	<IconsetCreator bind:appState />
{/if}

<style>
	:root {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;

		background-color: #333333;
		color: white;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	:global(.green-button) {
		border-color: #648d2e;
		background-color: #8cc63f;
		color: white;
	}

	:global(.green-button:hover) {
		border: none;
		background-color: #648d2e;
	}

	:global(h2) {
		font-family: 'Segoe UI';
		font-weight: normal;
		border-bottom: solid 2px #555555;
	}

	:global(html) {
		height: 100%;
		width: 100%;
	}

	:global(body) {
		margin: 0;
		height: 100%;
		width: 100%;
	}

	:global(#app) {
		height: 100%;
		width: 100%;
	}

	main {
		text-align: center;
		padding: 1em;
		margin: 0 auto;
		background-color: black;
		height: 100%;
		width: 100%;
		box-sizing: border-box;
		padding: 0;
	}

	/* PANELS */
	:global(.panel) {
		background-color: #333333;
		border-radius: 4px;
		overflow: hidden;
		width: 300px;
		box-sizing: border-box;
		position: fixed;
		top: 10px;
		right: 10px;
	}

	/* GLOBAL BUTTON STYLING */
	:global(button) {
		border: solid 1px #777777;
		border-radius: 3px;
		background-color: #333333;
		color: white;
		padding: 5px;
		transition-duration: 0.2s;
	}

	:global(button:hover) {
		background-color: #555555;
	}

	:global(button:active) {
		background-color: #444444;
	}

	/* GLOBAL INPUT STYLE */
	:global(input) {
		background-color: #777777;
		border: 0;
		border-bottom: solid 2px #222222;
		transition-duration: 0.2s;
		transition-property: border-color;
		color: #f2f2f2;
	}

	:global(input[type='text']) {
		padding: 5px;
	}

	:global(input[type='number']) {
		padding: 5px;
	}

	:global(input:focus) {
		border-color: #8cc63f;
		transition-duration: 0.2s;
		transition-property: border-color;
		outline: none;
	}

	:global(textarea) {
		outline: none;
		color: #f2f2f2;
		background-color: #333333;
		border-radius: 3px;
	}

	:global(textarea:focus) {
		outline-style: solid;
		outline-width: 1px;
		outline-color: #8cc63f;
		border-color: #8cc63f;
	}

	:global(select) {
		background-color: #777777;
		color: #f2f2f2;
		padding: 5px;
		border-radius: 3px;
	}

	:global(button:disabled) {
		border: solid 1px #222222;
		background-color: #222222;
		color: #777777;
	}

	:global(button:disabled:hover) {
		border: solid 1px #222222;
		background-color: #222222;
	}

	:global(.selected) {
		outline-style: solid;
		outline-width: 1px;
		outline-color: #8cc63f;
		border-color: #8cc63f;
	}

	/* GLOBAL SCROLL BAR */

	/* width */
	:global(::-webkit-scrollbar) {
		width: 8px;
	}

	/* Track */
	:global(::-webkit-scrollbar-track) {
		display: none;
		opacity: 0;
	}

	/* Handle */
	:global(::-webkit-scrollbar-thumb) {
		background: #f2f2f2;
		opacity: 0;
		border-radius: 4px;
		width: 8px;
	}

	/* Handle on hover */
	:global(::-webkit-scrollbar-thumb:hover) {
		opacity: 1;
	}

	/* GLOBAL Checkbox */

	/* Tools */

	#tool-buttons {
		position: fixed;
		top: 10px;
		left: 10px;
	}

	/* SETTING BUTTONS */
	#setting-buttons {
		position: fixed;
		bottom: 10px;
		left: 10px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	#setting-buttons button {
		width: 50px;
		height: 50px;
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>
