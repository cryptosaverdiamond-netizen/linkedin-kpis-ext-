# 🚀 Installation Rapide - Extension LinkedIn

## ⚡ Installation en 3 étapes

### 1. Configuration
```bash
# Exécuter le script d'installation
./install.sh

# Suivre les instructions pour configurer :
# - WEBAPP_URL (Google Apps Script)
# - SECRET (clé d'authentification)
# - COMPANY_ID (votre entreprise)
# - TEAM_ID (votre équipe)
```

### 2. Installation dans Chrome
1. Ouvrir `chrome://extensions/`
2. Activer le **"Mode développeur"** (en haut à droite)
3. Cliquer **"Charger l'extension non empaquetée"**
4. Sélectionner le dossier `linkedin-ext`

### 3. Test
1. Aller sur LinkedIn Dashboard : `https://www.linkedin.com/dashboard/`
2. Ouvrir la console (F12)
3. Vérifier les logs `[Dashboard]` ou `[Posts]`

## 🎯 Pages supportées

- ✅ **Dashboard** : `https://www.linkedin.com/dashboard/`
- ✅ **Posts** : `https://www.linkedin.com/in/<slug>/recent-activity/all/`
- ❌ **Autres pages** : Non supportées

## 🔧 Configuration avancée

Modifier `core/config.js` pour ajuster :
- `TIMEOUT_MS` : Timeout des requêtes
- `DEBOUNCE_MS` : Délai entre envois
- `BATCH_SIZE_MAX` : Taille des batches
- `KILL_SWITCH` : Désactiver l'extension

## 🧪 Test des composants

Ouvrir `test.html` dans Chrome pour tester :
- Génération UUID
- Normalisation des données
- Configuration
- Détection de l'extension

## 📊 Données collectées

### KPI Quotidiens (Dashboard)
- Impressions globales 7 jours
- Nombre de followers
- Vues de profil 90 jours
- Apparitions recherches semaine

### Posts Individuels
- Métriques d'engagement
- Détection de langue
- Filtrage des reposts
- Batch automatique

## 🚨 Dépannage

### Extension ne se charge pas
- Vérifier `manifest.json`
- Contrôler les permissions
- Recharger l'extension

### Pas de données collectées
- Vérifier la configuration
- Contrôler les logs console
- Tester la connectivité webhook

### Erreurs de scraping
- Vérifier les sélecteurs
- Contrôler la langue (FR uniquement)
- Tester sur les bonnes pages

## 📚 Documentation complète

- `README.md` : Guide détaillé
- `schemas/` : Validation des données
- `selectors/` : Sélecteurs CSS
- Logs console : Debug et traçabilité

## 🆘 Support

1. Vérifier les logs avec `trace_id`
2. Contrôler la configuration
3. Tester la connectivité
4. Vérifier les permissions

---

**Extension prête ! 🎉**