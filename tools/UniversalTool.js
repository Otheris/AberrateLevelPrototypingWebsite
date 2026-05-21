import { Tool } from './Tool.js';
import { config, panCamera, setTool, activateAltOverride, deactivateAltOverride, onEntityHotkeyPressed } from '../editor.js';

/**
 * Universal tool for handling various editor actions
 */
export class UniversalTool extends Tool {
	getName() {
		return 'universal';
	}

	onEnter(state) {
		// universal tool doesn't need lifecycle methods
	}

	onExit(state) {
		// universal tool doesn't need lifecycle methods
	}

	onMouseDown(state, button) {
		if (button === 1) {
			state.input.isMiddleMouseDown = true;
		}
		if (button === 0) {
			state.input.isLeftMouseDown = true;
		}
	}

	onMouseMove(state) {
		if (state.input.isMiddleMouseDown) {
			panCamera(-state.mouse.deltaX, -state.mouse.deltaY);
		}
	}

	onMouseUp(state, button) {
		if (button === 1) {
			state.input.isMiddleMouseDown = false;
		}
		if (button === 0) {
			state.input.isLeftMouseDown = false;
		}
	}

	onKeyDown(state, key) {
		if (key.toLowerCase() === config.altModeKey) {
			state.input.isAltDown = true;
			// Handle Alt key specially for temporary camera override
			if (!state.isAltOverride && state.selectedTool !== 'camera' && state.editorMode === 'edit') {
				activateAltOverride();
			}
		}
		else if (key.toLowerCase() === 'shift') {
			state.input.isShiftDown = true;
		}
		else if (key.toLowerCase() === ';') {
			console.log('Current state:', state);
		}
		else if (key.toLowerCase() === 'control') {
			state.input.isCtrlDown = true;
		}
		if (state.editorMode === 'edit') {
			// handle tool hotkeys regardless of config enable
			for (const [toolName, hotkey] of Object.entries(config.hotkeys.tools)) {
				if (key.toLowerCase() === hotkey) {
					setTool(toolName);
					return; // stop checking other hotkeys after a match is found;
				}
			}
			// handle entity hotkeys, update selected entity type and switch to entity tool
			onEntityHotkeyPressed(key);
		}
	}

	onKeyUp(state, key) {
		if (key.toLowerCase() === config.altModeKey) {
			state.input.isAltDown = false;
			// Handle Alt key release to return to previous tool
			if (state.isAltOverride) {
				deactivateAltOverride();
			}
		}
		else if (key.toLowerCase() === 'shift') {
			state.input.isShiftDown = false;
		}
		else if (key.toLowerCase() === 'control') {
			state.input.isCtrlDown = false;
		}
	}
}3