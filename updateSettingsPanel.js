import { computeNodes } from './utils/nodeUtils.js';

export function updateSettingsPanel(state) {
  const panel = document.getElementById('entitySettingsPanel');
  const content = document.getElementById('entitySettingsContent');
  if (!panel || !content) return;

  // Clear panel first
  panel.style.display = 'none';
  content.innerHTML = '';

  if (state.selectedNode && state.selectedEntites.length === 0 && (!state.selectedConnections || state.selectedConnections.length === 0)) {
    // Show Node settings
    panel.style.display = 'flex';

    const label = document.createElement('label');
    label.style.display = 'block';
    label.style.marginBottom = '5px';
    label.innerText = 'Node Name: ';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = state.selectedNode.id; // Either user defined or default

    input.addEventListener('change', (e) => {
      const newName = e.target.value.trim();
      if (!newName) return;

      if (!state.nodeData) state.nodeData = [];
      import('./history.js').then(({ history }) => history.saveSnapshot(state));

      // Since rooms could be reconstructed, we store nodeData relative to the center of the first rect
      const firstRect = state.selectedNode.rects[0];
      const centerX = firstRect.x + firstRect.w / 2;
      const centerY = firstRect.y + firstRect.h / 2;

      // Find if we already have data for this node
      let found = false;
      for (let i = 0; i < state.nodeData.length; i++) {
          const data = state.nodeData[i];
          let inside = false;
          for (const rect of state.selectedNode.rects) {
              if (data.x >= rect.x && data.x <= rect.x + rect.w && data.y >= rect.y && data.y <= rect.y + rect.h) {
                  inside = true;
                  break;
              }
          }
          if (inside) {
              state.nodeData[i].name = newName;
              found = true;
              break;
          }
      }

      if (!found) {
          state.nodeData.push({ x: centerX, y: centerY, name: newName });
      }

      // Re-compute nodes to apply changes to state.selectedNode
      const updatedNodes = computeNodes(state);
      state.selectedNode = updatedNodes.find(n => n.id === newName) || updatedNodes.find(n => n.defaultId === state.selectedNode.defaultId);
    });

    label.appendChild(input);
    content.appendChild(label);
    return;
  }

  if (state.selectedEntites.length === 1 && (!state.selectedConnections || state.selectedConnections.length === 0)) {
    const entity = state.selectedEntites[0];
    const props = entity.getEditableProperties();
    if (props && props.length > 0) {
      panel.style.display = 'flex';
      content.innerHTML = '';
      props.forEach(prop => {
        const label = document.createElement('label');
        label.style.display = 'block';
        label.style.marginBottom = '5px';

        if (prop.type === 'checkbox') {
          const input = document.createElement('input');
          input.type = 'checkbox';
          input.checked = entity[prop.property];
          input.addEventListener('change', (e) => {
            entity.setEditableProperty(prop.property, e.target.checked);
            import('./history.js').then(({ history }) => history.saveSnapshot(state));
            window.dispatchEvent(new CustomEvent('entityPropertyChanged', { detail: { entity, property: prop.property } }));
          });
          label.appendChild(input);
          label.append(' ' + prop.label);
        } else if (prop.type === 'text') {
          label.innerText = prop.label + ': ';
          const input = document.createElement('input');
          input.type = 'text';
          input.value = entity[prop.property];
          input.addEventListener('change', (e) => {
            entity.setEditableProperty(prop.property, e.target.value);
            import('./history.js').then(({ history }) => history.saveSnapshot(state));
            window.dispatchEvent(new CustomEvent('entityPropertyChanged', { detail: { entity, property: prop.property } }));
          });
          label.appendChild(input);
        } else if (prop.type === 'number') {
          label.innerText = prop.label + ': ';
          const input = document.createElement('input');
          input.type = 'number';
          input.value = entity[prop.property];
          input.addEventListener('change', (e) => {
            let val = parseFloat(e.target.value);
            if (isNaN(val)) val = 0;
            entity.setEditableProperty(prop.property, val);
            import('./history.js').then(({ history }) => history.saveSnapshot(state));
            window.dispatchEvent(new CustomEvent('entityPropertyChanged', { detail: { entity, property: prop.property } }));
          });
          label.appendChild(input);
        } else if (prop.type === 'dropdown') {
          label.innerText = prop.label + ': ';
          const select = document.createElement('select');
          prop.options.forEach(opt => {
              const optionEl = document.createElement('option');
              optionEl.value = opt;
              optionEl.innerText = opt;
              if (entity[prop.property] === opt) optionEl.selected = true;
              select.appendChild(optionEl);
          });
          select.addEventListener('change', (e) => {
            entity.setEditableProperty(prop.property, e.target.value);
            import('./history.js').then(({ history }) => history.saveSnapshot(state));
            window.dispatchEvent(new CustomEvent('entityPropertyChanged', { detail: { entity, property: prop.property } }));
          });
          label.appendChild(select);
        } else if (prop.type === 'list') {
          label.innerText = prop.label + ': ';
          const listContainer = document.createElement('div');
          listContainer.style.marginLeft = '10px';
          listContainer.style.marginBottom = '5px';

          const renderList = () => {
              listContainer.innerHTML = '';
              const currentList = entity[prop.property] || [];

              currentList.forEach((item, index) => {
                  const itemDiv = document.createElement('div');
                  itemDiv.style.display = 'flex';
                  itemDiv.style.marginBottom = '2px';

                  const select = document.createElement('select');
                  prop.options.forEach(opt => {
                      const optionEl = document.createElement('option');
                      optionEl.value = opt;
                      optionEl.innerText = opt;
                      if (item === opt) optionEl.selected = true;
                      select.appendChild(optionEl);
                  });
                  select.addEventListener('change', (e) => {
                      const newList = [...entity[prop.property]];
                      newList[index] = e.target.value;
                      entity.setEditableProperty(prop.property, newList);
                      import('./history.js').then(({ history }) => history.saveSnapshot(state));
                      window.dispatchEvent(new CustomEvent('entityPropertyChanged', { detail: { entity, property: prop.property } }));
                  });

                  const removeBtn = document.createElement('button');
                  removeBtn.innerText = '-';
                  removeBtn.style.marginLeft = '5px';
                  removeBtn.addEventListener('click', () => {
                      const newList = entity[prop.property].filter((_, i) => i !== index);
                      entity.setEditableProperty(prop.property, newList);
                      import('./history.js').then(({ history }) => history.saveSnapshot(state));
                      window.dispatchEvent(new CustomEvent('entityPropertyChanged', { detail: { entity, property: prop.property } }));
                      renderList(); // Re-render to show removed item
                  });

                  itemDiv.appendChild(select);
                  itemDiv.appendChild(removeBtn);
                  listContainer.appendChild(itemDiv);
              });

              const addBtn = document.createElement('button');
              addBtn.innerText = '+';
              addBtn.style.marginTop = '2px';
              addBtn.addEventListener('click', () => {
                  const newList = [...(entity[prop.property] || []), prop.options[0]];
                  entity.setEditableProperty(prop.property, newList);
                  import('./history.js').then(({ history }) => history.saveSnapshot(state));
                  window.dispatchEvent(new CustomEvent('entityPropertyChanged', { detail: { entity, property: prop.property } }));
                  renderList(); // Re-render to show new item
              });
              listContainer.appendChild(addBtn);
          };
          renderList();
          label.appendChild(listContainer);
        } else if (prop.type === 'logic') {
          import('./uiLogicBuilder.js').then(({ renderLogicBuilder }) => {
              // check to avoid duplicate rendering race conditions
              if (state.selectedEntites.length === 1 && state.selectedEntites[0].id === entity.id) {
                  // verify not already added
                  if (!content.querySelector('.logic-builder-container')) {
                      const logicContainer = document.createElement('div');
                      logicContainer.className = 'logic-builder-container';
                      logicContainer.style.marginTop = '10px';
                      renderLogicBuilder(logicContainer, entity, state);
                      content.appendChild(logicContainer);
                  }
              }
          });
          return; // uiLogicBuilder handles its own appending
        }
        content.appendChild(label);
      });
      return;
    }
  }
  panel.style.display = 'none';
}
