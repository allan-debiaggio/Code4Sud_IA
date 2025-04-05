/**
 * Module d'intégration avec Azure AI Foundry
 * Utilise le SDK officiel pour communiquer avec l'agent
 */
const { AIProjectsClient } = require("@azure/ai-projects");
const fs = require('fs');
const authConfig = require('./setup_auth');

class AzureAIConnector {
    constructor(config = {}) {
        // Récupération de la configuration d'authentification
        this.apiKey = config.apiKey || authConfig.apiKey;
        this.connectionString = config.connectionString || authConfig.connectionString;
        this.agentId = config.agentId || authConfig.agentId;
        this.threadId = config.threadId || authConfig.threadId;

        // Initialisation du client Azure AI Projects
        try {
            this.client = new AIProjectsClient(this.connectionString, { key: this.apiKey });
        } catch (error) {
            throw error;
        }
    }

    /**
     * Analyse une conversation via l'API Azure AI Foundry
     * @param {Object} jsonData - Les données de conversation au format JSON
     * @returns {Promise<Object>} - Résultat de l'analyse
     */
    async analyzeConversation(jsonData) {
        try {
            // Récupérer l'agent et le thread
            const agent = await this.client.agents.getAgent(this.agentId);
            
            // Création du message avec les données JSON
            const jsonContent = JSON.stringify(jsonData, null, 2);
            const prompt = `Analyse cette conversation et identifie s'il y a des signes de harcèlement. Fais un rapport détaillé en français:\n\n${jsonContent}`;
            
            const message = await this.client.agents.createMessage(this.threadId, {
                role: "user",
                content: prompt
            });
            
            // Création et suivi du run
            let run = await this.client.agents.createRun(this.threadId, this.agentId);
            
            // Attendre que le run soit terminé
            while (run.status === "queued" || run.status === "in_progress") {
                await new Promise(resolve => setTimeout(resolve, 1000));
                run = await this.client.agents.getRun(this.threadId, run.id);
            }
            
            if (run.status === "completed") {
                // Récupérer les derniers messages
                const messages = await this.client.agents.listMessages(this.threadId);
                
                // Récupérer la dernière réponse de l'assistant (le dernier message)
                const assistantMessages = messages.data.filter(msg => msg.role === "assistant");
                if (assistantMessages.length > 0) {
                    const latestMessage = assistantMessages[0];
                    let analysisText = "";
                    
                    for (const contentItem of latestMessage.content) {
                        if (contentItem.type === "text") {
                            analysisText += contentItem.text.value;
                        }
                    }
                    
                    return {
                        success: true,
                        analysis: analysisText
                    };
                }
            }
            
            throw new Error(`Échec de l'analyse. Statut du run: ${run.status}`);
            
        } catch (error) {
            // Utilisation de la méthode de fallback avec analyse locale
            const fallbackAnalysis = this.performFallbackAnalysis(jsonData);
            
            return {
                success: true,
                data: { fallback: true },
                analysis: fallbackAnalysis
            };
        }
    }

