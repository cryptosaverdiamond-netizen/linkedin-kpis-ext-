# Extension LinkedIn Data Scraper

Extension Chrome MV3 pour scraper les KPI dashboard et posts LinkedIn (FR uniquement) et les envoyer vers Google Apps Script.

## 🎯 Fonctionnalités

### Dashboard (`/dashboard/`)
- **Impressions globales** (7 jours)
- **Followers/Abonnés**  
- **Vues de profil** (90 jours)
- **Apparitions dans les recherches** (semaine)

### Posts (`/in/<slug>/recent-activity/all/`)
- **URN des posts** (`urn:li:activity:...`)
- **Métriques** : réactions, commentaires, republications
- **Détection automatique des reposts** (ignorés)
- **Langue** et **taux d'engagement**

## 🚀 Installation

1. **Configuration** : Éditez `core/config.js` avec vos paramètres :
```javascript
const CONFIG = {
  WEBAPP_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
  SECRET: 'YOUR_SECRET_KEY',
  COMPANY_ID: 'your_company',
  TEAM_ID: 'your_team'
};
```

2. **Chargement** : Allez dans `chrome://extensions/`
   - Activez le "Mode développeur"
   - Cliquez "Charger l'extension non empaquetée"
   - Sélectionnez le dossier de l'extension

3. **Test** : Allez sur LinkedIn dashboard ou page posts

## 📊 Données envoyées

### Format Dashboard (daily)
```json
{
  "type": "daily",
  "company_id": "c1",
  "team_id": "t1", 
  "user_id": "maxime-boué-896573223",
  "date_yyyy_mm_dd": "2025-01-27",
  "global_posts_impressions_last_7d": 153,
  "followers": 551,
  "profile_views_90d": 49,
  "search_appearances_last_week": 10,
  "source_file": "dashboard.fr.js",
  "captured_at_iso": "2025-01-27T10:30:00.000Z",
  "trace_id": "uuid-v4"
}
```

### Format Posts
```json
{
  "type": "post",
  "company_id": "c1",
  "team_id": "t1",
  "user_id": "maxime-boué-896573223",
  "post_id": "urn:li:activity:7350842980666146816",
  "created_at_iso": "2025-01-25T09:30:00Z",
  "reactions": 42,
  "comments": 15,
  "shares": 2,
  "reshares": 0,
  "engagement_rate": 0.064,
  "lang": "fr",
  "is_repost": false
}
```

## 🔧 Architecture

```
linkedin-ext/
├── manifest.json
├── content.js              # Router principal
├── core/
│   ├── config.js          # Configuration
│   ├── transport.js       # Communication Apps Script  
│   └── background.js      # Service Worker
├── modules/
│   ├── dashboard.fr.js    # Scraping dashboard
│   └── posts.fr.js        # Scraping posts
├── selectors/
│   ├── dashboard.fr.json  # Sélecteurs KPI
│   └── posts.fr.json      # Sélecteurs posts
├── schemas/
│   ├── daily.schema.json  # Validation dashboard
│   └── post.schema.json   # Validation posts
└── utils/
    ├── uuid.js           # Générateur trace_id
    └── normalize.js      # Normalisation données FR
```

## 🛠️ Fonctionnalités techniques

- **Robustesse** : Sélecteurs multiples avec fallbacks
- **Performance** : Debounce/throttle, batch des posts
- **Traçabilité** : UUIDv4 pour chaque envoi
- **Gestion d'erreurs** : Retry sur 5xx, pas sur 4xx
- **Kill switch** : Désactivation rapide via config
- **Validation** : Schémas JSON pour les payloads

## 📝 Logs de debug

Ouvrez les DevTools (`F12`) pour voir les logs :
```
[Dashboard] KPI global_posts_impressions_last_7d trouvé avec contexte: 153
[Posts] URN trouvé sur conteneur: urn:li:activity:7350842980666146816
[Background] Données envoyées avec succès
```

## ⚠️ Limitations

- **Français uniquement** : Détection automatique de la langue
- **Pages supportées** : Dashboard et posts activity seulement  
- **Reposts ignorés** : Détection automatique
- **Rate limiting** : Respecte les quotas Google Apps Script

## 🔍 Dépannage

1. **Pas de données** : Vérifiez la langue française de LinkedIn
2. **Erreurs 4xx** : Vérifiez WEBAPP_URL et SECRET
3. **Sélecteurs échoués** : LinkedIn a peut-être changé sa structure
4. **Kill switch** : Vérifiez `CONFIG.KILL_SWITCH = false`

## 🎯 Basé sur les tests validés

Cette extension utilise les sélecteurs et la logique validés lors des tests :
- ✅ Dashboard : 4/4 KPI détectés (153, 551, 49, 10)
- ✅ Posts : URN, métriques, timestamps fonctionnels
- ✅ Anti-collision : Différenciation contextuelle des KPI
- ✅ Format JSON : Conforme aux contrats Apps Script