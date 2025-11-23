chrome.storage.local.get(['apiKey', 'provider'], (result) => {
    if (result.apiKey) {
        document.getElementById('apiKey').value = result.apiKey;
    }
    if (result.provider) {
        document.getElementById('sAPI').value = result.provider;
    }
        console.log('=== DEBUG STORAGE ===');
    console.log('API Key:', result.apiKey);
    console.log('Provider:', result.provider);
});

document.getElementById('saveBtn').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKey').value;
    const provider = document.getElementById('sAPI').value;
    
    if (!provider) {
        alert('Veuillez sélectionner un fournisseur');
        return;
    }
    
    if (apiKey.length < 10) {
        alert('La clé API semble invalide (trop courte)');
        return;
    }
    
    chrome.storage.local.set({ apiKey, provider }, () => {
        alert('Configuration sauvegardée avec succès !');
    });
});
