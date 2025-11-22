async function startAssistant() {
    const { apiKey } = await chrome.storage.sync.get(['apiKey']);
    
    if (!apiKey) {
        alert('⚠️ Configure d\'abord ta clé API Gemini dans le popup de l\'extension !');
        return;
    }
    const API_KEY = apiKey;

    // Extraction des devoirs depuis le DOM
    function extractHomeworks() {
        const tasks = document.querySelectorAll('.detailed-task');
        const homeworks = [];
        
        tasks.forEach((task, index) => {
            const subject = task.querySelector('.task-header h4')?.textContent?.trim() || 'Sans titre';
            const content = task.querySelector('.task-content')?.textContent?.replace('Copier le contenu', '').trim() || '';
            
            homeworks.push({
                index: index + 1,
                subject,
                content,
                taskElement: task // ← on garde l'élément DOM pour l'injection
            });
        });
        
        return homeworks;
    }

    // Appel à l'API Gemini
    async function askGemini(homework) {
        const prompt = `Tu es un assistant éducatif bienveillant. Aide l'élève avec ce devoir :

📚 Matière : ${homework.subject}
📝 Consigne : ${homework.content}

Donne une réponse structurée et pédagogique.`;

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
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                }
            );
            const data = await response.json();
            return data?.candidates?.[0]?.content?.parts?.[0]?.text || '❌ Aucune réponse';
        } catch (err) {
            console.error('❌ Erreur API:', err);
            return `❌ Erreur : ${err.message}`;
        }
    }

    // Injection dans le DOM
    function injectAnswer(taskElement, answer) {
        let container = taskElement.querySelector('.gemini-answer');
        if (!container) {
            container = document.createElement('div');
            container.className = 'gemini-answer';
            container.style.marginTop = '10px';
            container.style.padding = '10px';
            container.style.border = '1px solid #4CAF50';
            container.style.borderRadius = '5px';
            container.style.backgroundColor = '#f9fff9';
            taskElement.appendChild(container);
        }
        container.innerHTML = `<strong>🤖 Aide IA :</strong><p>${answer.replace(/\n/g, '<br>')}</p>`;
    }

    // Exécution principale
    const homeworks = extractHomeworks();
    if (homeworks.length === 0) {
        console.error('❌ Aucun devoir trouvé.');
        return;
    }

    // Auto-aide pour tous les devoirs
    for (const hw of homeworks) {
        const answer = await askGemini(hw);
        injectAnswer(hw.taskElement, answer);
    }

    console.log('✅ Toutes les aides IA ont été injectées dans le DOM !');
}