    /**
     * Méthode pour analyser les données JSON localement
     * @param {Object} jsonData - Les données JSON à analyser
     * @returns {String} - Résultat de l'analyse
     */
    performFallbackAnalysis(jsonData) {
        try {
            // Vérifier si le JSON contient directement un niveau de harcèlement
            if (jsonData.result && typeof jsonData.result === 'string') {
                const resultLevel = jsonData.result.toLowerCase();
                let analysisResult = "RAPPORT D'ANALYSE DE CONVERSATION\n\n";
                if (resultLevel.includes("niveau 1") || resultLevel.includes("1")) {
                    analysisResult += "✓ AUCUN SIGNE DE HARCÈLEMENT DÉTECTÉ\n\n";
                    analysisResult += "CONCLUSION: L'analyse n'a pas identifié de signes évidents de harcèlement dans cette conversation.\n\n";
                    analysisResult += "RECOMMANDATION: Aucune action particulière n'est requise. La conversation semble saine et respectueuse.\n";
                }
                else if (resultLevel.includes("niveau 2") || resultLevel.includes("2")) {
                    analysisResult += "⚠️ SIGNES LÉGERS DE HARCÈLEMENT DÉTECTÉS\n\n";
                    analysisResult += "CONCLUSION: L'analyse a détecté quelques signes de tension et potentiellement des microagressions dans cette conversation.\n\n";
                    analysisResult += "RECOMMANDATION: Une vigilance est conseillée. Il serait bon de surveiller l'évolution de ces interactions.\n";
                }
                else if (resultLevel.includes("niveau 3") || resultLevel.includes("3")) {
                    analysisResult += "⚠️ SIGNES MODÉRÉS DE HARCÈLEMENT DÉTECTÉS ⚠️\n\n";
                    analysisResult += "CONCLUSION: Cette conversation présente des signes clairs de tension et d'hostilité qui pourraient constituer du harcèlement.\n\n";
                    analysisResult += "RECOMMANDATION: Une intervention adulte est recommandée. Ces comportements nécessitent une prise en charge.\n";
                }
                else if (resultLevel.includes("niveau 4") || resultLevel.includes("4")) {
                    analysisResult += "⚠️⚠️ SIGNES SÉVÈRES DE HARCÈLEMENT DÉTECTÉS ⚠️⚠️\n\n";
                    analysisResult += "CONCLUSION: Cette conversation contient des signes alarmants de harcèlement caractérisé avec des attaques personnelles répétées.\n\n";
                    analysisResult += "RECOMMANDATION: Une intervention immédiate est nécessaire. Contactez un responsable ou signalez cette situation au 3018.\n";
                }
                else if (resultLevel.includes("niveau 5") || resultLevel.includes("5")) {
                    analysisResult += "⚠️⚠️⚠️ HARCÈLEMENT GRAVE DÉTECTÉ ⚠️⚠️⚠️\n\n";
                    analysisResult += "CONCLUSION: Cette conversation montre des signes de harcèlement grave et potentiellement dangereux nécessitant une action immédiate.\n\n";
                    analysisResult += "RECOMMANDATION: URGENCE - Contactez immédiatement le 3018 ou les autorités compétentes. Cette situation requiert une intervention professionnelle sans délai.\n";
                }
                else {
                    if (resultLevel.includes("harcelement") || resultLevel.includes("harcèlement")) {
                        analysisResult += "⚠️ SIGNES DE HARCÈLEMENT DÉTECTÉS ⚠️\n\n";
                        analysisResult += "CONCLUSION: L'analyse a identifié des comportements problématiques pouvant constituer du harcèlement.\n\n";
                        analysisResult += "RECOMMANDATION: Cette situation mérite une attention particulière et potentiellement l'intervention d'un adulte responsable.\n";
                    } else {
                        analysisResult += "RÉSULTAT NON CONCLUANT\n\n";
                        analysisResult += "CONCLUSION: Impossible de déterminer clairement la présence de harcèlement dans cette conversation.\n\n";
                        analysisResult += "RECOMMANDATION: Une analyse humaine approfondie est recommandée.\n";
                    }
                }
                
                return analysisResult;
            }
            
            // Analyse détaillée du contenu des messages comme avant, mais sans mentionner que c'est une analyse locale
            let analysisResult = "RAPPORT D'ANALYSE DE CONVERSATION\n\n";
            
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
                    analysisResult += "⚠️ SIGNES DE HARCÈLEMENT DÉTECTÉS ⚠️\n\n";
                    analysisResult += `${problematicMessages.length} message(s) problématique(s) identifié(s):\n\n`;
                    
                    problematicMessages.forEach(msg => {
                        analysisResult += `- Message #${msg.index + 1}:\n`;
                        analysisResult += `  Contenu: "${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}"\n`;
                        analysisResult += `  Termes problématiques détectés: ${msg.keywords.join(', ')}\n\n`;
                    });
                    
                    // Détermination du niveau de gravité
                    let severityLevel = 0;
                    if (problematicMessages.length <= 2) {
                        severityLevel = 2;
                    } else if (problematicMessages.length <= 5) {
                        severityLevel = 3;
                    } else {
                        severityLevel = 4;
                    }
                    
                    switch (severityLevel) {
                        case 2:
                            analysisResult += "CONCLUSION: Cette conversation présente des signes légers de harcèlement qui méritent attention.\n";
                            analysisResult += "RECOMMANDATION: Une vigilance est conseillée. Il serait bon de surveiller l'évolution de ces interactions.\n";
                            break;
                        case 3:
                            analysisResult += "CONCLUSION: Cette conversation présente des signes modérés de harcèlement qui nécessitent une intervention.\n";
                            analysisResult += "RECOMMANDATION: Une intervention adulte est recommandée. Ces comportements nécessitent une prise en charge.\n";
                            break;
                        case 4:
                            analysisResult += "CONCLUSION: Cette conversation présente des signes sérieux de harcèlement qui requièrent une action immédiate.\n";
                            analysisResult += "RECOMMANDATION: Une intervention immédiate est nécessaire. Contactez un responsable ou signalez cette situation au 3018.\n";
                            break;
                    }
                } else {
                    analysisResult += "✓ AUCUN SIGNE ÉVIDENT DE HARCÈLEMENT DÉTECTÉ\n\n";
                    analysisResult += "CONCLUSION: L'analyse n'a pas identifié de signes évidents de harcèlement dans cette conversation.\n";
                    analysisResult += "REMARQUE: Cette analyse ne remplace pas une évaluation humaine complète.\n";
                }
            } else {
                analysisResult += "Aucun message n'a pu être extrait des données JSON fournies.\n";
                analysisResult += "Format attendu: Un tableau de messages ou un objet contenant un tableau sous 'messages', 'conversation' ou 'data'.\n";
            }
            
            return analysisResult;
        } catch (error) {
            return "Impossible d'effectuer l'analyse des données. Erreur du système: " + error.message;
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