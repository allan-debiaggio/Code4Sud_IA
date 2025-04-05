const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Charger la configuration d'authentification Azure
console.log('Chargement de la configuration d\'authentification Azure...');
require('./setup_auth');

const AzureAIConnector = require('./azureAI');

const app = express();
const port = 3000;

// Initialisation du connecteur Azure AI avec le SDK officiel
let azureAI = null;
try {
    console.log('Initialisation du connecteur Azure AI...');
    azureAI = new AzureAIConnector();
    console.log('Azure AI Foundry connecteur configuré et prêt à l\'emploi');
} catch (error) {
    console.error('ERREUR lors de l\'initialisation d\'Azure AI Foundry:', error.message);
    console.error('Utilisation du traitement local par défaut');
    azureAI = null;
}

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname)));

// Configuration de multer pour le stockage des fichiers
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, `input_${Date.now()}.json`);
    }
});

const upload = multer({ storage });

// Fonction pour nettoyer tous les fichiers JSON du dossier uploads
function cleanupJsonFiles() {
    const uploadDir = path.join(__dirname, 'uploads');
    if (fs.existsSync(uploadDir)) {
        const files = fs.readdirSync(uploadDir);
        files.forEach(file => {
            if (file.endsWith('.json')) {
                try {
                    fs.unlinkSync(path.join(uploadDir, file));
                    console.log(`Nettoyage: Fichier JSON supprimé: ${file}`);
                } catch (err) {
                    console.error(`Erreur lors de la suppression de ${file}: ${err.message}`);
                }
            }
        });
    }
}

// Endpoint pour traiter le fichier JSON
app.post('/process-json', upload.single('json_file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'Aucun fichier uploadé' });
    }

    console.log(`Fichier JSON reçu: ${req.file.originalname} (${req.file.size} bytes)`);
    const jsonFilePath = req.file.path;
    
    // Si Azure AI est configuré, utilisez-le pour l'analyse
    if (azureAI) {
        try {
            // Lire le contenu du fichier JSON
            console.log(`Lecture du fichier JSON: ${jsonFilePath}`);
            const jsonContent = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
            
            // Analyser via Azure AI Foundry SDK
            console.log('Envoi du fichier JSON à l\'agent Azure AI Foundry...');
            const analysisResult = await azureAI.analyzeConversation(jsonContent);
            
            if (analysisResult.success) {
                // Sauvegarder le résultat dans un fichier
                const outputFilePath = path.join(
                    path.dirname(jsonFilePath),
                    `output_${path.basename(jsonFilePath, '.json')}.txt`
                );
                
                console.log(`Sauvegarde du résultat dans: ${outputFilePath}`);
                await azureAI.saveAnalysisResult(analysisResult.analysis, outputFilePath);
                
                // Nettoyer tous les fichiers JSON
                cleanupJsonFiles();
                
                res.json({
                    success: true,
                    message: 'Analyse effectuée avec succès via Azure AI Foundry',
                    analysis: analysisResult.analysis // Retourne l'analyse au client
                });
            } else {
                console.error(`Erreur lors de l'analyse: ${analysisResult.error || 'Erreur inconnue'}`);
                res.status(500).json({
                    success: false,
                    error: `Erreur lors de l'analyse: ${analysisResult.error}`
                });
            }
        } catch (error) {
            console.error('ERREUR lors du traitement avec Azure AI:', error.message);
            console.error('Stack trace:', error.stack);
            
            // Fallback à la méthode Python
            console.log('Fallback: utilisation du script Python...');
            processWithPython(req, res, jsonFilePath);
        }
    } else {
        // Si Azure AI n'est pas configuré, utilisez le script Python
        console.log('Azure AI non configuré, utilisation du script Python...');
        processWithPython(req, res, jsonFilePath);
    }
});

// Fonction pour traiter avec le script Python
function processWithPython(req, res, jsonFilePath) {
    const pythonArgs = [
        'sendIA.py',
        jsonFilePath
    ];
    
    console.log(`Exécution du script Python: python3 ${pythonArgs.join(' ')}`);
    const pythonProcess = spawn('python3', pythonArgs);

    let outputData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`Python stdout: ${output}`);
        outputData += output;
    });

    pythonProcess.stderr.on('data', (data) => {
        const error = data.toString();
        console.error(`Python stderr: ${error}`);
        errorData += error;
    });

    pythonProcess.on('close', (code) => {
        console.log(`Processus Python terminé avec code: ${code}`);
        
        if (code !== 0) {
            console.error(`Erreur: ${errorData}`);
            return res.status(500).json({
                success: false,
                error: `Erreur lors de l'exécution du script: ${errorData}`
            });
        }

        // Vérifier si le traitement a réussi
        const outputFileMatch = outputData.match(/Le compte rendu (?:simplifié )?a été enregistré dans: (.+)$/m);
        if (outputFileMatch) {
            // Lire le contenu du fichier généré pour l'envoyer au client
            const outputFilePath = outputFileMatch[1];
            try {
                console.log(`Lecture du fichier d'analyse: ${outputFilePath}`);
                const analysisContent = fs.readFileSync(outputFilePath, 'utf8');
                
                // Au cas où le script Python n'a pas supprimé tous les fichiers
                cleanupJsonFiles();
                
                res.json({
                    success: true,
                    message: 'Compte rendu généré avec succès',
                    analysis: analysisContent // Retourne l'analyse au client
                });
            } catch (err) {
                console.error(`Erreur lors de la lecture du fichier d'analyse: ${err.message}`);
                res.status(500).json({
                    success: false,
                    error: `Erreur lors de la lecture du fichier d'analyse: ${err.message}`
                });
            }
        } else {
            console.error('Aucun fichier de sortie trouvé dans la réponse du script Python');
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la génération du compte rendu'
            });
        }
    });
}

// Nettoyage périodique des fichiers JSON (toutes les 30 minutes)
setInterval(cleanupJsonFiles, 30 * 60 * 1000);

// Nettoyage initial au démarrage
cleanupJsonFiles();

// Démarrer le serveur
app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});