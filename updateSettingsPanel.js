export function updateSettingsPanel(state) {
  const panel = document.getElementById('entitySettingsPanel');
  const content = document.getElementById('entitySettingsContent');
  if (!panel || !content) return;

  if (state.selectedEntites.length === 1 && state.selectedConnections && state.selectedConnections.length === 0) {
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
            window.dispatchEvent(new CustomEvent('entityPropertyChanged', { detail: { entity, property: prop.property } }));
          });
          label.appendChild(input);
        } else if (prop.type === 'number') {
          label.innerText = prop.label + ': ';
          const input = document.createElement('input');
          input.type = 'number';
          input.value = entity[prop.property];
          input.addEventListener('change', (e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) {
                entity.setEditableProperty(prop.property, val);
                window.dispatchEvent(new CustomEvent('entityPropertyChanged', { detail: { entity, property: prop.property } }));
            }
          });
          label.appendChild(input);
        }
        content.appendChild(label);
      });
      return;
    }
  }
  panel.style.display = 'none';
}
