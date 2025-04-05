/**
 * Script de configuration pour l'authentification avec Azure AI Foundry
 * Utilisation d'une méthode d'authentification personnalisée par API key
 */

const fs = require('fs');
const path = require('path');

// Clés d'API et configuration
const apiKey = "35a0834fcc9e48c0a5b04b00c8859b0a";
const connectionString = "swedencentral.api.azureml.ms;09134cae-5522-4a7f-9f41-2a860de20aa6;hackathon-1023;aiproject-1023";
const agentId = "asst_EJx4OEb5T7BoNIhyJHxn0wnS";
const threadId = "thread_hNCAq98lNQl3WKFnl3a9YKjf";

// Exporter la configuration pour qu'elle soit disponible globalement
module.exports = {
    apiKey,
    connectionString,
    agentId,
    threadId
};

// Créer un fichier .env pour export des variables si nécessaire
const envFilePath = path.join(__dirname, '.env');
const exportCommands = [
    `export AZURE_API_KEY=${apiKey}`,
    `export AZURE_CONNECTION_STRING=${connectionString}`,
    `export AZURE_AGENT_ID=${agentId}`,
    `export AZURE_THREAD_ID=${threadId}`
].join('\n');

fs.writeFileSync(envFilePath, exportCommands);