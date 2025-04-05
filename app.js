document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('fileInput');
    const fileSelect = document.getElementById('fileSelect');
    const statusElement = document.getElementById('status');

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
                // Envoyer le fichier JSON à l'agent Azure AI
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

    // Fonction pour créer et afficher un popup avec le résultat de l'analyse
    function showAnalysisPopup(analysisContent) {
        // Supprimer tout popup existant
        const existingPopup = document.getElementById('analysis-popup');
        if (existingPopup) {
            existingPopup.remove();
        }
        
        // Créer un élément div pour le popup
        const popup = document.createElement('div');
        popup.id = 'analysis-popup';
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: white;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            padding: 20px;
            width: 80%;
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 1000;
        `;
        
        // Créer l'en-tête du popup
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            border-bottom: 2px solid #f5ba13;
            padding-bottom: 10px;
        `;
        
        // Titre du popup
        const title = document.createElement('h2');
        title.textContent = 'Résultat de l\'analyse';
        title.style.cssText = `
            margin: 0;
            color: #333;
            font-family: 'Montserrat', sans-serif;
        `;
        
        // Bouton fermer
        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.cssText = `
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #333;
        `;
        closeButton.onclick = () => popup.remove();
        
        header.appendChild(title);
        header.appendChild(closeButton);
        
        // Contenu du rapport
        const content = document.createElement('div');
        
        // Formatage du texte pour un affichage agréable
        const formattedContent = analysisContent
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, '<br>')
            .replace(/⚠️/g, '<span style="color: #ff4500; font-size: 1.2em;">⚠️</span>')
            .replace(/✓/g, '<span style="color: #008000; font-size: 1.2em;">✓</span>');
        
        content.innerHTML = formattedContent;
        content.style.cssText = `
            font-family: 'Montserrat', sans-serif;
            line-height: 1.6;
            color: #333;
            white-space: pre-wrap;
        `;
        
        // Bouton pour télécharger le rapport
        const downloadButton = document.createElement('button');
        downloadButton.textContent = 'Télécharger le rapport';
        downloadButton.style.cssText = `
            display: block;
            margin: 20px auto 0;
            padding: 10px 20px;
            background-color: #f5ba13;
            color: white;
            border: none;
            border-radius: 50px;
            cursor: pointer;
            font-family: 'Montserrat', sans-serif;
            font-weight: bold;
        `;
        downloadButton.onclick = () => {
            const blob = new Blob([analysisContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rapport_analyse_${new Date().toISOString().slice(0, 10)}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
        
        // Ajouter les éléments au popup
        popup.appendChild(header);
        popup.appendChild(content);
        popup.appendChild(downloadButton);
        
        // Ajouter le popup au document
        document.body.appendChild(popup);
        
        // Ajouter l'overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 999;
        `;
        overlay.onclick = () => {
            overlay.remove();
            popup.remove();
        };
        document.body.appendChild(overlay);
    }

    // Fonction pour envoyer le fichier JSON à l'agent Azure AI
    async function sendJsonToAzureAgent(file) {
        try {
            updateStatus('Envoi du fichier à l\'agent pour analyse...', 'info');
            // Créer un FormData pour envoyer uniquement le fichier
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
                updateStatus(`Traitement terminé avec succès`, 'success');

                // Afficher le résultat de l'analyse dans un popup
                if (result.analysis) {
                    showAnalysisPopup(result.analysis);
                }
            } else {
                updateStatus(`Erreur: ${result.error}`, 'error');
            }
        } catch (error) {
            updateStatus(`Erreur lors du traitement: ${error.message}`, 'error');
            console.error('Erreur:', error);
        }
    }
});