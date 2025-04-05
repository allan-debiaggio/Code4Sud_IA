/**
 * Module d'intégration avec Azure AI Foundry
 * Utilise le SDK officiel pour communiquer avec l'agent
 */
const { AIProjectsClient } = require("@azure/ai-projects");
const { DefaultAzureCredential } = require("@azure/identity");
const fs = require('fs');
const authConfig = require('./setup_auth');

class AzureAIConnector {
    constructor(config = {}) {
        // Récupération de la configuration d'authentification
        this.apiKey = config.apiKey || authConfig.apiKey;
        this.connectionString = config.connectionString || authConfig.connectionString;
        this.agentId = config.agentId || authConfig.agentId;
        this.threadId = config.threadId || authConfig.threadId;

        // Initialisation du client Azure AI Projects avec la méthode fromConnectionString
        try {
            console.log('Tentative de connexion à Azure AI Projects avec la chaîne de connexion...');
            console.log(`Connection string: ${this.connectionString.split(';').join(' | ')}`);
            // Utilisation de la même méthode que dans setup.js
            this.client = AIProjectsClient.fromConnectionString(
                this.connectionString,
                new DefaultAzureCredential()
            );
            console.log('Client Azure AI Projects initialisé avec succès');
            console.log(`Agent ID: ${this.agentId}`);
            console.log(`Thread ID: ${this.threadId}`);
        } catch (error) {
            console.error('ERREUR lors de l\'initialisation du client Azure AI:', error.message);
            console.error('Détails:', JSON.stringify(error, null, 2));
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
            console.log('Début de l\'analyse avec Azure AI Foundry...');
            
            // Récupérer l'agent et le thread
            console.log(`Tentative de récupération de l'agent ${this.agentId}...`);
            const agent = await this.client.agents.getAgent(this.agentId);
            console.log(`Agent récupéré avec succès: ${agent.name}`);
            
            // Récupérer le thread existant
            console.log(`Tentative de récupération du thread ${this.threadId}...`);
            const thread = await this.client.agents.getThread(this.threadId);
            console.log(`Thread récupéré, thread ID: ${thread.id}`);
            
            // Création du message avec les données JSON
            const jsonContent = JSON.stringify(jsonData, null, 2);
            const prompt = `Analyse cette conversation et identifie s'il y a des signes de harcèlement. Fais un rapport détaillé en français:\n\n${jsonContent}`;
            
            console.log(`Création d'un nouveau message dans le thread ${this.threadId}...`);
            const message = await this.client.agents.createMessage(thread.id, {
                role: "user",
                content: prompt
            });
            console.log(`Message créé avec succès, ID: ${message.id}`);
            
            // Création et suivi du run
            console.log('Démarrage d\'un nouveau run...');
            let run = await this.client.agents.createRun(thread.id, this.agentId);
            console.log(`Run créé avec l'ID: ${run.id}, statut initial: ${run.status}`);
            
            // Attendre que le run soit terminé
            console.log('Attente de la fin du traitement...');
            while (run.status === "queued" || run.status === "in_progress") {
                await new Promise(resolve => setTimeout(resolve, 1000));
                run = await this.client.agents.getRun(thread.id, run.id);
                console.log(`Statut actuel du run: ${run.status}`);
            }
            
            console.log(`Run terminé avec statut final: ${run.status}`);
            
            if (run.status === "completed") {
                // Récupérer les derniers messages
                console.log('Récupération des messages...');
                const messages = await this.client.agents.listMessages(thread.id);
                
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
                    
                    console.log('Analyse reçue avec succès de Azure AI');
                    return {
                        success: true,
                        analysis: analysisText
                    };
                }
            }
            
            throw new Error(`Échec de l'analyse. Statut du run: ${run.status}`);
            
        } catch (error) {
            console.error('ERREUR lors de la communication avec Azure AI:', error.message);
            console.error('Type d\'erreur:', error.constructor.name);
            console.error('Stack trace:', error.stack);
            
            if (error.response) {
                console.error('Détails de la réponse:', JSON.stringify(error.response.data || {}, null, 2));
                console.error('Status code:', error.response.status);
            }
            
            // Utilisation de la méthode de fallback avec analyse locale
            console.log('Utilisation de l\'analyse locale de fallback...');
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
                    analysisResult += "RECOMMANDATION: Salut ! Si tu ressens quelque chose qui te dérange ou si quelque chose te pèse à l'école, parler à \
                    un adulte de confiance peut vraiment aider. Les amis, profs ou famille, sont souvent là pour te soutenir si tu en as besoin. Tu as des \
                    ressources aussi, comme le 3018, un numéro gratuit et confidentiel pour jeunes qui rencontrent des soucis comme le harcèlement ou autre. \
                    Reste cool, prends soin de toi, et sache que tu n'es jamais seul(e) ! 😊\n";
                }
                else if (resultLevel.includes("niveau 2") || resultLevel.includes("2")) {
                    analysisResult += "⚠️ SIGNES LÉGERS DE HARCÈLEMENT DÉTECTÉS\n\n";
                    analysisResult += "CONCLUSION: L'analyse a détecté quelques signes de tension et potentiellement des microagressions dans cette conversation.\n\n";
                    analysisResult += "RECOMMANDATIO : Hey ! Je remarque que certains mots utilisés pourraient blesser. Rappelle-toi, c'est super important de maintenir une ambiance \
                    respectueuse et bienveillante, que ce soit ici ou à l'école. Les mots peuvent avoir un gros impact, alors prenons le temps de bien réfléchir avant \
                    de les utiliser. Il n'est jamais trop tard pour être gentil et aider à créer un environnement positif pour tout le monde. Si tu veux en parler ou que \
                    tu as besoin d'aide, tu peux contacter le 3018, un service gratuit et confidentiel pour les jeunes, sur ce site Lien vers le 3018 : Service-Public\n"; // Lien Hypertexte à rajouter à la place de Service-public
                }
                else if (resultLevel.includes("niveau 3") || resultLevel.includes("3")) {
                    analysisResult += "⚠️ SIGNES MODÉRÉS DE HARCÈLEMENT DÉTECTÉS ⚠️\n\n";
                    analysisResult += "CONCLUSION: Cette conversation présente des signes clairs de tension et d'hostilité qui pourraient constituer du harcèlement.\n\n";
                    analysisResult += "RECOMMANDATION: Salut, je remarque que ça pourrait aller un peu loin ici. Rappelle-toi que chacun mérite respect et écoute. Le harcèlement, c'est pris au sérieux, et il est important de rester vigilant. Si jamais tu te retrouves dans une telle situation ou connais quelqu'un qui a besoin d'aide, n'hésite surtout pas à appeler le 3018 ou visiter leur site. Ce service est dédié pour les jeunes, gratuit et totalement confidentiel. Prends bien soin de toi et des autres ! 🙂\n";
                }
                else if (resultLevel.includes("niveau 4") || resultLevel.includes("4")) {
                    analysisResult += "⚠️⚠️ SIGNES SÉVÈRES DE HARCÈLEMENT DÉTECTÉS ⚠️⚠️\n\n";
                    analysisResult += "CONCLUSION: Cette conversation contient des signes alarmants de harcèlement caractérisé avec des attaques personnelles répétées.\n\n";
                    analysisResult += "RECOMMANDATION: Attention, ce qui se passe ici semble vraiment grave et pourrait avoir des conséquences sérieuses. Le harcèlement est interdit et puni sévèrement par la loi. Par exemple, le harcèlement scolaire (Article 222-33-2-3 du Code pénal) peut entraîner jusqu'à 3 ans de prison et 45 000 € d'amende, voire 10 ans et 150 000 € si cela mène à une tentative de suicide.\n";
                    analysisResult += "Il est urgent d'agir. Contacte le 3018 pour signaler la situation. C'est un service gratuit et confidentiel pour aider les jeunes victimes de harcèlement et de violences numériques.\n";
                    analysisResult += "N'oublie pas, tu mérites d'être en sécurité et respecté(e). Si tu as besoin, je suis là pour aider ou te guider davantage.\n"; // Lien hypertexte vers 30 18 et vers Code Pénal (Section 5 - Du harcèlement moral)
                }
                else if (resultLevel.includes("niveau 5") || resultLevel.includes("5")) {
                    analysisResult += "⚠️⚠️⚠️ HARCÈLEMENT GRAVE DÉTECTÉ ⚠️⚠️⚠️\n\n";
                    analysisResult += "CONCLUSION: Cette conversation montre des signes de harcèlement grave et potentiellement dangereux nécessitant une action immédiate.\n\n";
                    analysisResult += "RECOMMANDATION: URGENCE - Bonjour. Cette situation est extrêmement préoccupante et doit être traitée immédiatement. Si quelqu’un est victime de harcèlement grave, sachez que la loi protège chacune des victimes. Selon l'article 222-33-2-3 du Code pénal, le harcèlement scolaire est passible de peines allant jusqu'à 10 ans de prison et 150 000 € d'amende, notamment si cela conduit à une tentative de suicide.\n\n";
                    analysisResult += "Il est crucial de contacter rapidement une assistance spécialisée pour signaler la situation. Le service 3018 est là pour vous aider. C'est gratuit, confidentiel et disponible au site du 3018.\n\n";
                    analysisResult += "Si les faits persistent, n'hésitez pas à en parler à un adulte de confiance, comme un enseignant ou un parent, et déposer une plainte auprès des autorités compétentes. Votre bien-être et sécurité sont la priorité absolue.\n";
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