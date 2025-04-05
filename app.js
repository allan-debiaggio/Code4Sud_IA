document.addEventListener('DOMContentLoaded', () => {

    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('fileInput');
    const fileSelect = document.getElementById('fileSelect');
    const statusElement = document.getElementById('status');

    // Suppression du prompt personnalisé car l'agent Azure AI est déjà configuré

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    dropArea.addEventListener('drop', handleDrop, false);
    fileSelect.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', handleFiles, false);

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight() {
        dropArea.classList.add('highlight');
    }

    function unhighlight() {
        dropArea.classList.remove('highlight');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles({target: {files: files}});
    }

    function handleFiles(e) {
        const files = e.target.files;
        if (files.length) {
            processFile(files[0]);
        }
    }

    function processFile(file) {
        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
            updateStatus('Erreur: Veuillez télécharger un fichier JSON', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const jsonData = JSON.parse(e.target.result);

                updateStatus('Succès: Fichier JSON chargé', 'success');
                // Envoyer le fichier JSON à  agent Azure AI
                sendJsonToAzureAgent(file);

            } catch (error) {
                updateStatus('Erreur: Format JSON invalide', 'error');
                console.error('Erreur d\'analyse JSON:', error);
            }
        };
        reader.onerror = function() {
            updateStatus('Erreur: Impossible de lire le fichier', 'error');
            console.error('Erreur de lecture du fichier');
        };
        reader.readAsText(file);
    }

    function updateStatus(message, type) {
        statusElement.textContent = message;
        statusElement.className = type;
    }
    // Fonction pour envoyer le fichier JSON à l'agent Azure AI
    async function sendJsonToAzureAgent(file) {
        try {
            updateStatus('Envoi du fichier à l\'agent pour analyse...', 'info');
            // Créer un FormData pour envoyer uniquement le fichier (sans prompt personnalisé)
            const formData = new FormData();
            formData.append('json_file', file);
            // Appel au serveur backend
            const response = await fetch('/process-json', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Erreur serveur: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                updateStatus(`Traitement terminé avec succès - Analyse effectuée par l'agent Azure AI Foundry`, 'success');
            } else {
                updateStatus(`Erreur: ${result.error}`, 'error');
            }
        } catch (error) {
            updateStatus(`Erreur lors du traitement: ${error.message}`, 'error');
            console.error('Erreur:', error);
        }
    }
});