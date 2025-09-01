# 📋 LISTE COMPLÈTE DES FICHIERS À COPIER

## 🎯 INSTRUCTIONS
1. **Créez** le dossier principal `linkedin-extension`
2. **Créez** les sous-dossiers : `core/`, `modules/`, `selectors/`, `schemas/`, `utils/`
3. **Copiez** chaque fichier depuis ce chat dans le bon dossier

---

## 📁 FICHIERS RACINE

### ✅ `manifest.json`
```json
{
  "manifest_version": 3,
  "name": "LinkedIn Data Scraper",
  "version": "1.0.0",
  "description": "Extension LinkedIn pour scraper dashboard KPI et posts (FR uniquement)",
  
  "permissions": [
    "storage"
  ],
  
  "host_permissions": [
    "https://www.linkedin.com/in/*/recent-activity/all/*",
    "https://www.linkedin.com/dashboard/*",
    "https://script.google.com/*",
    "https://script.googleusercontent.com/*"
  ],
  
  "background": {
    "service_worker": "core/background.js"
  },
  
  "content_scripts": [
    {
      "matches": [
        "https://www.linkedin.com/dashboard/*",
        "https://www.linkedin.com/in/*/recent-activity/all/*"
      ],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  
  "web_accessible_resources": [
    {
      "resources": [
        "core/*.js",
        "modules/*.js", 
        "selectors/*.json",
        "schemas/*.json",
        "utils/*.js"
      ],
      "matches": ["https://www.linkedin.com/*"]
    }
  ]
}
```

### ✅ `content.js`
👆 **Copiez le contenu complet depuis le fichier `content.js` créé plus haut**

---

## 📁 DOSSIER `core/`

### ✅ `core/config.js` ⚠️ **À PERSONNALISER**
👆 **Copiez depuis le fichier `core/config.js` ET modifiez vos paramètres**

### ✅ `core/transport.js`
👆 **Copiez depuis le fichier `core/transport.js`**

### ✅ `core/background.js`
👆 **Copiez depuis le fichier `core/background.js`**

---

## 📁 DOSSIER `utils/`

### ✅ `utils/uuid.js`
👆 **Copiez depuis le fichier `utils/uuid.js`**

### ✅ `utils/normalize.js`
👆 **Copiez depuis le fichier `utils/normalize.js`**

---

## 📁 DOSSIER `selectors/`

### ✅ `selectors/dashboard.fr.json`
👆 **Copiez depuis le fichier `selectors/dashboard.fr.json`**

### ✅ `selectors/posts.fr.json`
👆 **Copiez depuis le fichier `selectors/posts.fr.json`**

---

## 📁 DOSSIER `schemas/`

### ✅ `schemas/daily.schema.json`
👆 **Copiez depuis le fichier `schemas/daily.schema.json`**

### ✅ `schemas/post.schema.json`
👆 **Copiez depuis le fichier `schemas/post.schema.json`**

---

## 📁 DOSSIER `modules/`

### ✅ `modules/dashboard.fr.js`
👆 **Copiez depuis le fichier `modules/dashboard.fr.js`**

### ✅ `modules/posts.fr.js`
👆 **Copiez depuis le fichier `modules/posts.fr.js`**

---

## ✅ VÉRIFICATION FINALE

Votre dossier `linkedin-extension` doit contenir :
- ✅ 3 fichiers racine (manifest.json, content.js, README.md)
- ✅ 5 dossiers (core, modules, selectors, schemas, utils)
- ✅ 13 fichiers au total dans les sous-dossiers

**TOTAL : 16 fichiers** 📁

Une fois tous les fichiers copiés :
1. **Modifiez** `core/config.js` avec vos paramètres
2. **Chargez** l'extension dans Chrome
3. **Testez** sur LinkedIn !

🎯 **L'extension est prête à fonctionner !**