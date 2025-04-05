/**
 * Module d'intégration avec Azure AI Foundry
 * Ce module gère toutes les communications avec l'API de l'agent AI
 */
const axios = require('axios');
const fs = require('fs');

class AzureAIConnector {
    constructor(config) {
        this.apiEndpoint = config.apiEndpoint;
        this.apiKey = config.apiKey;
        this.modelVersion = config.modelVersion || 'latest';
    }

    /**
     * Analyse une conversation via l'API Azure AI Foundry
     * @param {Object} jsonData - Les données de conversation au format JSON
     * @param {String} prompt - Optionnel: Instructions spécifiques pour l'analyse
     * @returns {Promise<Object>} - Résultat de l'analyse
     */
    async analyzeConversation(jsonData, prompt = null) {
        try {
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            };

            // Structure de la requête pour Azure AI Foundry
            // L'agent est déjà pré-configuré, nous envoyons juste le fichier JSON
            const payload = {
                messages: [
                    {
                        role: "user",
                        content: JSON.stringify(jsonData)
                    }
                ],
                temperature: 0.5,
                max_tokens: 2000
            };

            // Ajout optionnel du prompt système si fourni
            if (prompt) {
                payload.messages.unshift({
                    role: "system",
                    content: prompt
                });
            }

            const response = await axios.post(this.apiEndpoint, payload, { headers });

            return {
                success: true,
                data: response.data,
                analysis: response.data.choices[0].message.content
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