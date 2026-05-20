export function evaluateAST(logic, state) {
    if (!logic) return true;
    if (logic === "TRUE") return true;
    if (logic === "FALSE") return false;

    if (typeof logic === 'string') {
        // It's a button ID
        const playmodeEntities = state.playmodeEntities || state.entities || []; // Fallback to entities if not in playmode
        const btn = playmodeEntities.find(e => e.constructor.getName() === 'button' && e.name === logic);
        if (btn) {
            // we check if it has a signalsender and what its current state is
            const sender = btn.getComponent('signalsender');
            if (sender) {
                return sender.currentSignalState > 0;
            }
        }
        return false;
    }

    if (logic.op === 'AND') {
        return logic.args.every(arg => evaluateAST(arg, state));
    } else if (logic.op === 'OR') {
        return logic.args.some(arg => evaluateAST(arg, state));
    } else if (logic.op === 'NOT') {
        return !evaluateAST(logic.args[0], state);
    }

    return false;
}
