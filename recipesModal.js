import { state } from './editor.js';
import { history } from './history.js';

export function setupRecipesModal() {
    const btn = document.getElementById('recipesBtn');
    const modal = document.getElementById('recipesModal');
    const closeBtn = document.getElementById('closeRecipesBtn');
    const addBtn = document.getElementById('addRecipeBtn');
    const list = document.getElementById('recipesList');

    if (!btn || !modal) return;

    btn.addEventListener('click', () => {
        renderList();
        modal.classList.remove('hidden');
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    addBtn.addEventListener('click', () => {
        const newId = 'r' + (Date.now() % 100000);
        state.recipes.push({ id: newId, inputs: ['White'], outputs: ['Red', 'Blue'] });
        history.saveSnapshot(state);
        renderList();
    });

    function renderList() {
        list.innerHTML = '';

        // Header
        const headerRow = document.createElement('div');
        headerRow.style.display = 'flex';
        headerRow.style.gap = '10px';
        headerRow.style.marginBottom = '5px';
        headerRow.style.fontWeight = 'bold';

        const inputsHeader = document.createElement('div');
        inputsHeader.innerText = 'Inputs (comma separated)';
        inputsHeader.style.flex = '1';

        const outputsHeader = document.createElement('div');
        outputsHeader.innerText = 'Outputs (comma separated)';
        outputsHeader.style.flex = '1';

        headerRow.appendChild(inputsHeader);
        headerRow.appendChild(outputsHeader);
        // spacer for remove button
        const spacer = document.createElement('div');
        spacer.style.width = '20px';
        headerRow.appendChild(spacer);

        list.appendChild(headerRow);

        state.recipes.forEach((recipe, index) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.gap = '10px';
            row.style.marginBottom = '5px';

            const inputsInput = document.createElement('input');
            inputsInput.type = 'text';
            inputsInput.value = recipe.inputs.join(', ');
            inputsInput.placeholder = 'e.g., Red, Blue';
            inputsInput.style.flex = '1';
            inputsInput.addEventListener('change', (e) => {
                recipe.inputs = e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
                history.saveSnapshot(state);
            });

            const outputsInput = document.createElement('input');
            outputsInput.type = 'text';
            outputsInput.value = recipe.outputs.join(', ');
            outputsInput.placeholder = 'e.g., White';
            outputsInput.style.flex = '1';
            outputsInput.addEventListener('change', (e) => {
                recipe.outputs = e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
                history.saveSnapshot(state);
            });

            const removeBtn = document.createElement('button');
            removeBtn.innerText = 'X';
            removeBtn.addEventListener('click', () => {
                state.recipes.splice(index, 1);
                history.saveSnapshot(state);
                renderList();
            });

            row.appendChild(inputsInput);
            row.appendChild(outputsInput);
            row.appendChild(removeBtn);

            list.appendChild(row);
        });
    }
}
