/**
 * Module d'intégration avec Azure AI Foundry
 * Ce module utilise une approche par API REST pour contourner les problèmes d'authentification
 */
const axios = require('axios');
const fs = require('fs');
const authConfig = require('./setup_auth');

class AzureAIConnector {
    constructor(config = {}) {
        // Récupération de la configuration d'authentification
        this.apiKey = config.apiKey || authConfig.apiKey;
        this.connectionString = config.connectionString || authConfig.connectionString;
        this.agentId = config.agentId || authConfig.agentId;
        this.threadId = config.threadId || authConfig.threadId;
        
        // Parsing de la chaîne de connexion
        const [region, subscriptionId, resourceGroup, workspace] = this.connectionString.split(';');
        
        // Construction des URLs pour l'API
        this.baseUrl = `https://${region}`;
        this.subscriptionId = subscriptionId;
        this.resourceGroup = resourceGroup;
        this.workspace = workspace;
        
        console.log('Connecteur Azure AI configuré');
    }

    /**
     * Analyse une conversation via l'API Azure AI Foundry
     * @param {Object} jsonData - Les données de conversation au format JSON
     * @returns {Promise<Object>} - Résultat de l'analyse
     */
    async analyzeConversation(jsonData) {
        try {
            // Débogage - sauvegarder la structure JSON reçue pour analyse
            const debugFile = `${__dirname}/debug_json_${Date.now()}.json`;
            fs.writeFileSync(debugFile, JSON.stringify(jsonData, null, 2));
            console.log(`Structure JSON sauvegardée pour débogage dans: ${debugFile}`);
            
            console.log('Début de l\'analyse avec Azure AI Foundry');
            
            // Utiliser une approche double pour l'authentification
            const headers = {
                'api-key': this.apiKey,
                'Content-Type': 'application/json',
            };
            
            // URL correcte pour l'API Azure OpenAI
            // La chaîne de connexion est : "swedencentral.api.azureml.ms;09134cae-5522-4a7f-9f41-2a860de20aa6;hackathon-1023;aiproject-1023"
            // Utilisez l'URL de base Azure OpenAI standard
            const endpoint = `https://${this.workspace}.openai.azure.com/openai/deployments/gpt-4/chat/completions?api-version=2023-05-15`;
            
            console.log(`Tentative de connexion à: ${endpoint}`);
            
            // Essayons d'abord une URL alternative si la première échoue
            try {
                // Construction du prompt pour l'analyse
                const prompt = `Vous êtes un expert en détection de harcèlement. Analysez la conversation suivante qui est au format JSON et identifiez s'il y a des signes de harcèlement ou de comportements problématiques. Vous devez rédiger un rapport détaillé en français. Voici la conversation à analyser:
                
                ${JSON.stringify(jsonData, null, 2)}`;
                
                // Envoi de la requête à l'API
                console.log('Envoi de la requête à l\'API...');
                const response = await axios.post(endpoint, {
                    messages: [
                        { role: "system", content: "Vous êtes Vidocq_mini, un assistant spécialisé dans la détection de harcèlement et l'analyse de conversations problématiques." },
                        { role: "user", content: prompt }
                    ],
                    max_tokens: 2000,
                    temperature: 0.7
                }, { headers });
                
                // Extraction de la réponse
                const analysisText = response.data.choices[0].message.content;
                console.log('Réponse reçue de l\'API');
                
                return {
                    success: true,
                    data: response.data,
                    analysis: analysisText
                };
            } catch (error) {
                // Si la première URL échoue, essayons une URL alternative
                console.log('La première URL a échoué, essai avec une URL alternative...');
                
                // URL alternative - utilisation directe de l'API Azure ML
                const altEndpoint = `https://swedencentral.api.azureml.ms/openai/deployments/gpt-4/chat/completions?api-version=2023-05-15`;
                console.log(`Tentative avec URL alternative: ${altEndpoint}`);
                
                const altResponse = await axios.post(altEndpoint, {
                    messages: [
                        { role: "system", content: "Vous êtes Vidocq_mini, un assistant spécialisé dans la détection de harcèlement et l'analyse de conversations problématiques." },
                        { role: "user", content: `Analysez la conversation suivante et identifiez tout signe de harcèlement: ${JSON.stringify(jsonData, null, 2)}` }
                    ],
                    max_tokens: 2000,
                    temperature: 0.7
                }, { headers });
                
                const altAnalysisText = altResponse.data.choices[0].message.content;
                console.log('Réponse reçue de l\'API alternative');
                
                return {
                    success: true,
                    data: altResponse.data,
                    analysis: altAnalysisText
                };
            }
            
        } catch (error) {
            console.error('Erreur lors de la communication avec Azure AI:', error.message);
            if (error.response) {
                console.error('Réponse d\'erreur:', error.response.status);
                console.error('Détails:', error.response.data);
            } else if (error.request) {
                console.error('Aucune réponse reçue');
            }
            
            // Utilisation de la méthode de fallback avec analyse locale
            console.log('Utilisation de l\'analyse locale de fallback');
            const fallbackAnalysis = this.performFallbackAnalysis(jsonData);
            
            return {
                success: true,
                data: { fallback: true },
                analysis: fallbackAnalysis
            };
        }
    }

