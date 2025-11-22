(async function() {
    // Attendre que l'utilisateur appuie sur un raccourci clavier
    // Par exemple : Ctrl + Shift + D (D pour Devoirs)
    document.addEventListener('keydown', async (e) => {
        // Ctrl + Shift + D pour lancer l'assistant
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            console.log('🚀 Démarrage de l\'Assistant Devoirs IA...');
            await startAssistant();
        }
    });

    async function startAssistant() {
        // Récupérer la clé API depuis le stockage de l'extension
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
                const dateInfo = task.querySelector('.add-date')?.textContent?.trim() || '';
                const content = task.querySelector('.task-content')?.textContent?.trim() || '';
                const isCompleted = task.querySelector('input[type="checkbox"]')?.checked || false;
                
                homeworks.push({
                    index: index + 1,
                    subject,
                    dateInfo,
                    content: content.replace('Copier le contenu', '').trim(),
                    isCompleted
                });
            });
            
            return homeworks;
        }

        // Appel à l'API Gemini
        async function askGemini(homework) {
            const prompt = `Tu es un assistant éducatif bienveillant. Aide l'élève avec ce devoir :

📚 Matière : ${homework.subject}
📝 Consigne : ${homework.content}

Donne une réponse structurée avec :
1. 🎯 Explication du sujet
2. 💡 Conseils méthodologiques
3. 📖 Ressources fiables
4. ✅ Points clés à retenir

Sois pédagogue et encourageant !`;
            
            console.log(`\n🤖 Consultation de l'IA pour : ${homework.subject}...`);
            
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
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Erreur HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
                }
                
                const data = await response.json();
                const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || '❌ Aucune réponse';
                return answer;
                
            } catch (error) {
                console.error('❌ Erreur API:', error);
                return `❌ Erreur : ${error.message}`;
            }
        }

        // Affichage formaté dans la console
        function displayHomeworks(homeworks) {
            console.log('\n📚 ====== DEVOIRS EXTRAITS ======\n');
            
            homeworks.forEach(hw => {
                const status = hw.isCompleted ? '✅ FAIT' : '⏳ À FAIRE';
                console.log(`\n${status} | Devoir #${hw.index}`);
                console.log(`📌 Matière : ${hw.subject}`);
                console.log(`📅 ${hw.dateInfo}`);
                console.log(`📝 Consigne :\n${hw.content}`);
                console.log('─'.repeat(60));
            });
            
            console.log(`\n✨ Total : ${homeworks.length} devoir(s) trouvé(s)\n`);
        }

        // Menu interactif
        function showMenu(homeworks) {
            console.log('\n🎯 ====== MENU ======');
            console.log('Tape une commande dans la console :');
            console.log('');
            console.log('📋 liste()          - Réafficher tous les devoirs');
            console.log('🤖 aide(N)          - Demander de l\'aide IA pour le devoir #N');
            console.log('📊 stats()          - Voir les statistiques');
            console.log('💾 export()         - Exporter en JSON');
            console.log('');
            
            // Création des fonctions globales
            window.liste = () => displayHomeworks(homeworks);
            
            window.aide = async (num) => {
                const hw = homeworks.find(h => h.index === num);
                if (!hw) {
                    console.error(`❌ Devoir #${num} introuvable`);
                    return;
                }
                
                const response = await askGemini(hw);
                if (response) {
                    console.log(`\n🤖 ====== RÉPONSE IA - ${hw.subject} ======\n`);
                    console.log(response);
                    console.log('\n' + '='.repeat(60) + '\n');
                }
            };
            
            window.stats = () => {
                const total = homeworks.length;
                const completed = homeworks.filter(h => h.isCompleted).length;
                const remaining = total - completed;
                const subjects = [...new Set(homeworks.map(h => h.subject))];
                
                console.log('\n📊 ====== STATISTIQUES ======');
                console.log(`📚 Total de devoirs : ${total}`);
                console.log(`✅ Devoirs faits : ${completed}`);
                console.log(`⏳ Devoirs restants : ${remaining}`);
                console.log(`📖 Matières : ${subjects.join(', ')}`);
                console.log(`📈 Progression : ${Math.round((completed/total)*100)}%`);
                console.log('');
            };
            
            window.export = () => {
                const json = JSON.stringify(homeworks, null, 2);
                console.log('\n💾 ====== EXPORT JSON ======\n');
                console.log(json);
                console.log('\n✅ Copie ce JSON pour le sauvegarder');
            };
        }

        // Exécution principale
        const homeworks = extractHomeworks();
        
        if (homeworks.length === 0) {
            console.error('❌ Aucun devoir trouvé sur cette page.');
            console.log('Assure-toi d\'être sur la bonne page (avec les éléments .detailed-task)');
            return;
        }
        
        displayHomeworks(homeworks);
        showMenu(homeworks);
        
        console.log('✅ Assistant prêt ! Utilise les commandes ci-dessus.\n');
        
        // Auto-aide si demandé
        const autoHelp = confirm('Veux-tu que l\'IA t\'aide automatiquement pour tous les devoirs à faire ?');
        if (autoHelp) {
            const todoTasks = homeworks.filter(h => !h.isCompleted);
            console.log(`\n🚀 Lancement de l'aide IA pour ${todoTasks.length} devoir(s)...\n`);
            
            for (const hw of todoTasks) {
                const response = await askGemini(hw);
                if (response) {
                    console.log(`\n${'='.repeat(60)}`);
                    console.log(`🤖 AIDE - ${hw.subject}`);
                    console.log('='.repeat(60) + '\n');
                    console.log(response);
                    console.log('\n');
                }
            }
            
            console.log('✅ Toutes les aides IA ont été générées !');
        }
    }
})();