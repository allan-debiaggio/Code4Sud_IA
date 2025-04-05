# Vidocq_mini - Analyseur de Harcèlement

![Logo Vidocq_mini](./assets/logo.png)

## Description

Vidocq_mini est une application web qui permet d'analyser des conversations pour détecter des signes de harcèlement. L'utilisateur peut télécharger un fichier JSON contenant une conversation, et l'application utilise l'intelligence artificielle d'Azure AI Foundry pour analyser le contenu et produire un rapport détaillé indiquant s'il y a des signes de harcèlement, avec différents niveaux de gravité.

## Fonctionnalités

- Interface utilisateur intuitive pour télécharger des fichiers JSON
- Analyse des conversations avec Azure AI Foundry
- Détection de différents niveaux de harcèlement (du niveau 1 au niveau 5)
- Affichage des résultats dans un popup détaillé
- Possibilité de télécharger le rapport d'analyse
- Solution de secours avec analyse locale en cas d'indisponibilité de l'API Azure

## Prérequis

- Node.js (v14 ou supérieur)
- NPM (v6 ou supérieur)
- Un compte Azure avec accès à Azure AI Foundry (pour l'analyse IA avancée)

## Installation

1. Clonez ce dépôt :
```bash
git clone https://github.com/votre-username/vidocq-mini.git
cd vidocq-mini
```

2. Installez les dépendances :
```bash
npm install
```

3. Installez les dépendances spécifiques pour Azure AI :
```bash
npm install @azure/ai-projects @azure/identity multer express
```

## Configuration

Les informations d'authentification pour Azure AI Foundry sont stockées dans le fichier `setup_auth.js`. Vous pouvez modifier ce fichier pour y inclure vos propres informations d'authentification :

```javascript
const apiKey = "VOTRE_API_KEY";
const connectionString = "VOTRE_CONNECTION_STRING";
const agentId = "VOTRE_AGENT_ID";
const threadId = "VOTRE_THREAD_ID";
```

Ces informations peuvent être obtenues depuis le portail Azure AI Foundry.

## Exécution

Pour démarrer l'application, exécutez la commande suivante :

```bash
node server.js
```

L'application sera accessible dans votre navigateur à l'adresse : http://localhost:3000

## Utilisation

1. Accédez à l'application via votre navigateur
2. Utilisez le bouton "Sélectionner un fichier" ou faites glisser-déposer un fichier JSON de conversation 
3. Attendez que l'analyse soit effectuée
4. Les résultats s'afficheront dans un popup avec la possibilité de télécharger le rapport

## Format du fichier JSON

L'application accepte plusieurs formats de fichiers JSON. Voici quelques exemples de structures valides :

```json
[
  {"user": "user1", "content": "Message 1"},
  {"user": "user2", "content": "Message 2"}
]
```

ou

```json
{
  "messages": [
    {"user": "user1", "content": "Message 1"},
    {"user": "user2", "content": "Message 2"}
  ]
}
```

ou

```json
{
  "conversation": [
    {"user": "user1", "content": "Message 1"},
    {"user": "user2", "content": "Message 2"}
  ]
}
```

Vous pouvez également spécifier directement un niveau de harcèlement avec le format suivant :

```json
{
  "result": "niveau 3"
}
```

## Niveaux de harcèlement

- **Niveau 1** : Aucun signe de harcèlement
- **Niveau 2** : Signes légers de harcèlement, vigilance conseillée
- **Niveau 3** : Signes modérés de harcèlement, intervention adulte recommandée
- **Niveau 4** : Signes sévères de harcèlement, intervention immédiate nécessaire
- **Niveau 5** : Harcèlement grave, contacter immédiatement le 3018 ou les autorités

## Structure du projet

- `index.html` - Interface utilisateur
- `styles.css` - Feuilles de style
- `app.js` - Logique front-end
- `server.js` - Serveur Express
- `azureAI.js` - Module de connexion à Azure AI Foundry
- `setup_auth.js` - Configuration d'authentification
- `assets/` - Images et ressources graphiques
- `ex_conv/` - Exemples de conversations au format JSON
- `uploads/` - Dossier temporaire pour les fichiers téléversés

## Dépannage

Si vous rencontrez des problèmes de connexion avec Azure AI Foundry, vérifiez les points suivants :
- Les informations d'authentification dans `setup_auth.js` sont correctes
- Votre agent Azure AI est correctement configuré
- Le thread spécifié existe

En cas d'échec de connexion à Azure AI, l'application utilisera automatiquement l'analyse locale comme solution de secours.

## Contact

Pour toute question ou assistance, veuillez contacter l'équipe Vidocq_mini.

## Licence

© 2025 Vidocq_mini - Tous droits réservés