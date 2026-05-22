export function setupWebhooksModal() {
    const btn = document.getElementById('manageWebhooksBtn');
    const modal = document.getElementById('webhooksModal');
    const closeBtn = document.getElementById('closeWebhooksBtn');
    const addBtn = document.getElementById('addWebhookBtn');
    const list = document.getElementById('webhooksList');
    const select = document.getElementById('webhookSelect');

    if (!btn || !modal || !select) return;

    let webhooks = [];
    try {
        const stored = localStorage.getItem('discordWebhooks');
        if (stored) {
            webhooks = JSON.parse(stored);
        }
    } catch (e) {
        console.error("Failed to parse webhooks from local storage", e);
    }

    // Try to load default webhook.txt
    async function loadDefaultWebhook() {
        try {
            const response = await fetch('webhook.txt');
            if (response.ok) {
                const webhookUrl = (await response.text()).trim();
                if (webhookUrl && webhookUrl.startsWith('http')) {
                    // Check if exists
                    if (!webhooks.find(w => w.url === webhookUrl)) {
                        webhooks.push({ name: 'Default', url: webhookUrl });
                        saveWebhooks();
                    }
                }
            }
        } catch (e) {
            // No webhook.txt, fine
        }
        updateSelect();
    }

    function saveWebhooks() {
        localStorage.setItem('discordWebhooks', JSON.stringify(webhooks));
        updateSelect();
    }

    function updateSelect() {
        select.innerHTML = '';
        if (webhooks.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'None';
            select.appendChild(option);
        } else {
            webhooks.forEach((w, index) => {
                const option = document.createElement('option');
                option.value = w.url;
                option.textContent = w.name;
                select.appendChild(option);
            });
        }
    }

    function renderList() {
        list.innerHTML = '';
        webhooks.forEach((w, index) => {
            const row = document.createElement('div');
            row.className = 'webhook-row';

            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = w.name;
            nameInput.placeholder = 'Name';
            nameInput.addEventListener('change', (e) => {
                webhooks[index].name = e.target.value;
                saveWebhooks();
            });

            const urlInput = document.createElement('input');
            urlInput.type = 'text';
            urlInput.value = w.url;
            urlInput.placeholder = 'Webhook URL';
            urlInput.addEventListener('change', (e) => {
                webhooks[index].url = e.target.value;
                saveWebhooks();
            });

            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'X';
            removeBtn.style.backgroundColor = '#f44336';
            removeBtn.style.color = 'white';
            removeBtn.style.border = 'none';
            removeBtn.style.padding = '4px 8px';
            removeBtn.style.cursor = 'pointer';
            removeBtn.style.borderRadius = '4px';
            removeBtn.addEventListener('click', () => {
                webhooks.splice(index, 1);
                saveWebhooks();
                renderList();
            });

            row.appendChild(nameInput);
            row.appendChild(urlInput);
            row.appendChild(removeBtn);
            list.appendChild(row);
        });
    }

    btn.addEventListener('click', () => {
        renderList();
        modal.classList.remove('hidden');
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    addBtn.addEventListener('click', () => {
        webhooks.push({ name: 'New Webhook', url: '' });
        saveWebhooks();
        renderList();
    });

    loadDefaultWebhook();
}
