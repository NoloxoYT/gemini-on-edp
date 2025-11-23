
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtension);
} else {
    initExtension();
}

function initExtension() {
    console.log('Extension Gemini x EDP chargée !');
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
        color: white !important;
        border: none !important;
        border-radius: 50px !important;
        font-size: 16px !important;
        font-weight: bold !important;
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
    console.log('✅ Bouton créé !');
    
    // Observer pour recréer si supprimé
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

// Fonction principale
async function startAssistant() {
    if (isProcessing) {
        alert('...');
        return;
    }

    const { apiKey } = await chrome.storage.sync.get(['apiKey']);
    if (!apiKey || apiKey.length < 10) {
        alert('⚠️ Configure d\'abord ta clé API Gemini !\n\nClique sur l\'icône de l\'extension en haut à droite.');
        return;
    }
    const API_KEY = apiKey;

    // Extraction des devoirs
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

    // Appel API Gemini avec retry
    async function askGemini(hw, retries = 2) {
        const prompt = `Explique mon devoir :
Matière : ${hw.subject}
Devoir : ${hw.content}
Donne une réponse structurée avec :
 Explication du devoir a faire
 Conseils méthodologiques
 Des Liens fiables
 Points clés à retenir
Utilise du markdown.
Nutilise pas d'emojis`;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-goog-api-key': API_KEY
                        },
                        body: JSON.stringify({ 
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: {
                                temperature: 0.1,
                                maxOutputTokens: 7000
                            }
                        })
                    }
                );
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error?.message || `HTTP ${response.status}`);
                }
                
                const data = await response.json();
                return data?.candidates?.[0]?.content?.parts?.[0]?.text || '❌ Aucune réponse';
                
            } catch (err) {
                console.error(`Tentative ${attempt + 1}/${retries + 1} échouée:`, err);
                if (attempt === retries) {
                    return `❌ Erreur : ${err.message}`;
                }
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }

    // Injection dans le DOM
    function injectAnswer(taskElement, hw, answer) {
        let container = taskElement.querySelector('.gemini-answer');
        
        if (!container) {
            container = document.createElement('div');
            container.className = 'gemini-answer';
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
        
        // Convertir markdown en HTML
        let formattedAnswer = answer
            .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fdfdff" "font-weigth: 700">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^### (.*$)/gim, '<h3 style="color:#667eea;margin:10px 0 5px 0;">$1</h3>')
            .replace(/^## (.*$)/gim, '<h2 style="color:#667eea;margin:10px 0 5px 0;">$1</h2>')
            .replace(/^# (.*$)/gim, '<h1 style="color:#667eea;margin:10px 0 5px 0;">$1</h1>')
            .replace(/\n/g, '<br>');
        
        container.innerHTML = `
            <div style="display:flex;align-items:center;margin-bottom:10px;">
                <span style="font-size:24px;margin-right:10px;"></span>
                <strong style="color:#667eea;font-size:16px;">Aide IA - ${hw.subject}</strong>
            </div>
            <div style="color:#fdfdff;font-size:14px;">${formattedAnswer}</div>
            <button class="gemini-copy-btn" style="
                background-color: 50%;
                margin-top: 10px;
                padding: 8px 15px;
                color: #a8a8e3;
                border: none;
                border-radius: 5px;
                cursor:pointer;
                font-size: 12px;
            ">Copier</button>
        `;
        
        const copyBtn = container.querySelector('.gemini-copy-btn');
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(answer);
            copyBtn.textContent = 'Copié !';
            setTimeout(() => copyBtn.textContent = 'Copier', 2000);
        };
    }

    // Loader
    function showLoader(taskElement, hw) {
        let loader = taskElement.querySelector('.gemini-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'gemini-loader';
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
        const loader = taskElement.querySelector('.gemini-loader');
        if (loader) loader.remove();
    }

    // Exécution
    isProcessing = true;
    const btn = document.getElementById('gemini-assistant-btn');
    if (btn) {
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    }
    
    const homeworks = extractHomeworks();
    
    if (homeworks.length === 0) {
        alert('❌ Aucun devoir trouvé sur cette page.');
        isProcessing = false;
        if (btn) {
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }
        return;
    }
    
    const todoHomeworks = homeworks.filter(hw => !hw.isCompleted);
    
    if (todoHomeworks.length === 0) {
        alert('🎉 Tous tes devoirs sont déjà faits !');
        isProcessing = false;
        if (btn) {
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }
        return;
    }
    
    console.log(`🚀 Traitement de ${todoHomeworks.length} devoir(s)...`);
    
    for (const hw of todoHomeworks) {
        const loader = showLoader(hw.taskElement, hw);
        const answer = await askGemini(hw);
        removeLoader(hw.taskElement);
        injectAnswer(hw.taskElement, hw, answer);
    }
    
    isProcessing = false;
    if (btn) {
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
    }
}