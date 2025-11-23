if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtension);
} else {
    initExtension();
}

function initExtension() {
    setTimeout(() => {
        createButton();
        setupKeyboardShortcut();
    }, 1000);
}

let isProcessing = false;

function createButton() {
    if (document.getElementById('gemini-assistant-btn')) return;
    
    const btn = document.createElement('button');
    btn.id = 'gemini-assistant-btn';
    btn.innerHTML = 'Assistant IA';
    btn.style.cssText = `
        position: fixed !important;
        bottom: 20px !important;
        right: 20px !important;
        z-index: 2147483647 !important;
        padding: 15px 25px !important;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        color: white !important;
        border: none !important;
        border-radius: 50px !important;
        font-size: 16px !important;
        font-weight: bold !important;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3) !important;
        transition: all 0.3s ease !important;
    `;
    
    btn.onmouseover = () => {
        btn.style.transform = 'scale(1.05)';
        btn.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
    };
    btn.onmouseout = () => {
        btn.style.transform = 'scale(1)';
        btn.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
    };
    btn.onclick = () => startAssistant();
    
    document.body.appendChild(btn);

    const observer = new MutationObserver(() => {
        if (!document.getElementById('gemini-assistant-btn')) {
            createButton();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

function setupKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            startAssistant();
        }
    });
}

async function startAssistant() {
    if (isProcessing) return;

    const { apiKey, provider } = await chrome.storage.local.get(['apiKey', 'provider']);
    
    if (!apiKey || apiKey.length < 10) {
        alert('Configure d’abord ta clé API.');
        return;
    }
    
    if (!provider) {
        alert('Sélectionne un fournisseur d’API.');
        return;
    }

    function extractHomeworks() {
        const tasks = document.querySelectorAll('.detailed-task');
        const homeworks = [];
        
        tasks.forEach((task, index) => {
            const subject = task.querySelector('.task-header h4')?.textContent?.trim() || 'Sans titre';
            const dateInfo = task.querySelector('.add-date')?.textContent?.trim() || '';
            const content = task.querySelector('.task-content')?.textContent?.replace('Copier le contenu', '').trim() || '';
            const isCompleted = task.querySelector('input[type="checkbox"]')?.checked || false;
            
            homeworks.push({ 
                index: index + 1, 
                subject, 
                dateInfo,
                content, 
                isCompleted,
                taskElement: task 
            });
        });
        
        return homeworks;
    }

    async function askAI(hw, retries = 2) {
    const prompt = `Explique mon devoir :
Matière : ${hw.subject}
Devoir : ${hw.content}

Donne une réponse structurée :
- Explication
- Méthodo
- Liens fiables
- Points clés
Utilise du markdown, sans emojis.`;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'callAPI',
                provider: provider,
                apiKey: apiKey,
                prompt: prompt
            });

            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.error);
            }
            
        } catch (err) {
            console.error(`Tentative ${attempt + 1}/${retries + 1} échouée:`, err);
            if (attempt === retries) {
                return `Erreur : ${err.message}`;
            }
            await new Promise(r => setTimeout(r, 1000));
        }
    }
}

    function injectAnswer(taskElement, hw, answer) {
        let container = taskElement.querySelector('.ai-answer');
        
        if (!container) {
            container = document.createElement('div');
            container.className = 'ai-answer';
            container.style.cssText = `
                border-radius: 1em;
                background-color: #44445e;
                margin-top: 15px !important;
                padding: 15px !important;
                font-family: Arial, sans-serif !important;
                color: #fdfdff;
                line-height: 1.6 !important;
            `;
            taskElement.appendChild(container);
        }
        
        let formattedAnswer = answer
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\n/g, '<br>');
            
        container.innerHTML = `
            <strong>Aide IA (${provider}) - ${hw.subject}</strong>
            <div>${formattedAnswer}</div>
            <button class="ai-copy-btn" style="
                background-color: #667eea;
                margin-top: 10px;
                padding: 8px 15px;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            ">Copier</button>
        `;
        
        const copyBtn = container.querySelector('.ai-copy-btn');
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(answer);
            copyBtn.textContent = 'Copié';
            setTimeout(() => copyBtn.textContent = 'Copier', 2000);
        };
    }
        
    function showLoader(taskElement, hw) {
        let loader = taskElement.querySelector('.ai-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'ai-loader';
            loader.style.cssText = `
                margin-top: 10px;
                padding: 10px;
                background: #44445e;
                border-radius: 5px;
                text-align: center;
                color: #a8a8e3;
            `;
            taskElement.appendChild(loader);
        }
        loader.innerHTML = `Analyse de ${hw.subject}...`;
        return loader;
    }

    function removeLoader(taskElement) {
        const loader = taskElement.querySelector('.ai-loader');
        if (loader) loader.remove();
    }

    isProcessing = true;
    const btn = document.getElementById('gemini-assistant-btn');
    if (btn) {
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    }
    
    const homeworks = extractHomeworks();
    
    if (homeworks.length === 0) {
        alert('Aucun devoir trouvé.');
        isProcessing = false;
        if (btn) {
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }
        return;
    }
    
    const todoHomeworks = homeworks.filter(hw => !hw.isCompleted);
    
    if (todoHomeworks.length === 0) {
        alert('Tous les devoirs sont déjà faits.');
        isProcessing = false;
        if (btn) {
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }
        return;
    }
    
    for (const hw of todoHomeworks) {
        showLoader(hw.taskElement, hw);
        const answer = await askAI(hw);
        removeLoader(hw.taskElement);
        injectAnswer(hw.taskElement, hw, answer);
    }
    
    isProcessing = false;
    if (btn) {
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
    }
}
