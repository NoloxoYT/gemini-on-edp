chrome.storage.sync.get(['apiKey'], (result) => {
    if (result.apiKey) {
        document.getElementById('apiKey').value = result.apiKey;
    }
});
document.getElementById('saveBtn').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKey').value;
    
    if (apiKey.length < 10) {
        alert('La clé API semble invalide (trop courte)');
        return;
    }
    
    chrome.storage.sync.set({ apiKey }, () => {
    });
});