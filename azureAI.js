/**
 * Module d'intégration avec Azure AI Foundry
 * Ce module gère toutes les communications avec l'API de l'agent AI
 */
const { AIProjectsClient } = require("@azure/ai-projects");
const { DefaultAzureCredential } = require("@azure/identity");
const fs = require('fs');

class AzureAIConnector {
    constructor(config) {
        // Sauvegarde des options de configuration
        this.config = config;
        this.connectionString = config.connectionString || "swedencentral.api.azureml.ms;09134cae-5522-4a7f-9f41-2a860de20aa6;hackathon-1023;aiproject-1023";
        this.agentId = config.agentId || "asst_EJx4OEb5T7BoNIhyJHxn0wnS";
        this.threadId = config.threadId || "thread_hNCAq98lNQl3WKFnl3a9YKjf";

        // Initialisation du client Azure AI
        try {
            this.client = AIProjectsClient.fromConnectionString(
                this.connectionString,
                new DefaultAzureCredential()
            );
            console.log('Client Azure AI initialisé avec succès');
        } catch (error) {
            console.error('Erreur lors de l\'initialisation du client Azure AI:', error.message);
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
            console.log('Début de l\'analyse avec Azure AI Foundry');
            
            // Récupération de l'agent
            const agent = await this.client.agents.getAgent(this.agentId);
            console.log(`Agent récupéré: ${agent.name}`);
            
            // Récupération du thread
            const thread = await this.client.agents.getThread(this.threadId);
            console.log(`Thread récupéré, thread ID: ${thread.id}`);
            
            // Création d'un message avec le contenu JSON
            const jsonContent = JSON.stringify(jsonData);
            const message = await this.client.agents.createMessage(thread.id, {
                role: "user",
                content: jsonContent
            });
            console.log(`Message créé avec l'ID: ${message.id}`);
            
            // Exécution du thread pour obtenir la réponse de l'agent
            const runOperation = await this.client.agents.createRun(thread.id, {
                assistantId: this.agentId
            });
            
            // Attente de la fin de l'exécution
            console.log('En attente de la réponse de l\'agent...');
            const run = await runOperation.pollUntilDone();
            console.log(`Run terminé avec le statut: ${run.status}`);
            
            // Récupération des messages du thread
            const messages = await this.client.agents.listMessages(thread.id);
            
            // Obtention de la dernière réponse (message le plus récent de l'assistant)
            let latestAssistantMessage = null;
            
            for await (const msg of messages) {
                if (msg.role === 'assistant') {
                    latestAssistantMessage = msg;
                    break; // On ne prend que le plus récent
                }
            }
            
            if (!latestAssistantMessage) {
                throw new Error('Aucune réponse de l\'assistant n\'a été reçue');
            }
            
            return {
                success: true,
                data: latestAssistantMessage,
                analysis: latestAssistantMessage.content
            };
            
        } catch (error) {
            console.error('Erreur lors de la communication avec Azure AI:', error.message);
            return {
                success: false,
                error: error.message
            };
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
            // Si le contenu est un tableau ou un objet, le convertir en chaîne formatée
            let contentToSave = content;
            if (typeof content === 'object') {
                contentToSave = JSON.stringify(content, null, 2);
            }
            
            fs.writeFile(outputPath, contentToSave, 'utf8', (err) => {
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