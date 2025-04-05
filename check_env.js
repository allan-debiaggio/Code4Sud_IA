/**
 * Script pour vérifier les variables d'environnement
 * Ce script affiche toutes les variables d'environnement pertinentes pour l'application
 */

console.log('=== VÉRIFICATION DES VARIABLES D\'ENVIRONNEMENT ===');

// Variables pour Azure AI
console.log('\n--- Variables Azure AI ---');
console.log('AZURE_AI_ENDPOINT:', process.env.AZURE_AI_ENDPOINT || 'Non défini');
console.log('AZURE_AI_KEY:', process.env.AZURE_AI_KEY ? '***' + process.env.AZURE_AI_KEY.slice(-5) : 'Non défini');
console.log('AZURE_AI_MODEL_VERSION:', process.env.AZURE_AI_MODEL_VERSION || 'Non défini (utilisera "latest" par défaut)');

// Variables pour le fallback Copilot
console.log('\n--- Variables Copilot ---');
console.log('COPILOT_API_ENDPOINT:', process.env.COPILOT_API_ENDPOINT || 'Non défini');
console.log('COPILOT_API_KEY:', process.env.COPILOT_API_KEY ? '***' + process.env.COPILOT_API_KEY.slice(-5) : 'Non défini');

// Variables NODE_ENV
console.log('\n--- Variables Node.js ---');
console.log('NODE_ENV:', process.env.NODE_ENV || 'Non défini');

// Autres variables d'environnement
console.log('\n--- Toutes les variables d\'environnement ---');
const allEnvVars = Object.keys(process.env).sort();
for (const key of allEnvVars) {
    const value = process.env[key];
    // Masquer les clés sensibles
    const isSecret = key.includes('KEY') || key.includes('SECRET') || key.includes('PASSWORD') || key.includes('TOKEN');
    const displayValue = isSecret && value ? '***' + value.slice(-5) : value;
    console.log(`${key}:`, displayValue);
}