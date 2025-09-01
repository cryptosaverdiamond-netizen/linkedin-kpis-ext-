# Extension Chrome LinkedIn Data Scraper

Extension Chrome MV3 pour scraper les données LinkedIn et les envoyer vers Google Apps Script.

## 🎯 Objectif

Cette extension scrape **uniquement** 2 pages LinkedIn spécifiques :
1. **Posts originaux** : `https://www.linkedin.com/in/<slug>/recent-activity/all/`
2. **Dashboard (KPI daily)** : `https://www.linkedin.com/dashboard/`

Les données sont transformées selon des contrats stricts et envoyées vers un webhook Google Apps Script.

## 🏗️ Architecture

```
linkedin-ext/
├── manifest.json              # Manifest MV3
├── content.js                 # Router principal
├── core/
│   ├── config.js             # Configuration (WEBAPP_URL, SECRET, etc.)
│   ├── transport.js          # Gestion des envois HTTP
│   └── background.js         # Service worker
├── modules/
│   ├── dashboard.fr.js       # Scraping KPI daily
│   └── posts.fr.js           # Scraping posts originaux
├── selectors/
│   ├── dashboard.fr.json     # Sélecteurs CSS dashboard
│   └── posts.fr.json         # Sélecteurs CSS posts
├── schemas/
│   ├── daily.schema.json     # Validation données daily
│   └── post.schema.json      # Validation données posts
└── utils/
    ├── uuid.js               # Générateur UUIDv4
    └── normalize.js          # Normalisation données FR
```

## ⚙️ Configuration

### 1. Configuration requise

Dans `core/config.js`, configurer :

```javascript
const CONFIG = {
  WEBAPP_URL: "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",
  SECRET: "YOUR_SECRET_KEY",
  COMPANY_ID: "c1",           // ID de votre entreprise
  TEAM_ID: "t1",             // ID de votre équipe
  // ... autres paramètres
};
```

### 2. Installation

1. Ouvrir Chrome et aller dans `chrome://extensions/`
2. Activer le "Mode développeur"
3. Cliquer "Charger l'extension non empaquetée"
4. Sélectionner le dossier `linkedin-ext`

## 📊 Données collectées

### Table `daily` (KPI quotidiens)

| Champ | Type | Description |
|-------|------|-------------|
| `type` | string | "daily" |
| `company_id` | string | ID entreprise |
| `team_id` | string | ID équipe |
| `user_id` | string | Slug LinkedIn (ex: `maxime-boué-896573223`) |
| `date_yyyy_mm_dd` | string | Date YYYY-MM-DD (Europe/Paris) |
| `global_posts_impressions_last_7d` | number | Impressions posts 7 jours |
| `followers` | number | Nombre de followers |
| `profile_views_90d` | number | Vues profil 90 jours |
| `search_appearances_last_week` | number | Apparitions recherches semaine |

### Table `posts` (Posts individuels)

| Champ | Type | Description |
|-------|------|-------------|
| `type` | string | "post" |
| `company_id` | string | ID entreprise |
| `team_id` | string | ID équipe |
| `user_id` | string | Slug LinkedIn |
| `post_id` | string | URN LinkedIn (ex: `urn:li:activity:1234567890123456`) |
| `created_at_iso` | string | Date création ISO 8601 |
| `impressions` | number | Nombre d'impressions |
| `reactions` | number | Nombre de réactions |
| `comments` | number | Nombre de commentaires |
| `shares` | number | Nombre de partages |
| `reshares` | number | Nombre de repartages |
| `engagement_rate` | number | Taux d'engagement (0.0-1.0) |
| `lang` | string | Langue détectée ("fr", "en", "other") |
| `is_repost` | boolean | **false** (reposts ignorés) |

## 🔄 Transport

### Endpoint
```
POST WEBAPP_URL/exec?X-Secret=<SECRET>&X-Trace-Id=<uuid>
```

### Headers
```
Content-Type: application/json
```

### Gestion des erreurs
- **4xx** : Pas de retry (erreur client)
- **5xx** : Retry jusqu'à 3 fois (erreur serveur)
- **429/503** : Quota dépassé, arrêt
- **Timeout** : 10 secondes

### Batch
Support des envois groupés :
```json
{
  "items": [
    { "type": "daily", ... },
    { "type": "post", ... },
    { "type": "daily", ... }
  ]
}
```

## 🛡️ Sécurité & Robustesse

### Whitelist stricte
- Seules les 2 pages LinkedIn spécifiées
- Aucun accès aux autres pages
- Permissions minimales (`storage` uniquement)

### Gestion des changements LinkedIn
- Sélecteurs multiples avec fallbacks
- Patterns regex de secours
- Détection automatique des changements DOM

### Normalisation
- Nombres français (`1 234,56` → `1234.56`)
- Dates françaises (`DD/MM/YYYY` → `YYYY-MM-DD`)
- Pourcentages automatiques

### Traçabilité
- `trace_id` unique par envoi
- Logs détaillés avec corrélation
- Gestion des erreurs avec contexte

## 🚀 Performance

### Optimisations
- **Debounce** : 1 seconde entre envois dashboard
- **Throttle** : 1 seconde entre envois posts
- **Batch** : Maximum 10 posts par envoi
- **Retry intelligent** : Backoff exponentiel

### Gestion mémoire
- Cache des posts traités
- Nettoyage automatique des timers
- Pas de fuites mémoire

## 🧪 Tests

### Critères d'acceptation

#### Dashboard
- ✅ Envoi **daily** conforme
- ✅ Upsert par clé `company_id|user_id|YYYY-MM-DD`
- ✅ Fallback user_id depuis storage
- ✅ Validation payload avant envoi

#### Posts
- ✅ Envoi **post** pour chaque post original
- ✅ Reposts ignorés (`is_repost=true`)
- ✅ Batch pour posts multiples
- ✅ Throttle respecté
- ✅ Upsert par clé `company_id|user_id|post_id`

#### Robustesse
- ✅ Gestion erreurs 4xx/5xx
- ✅ Retry réseau automatique
- ✅ Quotas respectés
- ✅ Kill switch fonctionnel
- ✅ Changements DOM gérés

## 🔧 Maintenance

### Sélecteurs
Les sélecteurs sont dans `selectors/*.json` et peuvent être modifiés sans rebuild :
- Ajout de nouveaux sélecteurs
- Patterns regex de fallback
- Indicateurs de langue

### Configuration
- `KILL_SWITCH` pour désactiver rapidement
- `DEBOUNCE_MS` pour ajuster la fréquence
- `BATCH_SIZE_MAX` pour optimiser les posts

### Logs
- Console debug avec trace_id
- Messages d'erreur clairs
- Corrélation client/serveur

## 📝 Notes importantes

1. **Pas d'API LinkedIn** : Uniquement DOM scraping
2. **Langue française** : Détection automatique, scraping FR uniquement
3. **Idempotence** : Serveur gère les doublons
4. **Pas de composite_key** : Rempli côté serveur
5. **Date automatique** : Si non fournie, serveur met aujourd'hui

## 🚨 Limitations

- Fonctionne uniquement sur les pages whitelistées
- Nécessite une page en français
- Dépend de la structure DOM LinkedIn
- Quotas Google Apps Script à respecter

## 📞 Support

Pour toute question ou problème :
1. Vérifier les logs console avec trace_id
2. Contrôler la configuration
3. Tester la connectivité au webhook
4. Vérifier les permissions de l'extension# linkedin-kpis-ext-
LinkedIn Data Extension
