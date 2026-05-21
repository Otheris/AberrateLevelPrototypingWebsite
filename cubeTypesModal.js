import { state } from './editor.js';
import { history } from './history.js';

export function setupCubeTypesModal() {
    const btn = document.getElementById('cubeTypesBtn');
    const modal = document.getElementById('cubeTypesModal');
    const closeBtn = document.getElementById('closeCubeTypesBtn');
    const addBtn = document.getElementById('addCubeTypeBtn');
    const list = document.getElementById('cubeTypesList');

    if (!btn || !modal) return;

    btn.addEventListener('click', () => {
        renderList();
        modal.classList.remove('hidden');
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        // Force refresh entities that might depend on this (Box visually updating)
        window.dispatchEvent(new Event('cubeTypesChanged'));
    });

    addBtn.addEventListener('click', () => {
        state.cubeTypes.push({ name: 'New Type', weight: 1, color: '#ffffff' });
        history.saveSnapshot(state);
        renderList();
    });

    function renderList() {
        list.innerHTML = '';
        state.cubeTypes.forEach((type, index) => {
            const row = document.createElement('div');
            row.className = 'cube-type-row';

            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = type.name;
            nameInput.placeholder = 'Name';
            nameInput.addEventListener('change', (e) => {
                type.name = e.target.value;
                history.saveSnapshot(state);
            });

            const weightInput = document.createElement('input');
            weightInput.type = 'number';
            weightInput.value = type.weight;
            weightInput.placeholder = 'Weight';
            weightInput.min = 1;
            weightInput.addEventListener('change', (e) => {
                type.weight = parseInt(e.target.value) || 1;
                history.saveSnapshot(state);
            });

            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = type.color;
            colorInput.addEventListener('change', (e) => {
                type.color = e.target.value;
                history.saveSnapshot(state);
            });

            const removeBtn = document.createElement('button');
            removeBtn.innerText = 'X';
            removeBtn.addEventListener('click', () => {
                state.cubeTypes.splice(index, 1);
                history.saveSnapshot(state);
                renderList();
            });

            row.appendChild(nameInput);
            row.appendChild(weightInput);
            row.appendChild(colorInput);
            row.appendChild(removeBtn);

            list.appendChild(row);
        });
    }
}
