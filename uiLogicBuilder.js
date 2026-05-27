export function renderLogicBuilder(container, entity, state) {
    container.innerHTML = '<strong>Logic:</strong><br>';

    const wrapper = document.createElement('div');
    wrapper.style.marginLeft = '10px';
    wrapper.style.borderLeft = '1px solid #555';
    wrapper.style.paddingLeft = '5px';

    if (!entity.logic) {
        entity.logic = "TRUE";
    }

    renderLogicNode(wrapper, entity.logic, (newLogic) => {

        entity.logic = newLogic;
        entity.setEditableProperty('logic', newLogic);

        // Sync lines (connections) based on new AST
        syncConnectionsFromLogic(entity, state);

        import('./history.js').then(({ history }) => history.saveSnapshot(state));

        renderLogicBuilder(container, entity, state);
    }, state);

    container.appendChild(wrapper);
}

function renderLogicNode(container, logic, onChange, state) {
    const nodeDiv = document.createElement('div');
    nodeDiv.style.marginBottom = '5px';
    nodeDiv.style.marginTop = '5px';

    // Type selector
    const typeSelect = document.createElement('select');
    typeSelect.style.marginRight = '5px';
    const types = ['TRUE', 'FALSE', 'BUTTON', 'AND', 'OR', 'NOT'];
    types.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.text = t;
        if (typeof logic === 'string' && t === 'BUTTON') {
             // Let string fall into button type for old format or simple button IDs
             if (logic !== "TRUE" && logic !== "FALSE") opt.selected = true;
             else if (logic === t) opt.selected = true;
        } else if (logic && logic.op === t) {
            opt.selected = true;
        } else if (typeof logic === 'string' && logic === t) {
            opt.selected = true;
        }
        typeSelect.appendChild(opt);
    });

    typeSelect.addEventListener('change', (e) => {
        const t = e.target.value;
        if (t === 'TRUE' || t === 'FALSE') {
            onChange(t);
        } else if (t === 'BUTTON') {
            // Use a specific internal string to represent "empty button ID"
            // so it doesn't get coerced to falsy or TRUE in export
            onChange("BUTTON_ID");
        } else if (t === 'NOT') {
            onChange({ op: 'NOT', args: ["TRUE"] });
        } else if (t === 'AND' || t === 'OR') {
            onChange({ op: t, args: ["TRUE", "TRUE"] });
        }
    });
    nodeDiv.appendChild(typeSelect);

    // Render contents based on type
    const isOp = logic && typeof logic === 'object' && logic.op;
    const type = isOp ? logic.op : (logic === 'TRUE' || logic === 'FALSE' ? logic : 'BUTTON');

    if (type === 'BUTTON') {
        const btnInput = document.createElement('input');
        btnInput.type = 'text';
        btnInput.value = typeof logic === 'string' && logic !== 'TRUE' && logic !== 'FALSE' && logic !== 'BUTTON_ID' ? logic : '';
        btnInput.placeholder = 'Button ID';
        btnInput.style.width = '80px';
        btnInput.addEventListener('change', (e) => {
            onChange(e.target.value);
        });
        nodeDiv.appendChild(btnInput);
    } else if (type === 'NOT') {
        const childContainer = document.createElement('div');
        childContainer.style.marginLeft = '15px';
        renderLogicNode(childContainer, logic.args[0], (newChild) => {
            onChange({ op: 'NOT', args: [newChild] });
        }, state);
        nodeDiv.appendChild(childContainer);
    } else if (type === 'AND' || type === 'OR') {
        const argsContainer = document.createElement('div');
        argsContainer.style.marginLeft = '15px';

        logic.args.forEach((arg, index) => {
            const argDiv = document.createElement('div');
            argDiv.style.display = 'flex';
            argDiv.style.alignItems = 'flex-start';

            const childContainer = document.createElement('div');
            renderLogicNode(childContainer, arg, (newChild) => {
                const newArgs = [...logic.args];
                newArgs[index] = newChild;
                onChange({ op: type, args: newArgs });
            }, state);

            const removeBtn = document.createElement('button');
            removeBtn.innerText = 'X';
            removeBtn.style.marginLeft = '5px';
            removeBtn.addEventListener('click', () => {
                const newArgs = logic.args.filter((_, i) => i !== index);
                if (newArgs.length === 0) newArgs.push("TRUE");
                onChange({ op: type, args: newArgs });
            });

            argDiv.appendChild(childContainer);
            argDiv.appendChild(removeBtn);
            argsContainer.appendChild(argDiv);
        });

        const addBtn = document.createElement('button');
        addBtn.innerText = '+ Add';
        addBtn.style.marginTop = '2px';
        addBtn.addEventListener('click', () => {
            const newArgs = [...logic.args, "TRUE"];
            onChange({ op: type, args: newArgs });
        });
        argsContainer.appendChild(addBtn);

        nodeDiv.appendChild(argsContainer);
    }

    container.appendChild(nodeDiv);
}

function extractButtonsFromLogic(logic, buttonsList) {
    if (!logic || logic === "TRUE" || logic === "FALSE" || logic === "BUTTON_ID") return;
    if (typeof logic === 'string') {
        buttonsList.push(logic);
        return;
    }
    if (logic.args) {
        logic.args.forEach(arg => extractButtonsFromLogic(arg, buttonsList));
    }
}

function syncConnectionsFromLogic(entity, state) {
    const receiver = entity.getComponent('SignalReceiverComponent');
    if (!receiver) return;

    const requiredButtons = [];
    extractButtonsFromLogic(entity.logic, requiredButtons);

    // For all buttons in state
    state.entities.forEach(other => {
        if (other.constructor.getName() === 'button') {
            const sender = other.getComponent('SignalSenderComponent');
            if (sender) {
                const isRequired = requiredButtons.includes(other.name);
                const isConnected = sender.receiverComponents.includes(receiver);

                if (isRequired && !isConnected) {
                    sender.addReceiver(receiver);
                } else if (!isRequired && isConnected) {
                    sender.receiverComponents = sender.receiverComponents.filter(r => r !== receiver);
                }
            }
        }
    });
}
