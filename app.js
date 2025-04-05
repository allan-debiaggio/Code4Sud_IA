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
            padding: 30px;
            width: 90%;
            max-width: 800px;
            max-height: 85vh;
            overflow-y: auto;
            z-index: 1000;
        `;
        
        // Créer l'en-tête du popup
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 3px solid #A8D5BA;
            padding-bottom: 15px;
        `;
        
        // Titre du popup
        const title = document.createElement('h2');
        title.textContent = 'Résultat de l\'analyse';
        title.style.cssText = `
            margin: 0;
            color: #333;
            font-family: 'Montserrat', sans-serif;
            font-size: 24px;
            font-weight: 700;
        `;
        
        // Bouton fermer
        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.cssText = `
            background: none;
            border: none;
            font-size: 28px;
            cursor: pointer;
            color: #333;
            transition: all 0.2s ease;
        `;
        closeButton.onmouseover = () => {
            closeButton.style.color = '#A8D5BA';
        };
        closeButton.onmouseout = () => {
            closeButton.style.color = '#333';
        };
        closeButton.onclick = () => {
            popup.remove();
            overlay.remove();
            // Réinitialiser le champ de fichier pour permettre une nouvelle analyse
            resetFileInput();
        };
        
        header.appendChild(title);
        header.appendChild(closeButton);

        // Extraction des sections du texte pour un meilleur formatage
        let sections = parseAnalysisContent(analysisContent);
        
        // Conteneur principal du contenu
        const contentContainer = document.createElement('div');
        contentContainer.style.cssText = `
            font-family: 'Montserrat', sans-serif;
        `;
        
        // Créer une carte pour le résumé s'il existe
        if (sections.summary) {
            const summaryCard = createSummaryCard(sections.summary);
            contentContainer.appendChild(summaryCard);
        }
        
        // Créer une carte pour le niveau de harcèlement s'il existe
        if (sections.level) {
            const levelCard = createLevelCard(sections.level);
            contentContainer.appendChild(levelCard);
        }
        
        // Créer une carte pour les détails s'ils existent
        if (sections.details) {
            const detailsCard = createDetailsCard(sections.details);
            contentContainer.appendChild(detailsCard);
        }
        
        // Créer une carte pour la conclusion s'elle existe
        if (sections.conclusion) {
            const conclusionCard = createConclusionCard(sections.conclusion);
            contentContainer.appendChild(conclusionCard);
        }
        
        // Créer une carte pour les recommandations si elles existent
        if (sections.recommendation) {
            const recommendationCard = createRecommendationCard(sections.recommendation);
            contentContainer.appendChild(recommendationCard);
        }
        
        // Si aucune section n'a été créée, afficher le texte brut formaté
        if (!sections.summary && !sections.level && !sections.details && !sections.conclusion && !sections.recommendation) {
            const rawContent = document.createElement('div');
            const formattedRawContent = analysisContent
                .replace(/\n\n/g, '<br><br>')
                .replace(/\n/g, '<br>')
                .replace(/⚠️/g, '<span style="color: #ff4500; font-size: 1.2em;">⚠️</span>')
                .replace(/✓/g, '<span style="color: #008000; font-size: 1.2em;">✓</span>');
            
            rawContent.innerHTML = formattedRawContent;
            rawContent.style.cssText = `
                line-height: 1.6;
                color: #333;
                background-color: #f9f9f9;
                padding: 15px;
                border-radius: 10px;
                border-left: 4px solid #A8D5BA;
                margin-bottom: 20px;
            `;
            contentContainer.appendChild(rawContent);
        }

        // Bouton pour télécharger le rapport
        const downloadButton = document.createElement('button');
        downloadButton.textContent = 'Télécharger le rapport';
        downloadButton.style.cssText = `
            display: block;
            margin: 25px auto 0;
            padding: 12px 24px;
            background: linear-gradient(135deg, #A8D5BA 0%, #32c26c 100%);
            color: white;
            border: none;
            border-radius: 50px;
            cursor: pointer;
            font-family: 'Montserrat', sans-serif;
            font-weight: bold;
            font-size: 16px;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        `;
        downloadButton.onmouseover = () => {
            downloadButton.style.transform = 'translateY(-2px)';
            downloadButton.style.boxShadow = '0 6px 15px rgba(0, 0, 0, 0.15)';
        };
        downloadButton.onmouseout = () => {
            downloadButton.style.transform = 'translateY(0)';
            downloadButton.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.1)';
        };
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
        popup.appendChild(contentContainer);
        popup.appendChild(downloadButton);

        // Ajouter le popup au document
        document.body.appendChild(popup);

        // Ajouter l'overlay
        const overlay = document.createElement('div');
        overlay.id = 'analysis-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(3px);
            z-index: 999;
            transition: opacity 0.3s ease;
        `;
        overlay.onclick = () => {
            overlay.remove();
            popup.remove();
            // Réinitialiser le champ de fichier pour permettre une nouvelle analyse
            resetFileInput();
        };
        document.body.appendChild(overlay);
    }

    // Fonction pour analyser le contenu du texte et extraire les différentes sections
    function parseAnalysisContent(content) {
        const sections = {
            summary: null,
            level: null,
            details: null,
            conclusion: null,
            recommendation: null
        };
        
        // Détecter le niveau de harcèlement basé sur les symboles ou mots-clés
        if (content.includes('AUCUN SIGNE') || content.includes('✓')) {
            sections.level = {
                text: 'AUCUN SIGNE DE HARCÈLEMENT DÉTECTÉ',
                severity: 'none'
            };
        } else if (content.includes('SIGNES LÉGERS') || content.includes('SIGNES LEGERS')) {
            sections.level = {
                text: 'SIGNES LÉGERS DE HARCÈLEMENT DÉTECTÉS',
                severity: 'light'
            };
        } else if (content.includes('SIGNES MODÉRÉS') || content.includes('SIGNES MODERES')) {
            sections.level = {
                text: 'SIGNES MODÉRÉS DE HARCÈLEMENT DÉTECTÉS',
                severity: 'moderate'
            };
        } else if (content.includes('SIGNES SÉVÈRES') || content.includes('SIGNES SEVERES')) {
            sections.level = {
                text: 'SIGNES SÉVÈRES DE HARCÈLEMENT DÉTECTÉS',
                severity: 'severe'
            };
        } else if (content.includes('HARCÈLEMENT GRAVE')) {
            sections.level = {
                text: 'HARCÈLEMENT GRAVE DÉTECTÉ',
                severity: 'critical'
            };
        } else if (content.includes('SIGNES DE HARCÈLEMENT') || content.includes('SIGNES DE HARCELEMENT')) {
            sections.level = {
                text: 'SIGNES DE HARCÈLEMENT DÉTECTÉS',
                severity: 'moderate'
            };
        }
        
        // Extraire les détails du rapport
        const messageMatch = content.match(/(\d+) message\(s\) problématique\(s\) identifié\(s\)[\s\S]*?(CONCLUSION|$)/i);
        if (messageMatch) {
            sections.details = messageMatch[0].replace(/CONCLUSION.*$/, '').trim();
        } else if (content.includes('message') && content.includes('problématique')) {
            // Essayer d'extraire une autre forme de détails
            const linesArray = content.split('\n');
            const detailsArray = [];
            let inDetailsSection = false;
            
            for (const line of linesArray) {
                if (line.includes('message') && line.includes('problématique') && !inDetailsSection) {
                    inDetailsSection = true;
                    detailsArray.push(line);
                } else if (inDetailsSection && (line.includes('CONCLUSION') || line.includes('RECOMMANDATION'))) {
                    inDetailsSection = false;
                } else if (inDetailsSection) {
                    detailsArray.push(line);
                }
            }
            
            if (detailsArray.length > 0) {
                sections.details = detailsArray.join('\n');
            }
        }
        
        // Extraire la conclusion
        const conclusionMatch = content.match(/CONCLUSION[:\s]+([\s\S]*?)(?=RECOMMANDATION|$)/i);
        if (conclusionMatch && conclusionMatch[1]) {
            sections.conclusion = conclusionMatch[1].trim();
        }
        
        // Extraire les recommandations
        const recommendationMatch = content.match(/RECOMMANDATION[:\s]+([\s\S]*?)(?=NOTE|$)/i);
        if (recommendationMatch && recommendationMatch[1]) {
            sections.recommendation = recommendationMatch[1].trim();
        }
        
        // Extraire le résumé (première partie du rapport avant les détails)
        const reportMatch = content.match(/RAPPORT D['']ANALYSE DE CONVERSATION\s*\n\s*\n([\s\S]*?)(?=Nombre de messages|CONCLUSION|RECOMMANDATION|$)/i);
        if (reportMatch && reportMatch[1]) {
            sections.summary = reportMatch[1].trim();
            // Si le résumé contient uniquement le niveau déjà détecté, ne pas le dupliquer
            if (sections.level && sections.summary === sections.level.text) {
                sections.summary = null;
            }
        }
        
        return sections;
    }
    
    // Fonction pour créer la carte de résumé
    function createSummaryCard(summaryText) {
        const card = document.createElement('div');
        card.style.cssText = `
            background-color: #f3f9f4;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 16px;
            border-left: 5px solid #A8D5BA;
        `;
        
        const title = document.createElement('h3');
        title.textContent = 'Résumé';
        title.style.cssText = `
            margin-top: 0;
            margin-bottom: 10px;
            color: #2a6041;
            font-size: 18px;
            font-weight: 600;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            color: #333;
            line-height: 1.5;
        `;
        content.textContent = summaryText;
        
        card.appendChild(title);
        card.appendChild(content);
        return card;
    }
    
    // Fonction pour créer la carte de niveau de harcèlement
    function createLevelCard(levelInfo) {
        const card = document.createElement('div');
        
        // Appliquer un style différent selon la gravité
        let bgColor = '#e8f5e9'; // Couleur par défaut (vert clair)
        let borderColor = '#4caf50'; // Couleur par défaut (vert)
        let iconHtml = '✓';
        let iconColor = '#2e7d32';
        
        switch(levelInfo.severity) {
            case 'none':
                bgColor = '#e8f5e9';
                borderColor = '#4caf50';
                iconHtml = '✓';
                iconColor = '#2e7d32';
                break;
            case 'light':
                bgColor = '#fff8e1';
                borderColor = '#ffc107';
                iconHtml = '⚠️';
                iconColor = '#ff9800';
                break;
            case 'moderate':
                bgColor = '#fff3e0';
                borderColor = '#ff9800';
                iconHtml = '⚠️';
                iconColor = '#e65100';
                break;
            case 'severe':
                bgColor = '#fbe9e7';
                borderColor = '#ff5722';
                iconHtml = '⚠️⚠️';
                iconColor = '#bf360c';
                break;
            case 'critical':
                bgColor = '#ffebee';
                borderColor = '#f44336';
                iconHtml = '⚠️⚠️⚠️';
                iconColor = '#b71c1c';
                break;
        }
        
        card.style.cssText = `
            background-color: ${bgColor};
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            border-left: 5px solid ${borderColor};
            display: flex;
            align-items: center;
        `;
        
        // Icône
        const icon = document.createElement('div');
        icon.style.cssText = `
            font-size: 24px;
            margin-right: 15px;
            color: ${iconColor};
        `;
        icon.innerHTML = iconHtml;
        
        // Texte
        const content = document.createElement('div');
        content.style.cssText = `
            flex: 1;
        `;
        
        const levelTitle = document.createElement('h3');
        levelTitle.textContent = levelInfo.text;
        levelTitle.style.cssText = `
            margin: 0;
            color: ${iconColor};
            font-weight: 700;
            font-size: 18px;
        `;
        
        content.appendChild(levelTitle);
        card.appendChild(icon);
        card.appendChild(content);
        
        return card;
    }
    
    // Fonction pour créer la carte de détails
    function createDetailsCard(detailsText) {
        const card = document.createElement('div');
        card.style.cssText = `
            background-color: #f5f5f5;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 16px;
        `;
        
        const title = document.createElement('h3');
        title.textContent = 'Détails de l\'analyse';
        title.style.cssText = `
            margin-top: 0;
            margin-bottom: 10px;
            color: #333;
            font-size: 18px;
            font-weight: 600;
        `;
        
        const content = document.createElement('div');
        
        // Formater le texte des détails pour un meilleur affichage
        const formattedDetails = detailsText
            .replace(/- Message #(\d+):/g, '<strong>Message #$1:</strong>')
            .replace(/Contenu: "(.*?)"/g, '<div class="message-content">$1</div>')
            .replace(/Termes problématiques détectés: (.*)/g, '<div class="keywords">Termes détectés: <span style="color:#cc0000">$1</span></div>');
        
        content.style.cssText = `
            color: #333;
            line-height: 1.5;
        `;
        
        content.innerHTML = formattedDetails;
        
        // Appliquer des styles aux classes créées
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .message-content {
                background-color: white;
                padding: 10px;
                border-radius: 8px;
                margin: 8px 0;
                font-style: italic;
                border-left: 3px solid #A8D5BA;
            }
            .keywords {
                margin-bottom: 15px;
                font-size: 0.9em;
            }
        `;
        document.head.appendChild(styleElement);
        
        card.appendChild(title);
        card.appendChild(content);
        return card;
    }
    
    // Fonction pour créer la carte de conclusion
    function createConclusionCard(conclusionText) {
        const card = document.createElement('div');
        card.style.cssText = `
            background-color: #e3f2fd;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 16px;
            border-left: 5px solid #1976d2;
        `;
        
        const title = document.createElement('h3');
        title.textContent = 'Conclusion';
        title.style.cssText = `
            margin-top: 0;
            margin-bottom: 10px;
            color: #0d47a1;
            font-size: 18px;
            font-weight: 600;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            color: #333;
            line-height: 1.5;
        `;
        content.textContent = conclusionText;
        
        card.appendChild(title);
        card.appendChild(content);
        return card;
    }
    
    // Fonction pour créer la carte de recommandation
    function createRecommendationCard(recommendationText) {
        const card = document.createElement('div');
        
        // Détecter le niveau d'urgence de la recommandation
        let urgencyLevel = 'normal';
        if (recommendationText.includes('immédiate') || 
            recommendationText.includes('URGENCE') || 
            recommendationText.includes('3018')) {
            urgencyLevel = 'high';
        }
        
        const bgColor = urgencyLevel === 'high' ? '#ffebee' : '#f1f8e9';
        const borderColor = urgencyLevel === 'high' ? '#f44336' : '#8bc34a';
        const titleColor = urgencyLevel === 'high' ? '#c62828' : '#33691e';
        
        card.style.cssText = `
            background-color: ${bgColor};
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 16px;
            border-left: 5px solid ${borderColor};
        `;
        
        const title = document.createElement('h3');
        title.textContent = 'Recommandation';
        title.style.cssText = `
            margin-top: 0;
            margin-bottom: 10px;
            color: ${titleColor};
            font-size: 18px;
            font-weight: 600;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            color: #333;
            line-height: 1.5;
            ${urgencyLevel === 'high' ? 'font-weight: bold;' : ''}
        `;
        content.textContent = recommendationText;
        
        card.appendChild(title);
        card.appendChild(content);
        return card;
    }

    // Fonction pour envoyer le fichier JSON à l'agent Azure AI
    async function sendJsonToAzureAgent(file) {
        try {
            updateStatus('Analyse de la conversation en cours...', 'info');
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