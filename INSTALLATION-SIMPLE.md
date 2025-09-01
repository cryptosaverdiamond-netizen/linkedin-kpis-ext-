# 🚀 INSTALLATION SIMPLE - EXTENSION LINKEDIN

## 📦 RÉCUPÉRATION DES FICHIERS

### Option 1 : Copier-Coller (RECOMMANDÉE)
1. **Créez un dossier** `linkedin-extension` sur votre Bureau
2. **Copiez chaque fichier** depuis ce chat dans le bon dossier
3. **Respectez l'arborescence** ci-dessous

### Option 2 : Télécharger depuis le chat
1. Cliquez sur chaque nom de fichier dans ce chat
2. Copiez le contenu 
3. Créez le fichier dans le bon dossier

## 📁 ARBORESCENCE À CRÉER

```
linkedin-extension/          ← Dossier principal
├── manifest.json
├── content.js
├── README.md
├── core/                   ← Créer ce dossier
│   ├── config.js
│   ├── transport.js
│   └── background.js
├── modules/                ← Créer ce dossier
│   ├── dashboard.fr.js
│   └── posts.fr.js
├── selectors/              ← Créer ce dossier
│   ├── dashboard.fr.json
│   └── posts.fr.json
├── schemas/                ← Créer ce dossier
│   ├── daily.schema.json
│   └── post.schema.json
└── utils/                  ← Créer ce dossier
    ├── uuid.js
    └── normalize.js
```

## ⚙️ CONFIGURATION

### 1. Éditez `core/config.js`
Remplacez ces valeurs par les vôtres :
```javascript
WEBAPP_URL: 'https://script.google.com/macros/s/VOTRE_SCRIPT_ID/exec',
SECRET: 'VOTRE_CLE_SECRETE',
COMPANY_ID: 'votre_entreprise',
TEAM_ID: 'votre_equipe'
```

## 🔧 INSTALLATION DANS CHROME

### 1. Ouvrir Chrome Extensions
- Tapez `chrome://extensions/` dans la barre d'adresse
- Ou Menu Chrome → Plus d'outils → Extensions

### 2. Activer le Mode Développeur
- Cliquez sur l'interrupteur "Mode développeur" (en haut à droite)

### 3. Charger l'extension
- Cliquez "Charger l'extension non empaquetée"
- Sélectionnez le dossier `linkedin-extension`
- L'extension apparaît dans la liste

### 4. Vérification
- L'extension doit s'afficher avec le nom "LinkedIn Data Scraper"
- Statut : Activée ✅

## ✅ TEST

### 1. Dashboard
- Allez sur `https://www.linkedin.com/dashboard/`
- Ouvrez DevTools (`F12`) → onglet Console
- Vous devriez voir : `[Dashboard] Initialisation du module dashboard`

### 2. Posts  
- Allez sur `https://www.linkedin.com/in/VOTRE-SLUG/recent-activity/all/`
- Dans la Console : `[Posts] Initialisation du module posts`

### 3. Envoi de données
- Les logs montrent : `[Background] Données envoyées avec succès`

## 🚨 DÉPANNAGE

### Erreur "Impossible de charger l'extension"
- Vérifiez que `manifest.json` est à la racine
- Vérifiez que tous les dossiers existent

### Erreur "Failed to load resource"
- Vérifiez que tous les fichiers `.js` et `.json` sont présents
- Respectez exactement les noms de fichiers

### Pas de logs dans la Console
- Vérifiez que vous êtes sur une page LinkedIn supportée
- Vérifiez que LinkedIn est en français

## 📞 AIDE

Si ça ne marche pas :
1. **Copiez les erreurs** de la Console DevTools
2. **Vérifiez** que tous les fichiers sont présents
3. **Partagez** les messages d'erreur

L'extension est **prête à fonctionner** dès que vous aurez copié tous les fichiers ! 🎯