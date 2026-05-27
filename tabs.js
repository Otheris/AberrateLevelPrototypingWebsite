import { serializeLevel, importLevel } from './io.js';
import { state } from './editor.js';

export function setupTabs() {
    const tabsList = document.getElementById('tabsList');
    const addTabBtn = document.getElementById('addTabBtn');
    const levelNameInput = document.getElementById('levelName');

    let tabs = JSON.parse(localStorage.getItem('editorTabs') || '[]');
    let activeTabId = localStorage.getItem('activeTabId');

    if (tabs.length === 0) {
        const id = Date.now().toString();
        tabs.push({ id, name: 'Untitled' });
        activeTabId = id;
        saveTabsState();
    }

    if (!tabs.find(t => t.id === activeTabId)) {
        activeTabId = tabs[0].id;
    }

    function saveTabsState() {
        localStorage.setItem('editorTabs', JSON.stringify(tabs));
        localStorage.setItem('activeTabId', activeTabId);
    }

    function renderTabs() {
        if (!tabsList) return;
        tabsList.innerHTML = '';
        tabs.forEach(tab => {
            const tabDiv = document.createElement('div');
            tabDiv.className = `tab ${tab.id === activeTabId ? 'active' : ''}`;
            tabDiv.textContent = tab.name;

            tabDiv.addEventListener('click', (e) => {
                if (e.target.classList.contains('tab-close')) return;
                switchTab(tab.id);
            });

            if (tabs.length > 1) {
                const closeBtn = document.createElement('span');
                closeBtn.className = 'tab-close';
                closeBtn.textContent = '×';
                closeBtn.addEventListener('click', () => closeTab(tab.id));
                tabDiv.appendChild(closeBtn);
            }

            tabsList.appendChild(tabDiv);
        });
    }

    function switchTab(id) {
        if (id === activeTabId) return;

        // Save current tab
        saveCurrentLevelToStorage();

        activeTabId = id;
        saveTabsState();

        // Load new tab
        loadCurrentLevelFromStorage();
        renderTabs();
    }

    function addTab() {
        saveCurrentLevelToStorage();

        const id = Date.now().toString();
        tabs.push({ id, name: 'Untitled' });
        activeTabId = id;
        saveTabsState();

        // Load an empty level
        importLevel(state, '{"tiles":[],"rooms":[],"camera":{"x":0,"y":0,"zoom":1},"cubeTypes":[{"name":"White","weight":3,"color":"#ffffff"},{"name":"Red","weight":1,"color":"#ff0000"},{"name":"Green","weight":1,"color":"#00ff00"},{"name":"Blue","weight":1,"color":"#0000ff"},{"name":"Cyan","weight":2,"color":"#00ffff"},{"name":"Magenta","weight":2,"color":"#ff00ff"},{"name":"Orange","weight":2,"color":"#ffa500"}],"recipes":[{"id":"r1","inputs":["White"],"outputs":["Red","Green","Blue"]},{"id":"r2","inputs":["Red","Green","Blue"],"outputs":["White"]},{"id":"r3","inputs":["Red","Blue"],"outputs":["Orange"]},{"id":"r4","inputs":["Orange"],"outputs":["Red","Blue"]},{"id":"r5","inputs":["Green","Blue"],"outputs":["Cyan"]},{"id":"r6","inputs":["Cyan"],"outputs":["Green","Blue"]},{"id":"r7","inputs":["Red","Green"],"outputs":["Magenta"]},{"id":"r8","inputs":["Magenta"],"outputs":["Red","Green"]}],"entities":[]}');
        levelNameInput.value = 'Untitled';
        saveCurrentLevelToStorage(); // Save the empty initial state
        renderTabs();
    }

    function closeTab(id) {
        const index = tabs.findIndex(t => t.id === id);
        if (index === -1) return;

        tabs.splice(index, 1);
        localStorage.removeItem(`level_${id}`);

        if (id === activeTabId) {
            activeTabId = tabs[Math.max(0, index - 1)].id;
            loadCurrentLevelFromStorage();
        }

        saveTabsState();
        renderTabs();
    }

    if (addTabBtn) addTabBtn.addEventListener('click', addTab);

    if (levelNameInput) {
        levelNameInput.addEventListener('input', (e) => {
            const tab = tabs.find(t => t.id === activeTabId);
            if (tab) {
                tab.name = e.target.value || 'Untitled';
                saveTabsState();
                renderTabs();
            }
        });
    }

    renderTabs();
    loadCurrentLevelFromStorage();

    // Auto-save when the user is about to leave the page
    window.addEventListener('beforeunload', () => {
        saveCurrentLevelToStorage();
    });
}

export function saveCurrentLevelToStorage() {
    const activeTabId = localStorage.getItem('activeTabId');
    if (activeTabId) {
        localStorage.setItem(`level_${activeTabId}`, serializeLevel(state));
    }
}

export function loadCurrentLevelFromStorage() {
    const activeTabId = localStorage.getItem('activeTabId');
    if (activeTabId) {
        const data = localStorage.getItem(`level_${activeTabId}`);
        if (data) {
            importLevel(state, data);

            // update name
            let tabs = JSON.parse(localStorage.getItem('editorTabs') || '[]');
            const tab = tabs.find(t => t.id === activeTabId);
            const levelNameInput = document.getElementById('levelName');
            if (tab && levelNameInput) {
                levelNameInput.value = tab.name;
            }
        }
    }
}