    /**
     * Méthode de secours pour analyser les données JSON localement en cas d'échec de l'API
     * @param {Object} jsonData - Les données JSON à analyser
     * @returns {String} - Résultat de l'analyse
     */
    performFallbackAnalysis(jsonData) {
        try {
            // Analyse simplifiée des conversations pour détecter les signes potentiels de harcèlement
            let analysisResult = "RAPPORT D'ANALYSE DE CONVERSATION (ANALYSE LOCALE DE SECOURS)\n\n";
            
            // Logique améliorée pour détecter le format correct des données
            // Afficher la structure reçue pour le débogage
            analysisResult += `Structure des données reçue:\n`;
            analysisResult += `- Type: ${typeof jsonData}\n`;
            
            if (typeof jsonData === 'object') {
                analysisResult += `- Est un tableau: ${Array.isArray(jsonData)}\n`;
                if (Array.isArray(jsonData)) {
                    analysisResult += `- Longueur du tableau: ${jsonData.length}\n`;
                    if (jsonData.length > 0) {
                        analysisResult += `- Type du premier élément: ${typeof jsonData[0]}\n\n`;
                    }
                } else {
                    // C'est un objet mais pas un tableau
                    const keys = Object.keys(jsonData);
                    analysisResult += `- Clés principales: ${keys.join(', ')}\n\n`;
                }
            }
            
            // Extraction des messages selon différents formats possibles
            let messages = [];
            
            // Cas 1: Tableau direct de messages
            if (Array.isArray(jsonData)) {
                messages = jsonData;
            } 
            // Cas 2: Propriété "messages" contenant un tableau
            else if (jsonData.messages && Array.isArray(jsonData.messages)) {
                messages = jsonData.messages;
            } 
            // Cas 3: Propriété "conversation" contenant un tableau
            else if (jsonData.conversation && Array.isArray(jsonData.conversation)) {
                messages = jsonData.conversation;
            } 
            // Cas 4: Propriété "data" contenant un tableau
            else if (jsonData.data && Array.isArray(jsonData.data)) {
                messages = jsonData.data;
            }
            // Cas 5: Structure non reconnue, on tente de traiter chaque clé comme un message
            else if (typeof jsonData === 'object') {
                Object.entries(jsonData).forEach(([key, value]) => {
                    if (typeof value === 'string') {
                        messages.push({ user: key, content: value });
                    } else if (typeof value === 'object') {
                        messages.push(value);
                    }
                });
            }
            
            if (messages.length > 0) {
                analysisResult += `Nombre de messages analysés: ${messages.length}\n\n`;
                
                // Mots et expressions qui peuvent indiquer du harcèlement
                const harcelementKeywords = [
                    "idiot", "stupide", "nul", "con", "débile", "moche", "laid", "gros", "grosse", 
                    "ferme ta gueule", "ta gueule", "suicide", "tue-toi", "va mourir", "menace", 
                    "frapper", "battre", "violence", "harcèlement", "insulte", "harceler", "persécuter",
                    "intimidation", "intimidate", "humilier", "humiliation", "ridiculiser", "menacer",
                    "pute", "salope", "connard", "connasse", "pd", "pédé", "lopette", "tapette", "enculé"
                ];
                
                // Analyse des messages
                let problematicMessages = [];
                
                messages.forEach((message, index) => {
                    // Extraction du contenu selon les différents formats possibles
                    let content = "";
                    
                    if (typeof message === 'string') {
                        content = message;
                    } else if (typeof message === 'object') {
                        content = message.content || message.text || message.message || 
                                message.body || message.value || JSON.stringify(message);
                    }
                    
                    // Vérifier les mots clés problématiques si on a du contenu
                    if (content && typeof content === 'string') {
                        const lowerContent = content.toLowerCase();
                        const foundKeywords = harcelementKeywords.filter(keyword => 
                            lowerContent.includes(keyword.toLowerCase())
                        );
                        
                        if (foundKeywords.length > 0) {
                            problematicMessages.push({
                                index,
                                content,
                                keywords: foundKeywords
                            });
                        }
                    }
                });
                
                // Résultats
                if (problematicMessages.length > 0) {
                    analysisResult += "⚠️ SIGNES POTENTIELS DE HARCÈLEMENT DÉTECTÉS ⚠️\n\n";
                    analysisResult += `${problematicMessages.length} message(s) problématique(s) identifié(s):\n\n`;
                    
                    problematicMessages.forEach(msg => {
                        analysisResult += `- Message #${msg.index + 1}:\n`;
                        analysisResult += `  Contenu: "${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}"\n`;
                        analysisResult += `  Termes problématiques détectés: ${msg.keywords.join(', ')}\n\n`;
                    });
                    
                    analysisResult += "CONCLUSION: Cette conversation présente des signes de harcèlement qui méritent attention.\n";
                    analysisResult += "RECOMMANDATION: Vérification humaine recommandée pour évaluer la gravité de la situation.\n";
                } else {
                    analysisResult += "✓ AUCUN SIGNE ÉVIDENT DE HARCÈLEMENT DÉTECTÉ\n\n";
                    analysisResult += "CONCLUSION: L'analyse automatique locale n'a pas identifié de signes évidents de harcèlement.\n";
                    analysisResult += "REMARQUE: Cette analyse est limitée et ne remplace pas une évaluation humaine complète.\n";
                }
            } else {
                analysisResult += "Aucun message n'a pu être extrait des données JSON fournies.\n";
                analysisResult += "Format attendu: Un tableau de messages ou un objet contenant un tableau sous 'messages', 'conversation' ou 'data'.\n";
                analysisResult += "Exemple de structure valide: [{\"user\":\"user1\",\"content\":\"Message 1\"}, {\"user\":\"user2\",\"content\":\"Message 2\"}]\n";
                analysisResult += "ou {\"messages\": [{\"user\":\"user1\",\"content\":\"Message 1\"}, {\"user\":\"user2\",\"content\":\"Message 2\"}]}\n";
            }
            
            analysisResult += "\nNOTE: Cette analyse a été générée par un système de secours local suite à l'indisponibilité de l'API Azure AI.\n";
            
            return analysisResult;
        } catch (error) {
            console.error('Erreur lors de l\'analyse locale:', error);
            return "Impossible d'effectuer l'analyse locale des données. Erreur du système: " + error.message;
        }
    }

    /**
     * Sauvegarde le résultat de l'analyse dans un fichier
     * @param {String} content - Le contenu de l'analyse
     * @param {String} outputPath - Le chemin où sauvegarder le fichier
     * @returns {Promise<String>} - Le chemin du fichier sauvegardé
     */
    async saveAnalysisResult(content, outputPath) {
        return new Promise((resolve, reject) => {
            fs.writeFile(outputPath, content, 'utf8', (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(outputPath);
                }
            });
        });
    }
}

module.exports = AzureAIConnector;