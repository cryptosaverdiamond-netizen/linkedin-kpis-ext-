# Instructions pour identifier les sélecteurs LinkedIn

## 🎯 Objectif
Identifier les vrais sélecteurs DOM utilisés par LinkedIn pour extraire les KPI nécessaires à votre extension.

## 📋 Étapes à suivre

### 1. Préparation
1. Ouvrez Chrome/Edge
2. Connectez-vous à LinkedIn
3. Assurez-vous d'être sur la version française de LinkedIn

### 2. Analyse du Dashboard

1. **Allez sur** : `https://www.linkedin.com/dashboard/`
2. **Ouvrez les DevTools** : `F12` ou clic droit → "Inspecter"
3. **Allez dans l'onglet Console**
4. **Copiez-collez** le contenu du fichier `debug-linkedin-selectors.js`
5. **Appuyez sur Entrée** pour exécuter

Le script va analyser la page et chercher :
- ✅ **Impressions globales** (7 jours)
- ✅ **Nombre de followers/abonnés**
- ✅ **Vues de profil** (90 jours)  
- ✅ **Apparitions dans les recherches** (semaine)

### 3. Analyse des Posts

1. **Allez sur** : `https://www.linkedin.com/in/<votre-slug>/recent-activity/all/`
   - Remplacez `<votre-slug>` par votre identifiant LinkedIn
2. **Ouvrez les DevTools** : `F12`
3. **Dans la Console**, exécutez : `analyzeLinkedInPage()`

Le script va analyser :
- ✅ **Conteneurs de posts**
- ✅ **URN/ID des posts**
- ✅ **Métriques** (impressions, réactions, commentaires, partages)
- ✅ **Dates de création**

### 4. Récupération des résultats

Après chaque analyse :
1. **Tapez** : `extractSelectors()` dans la console
2. **Copiez les résultats** : `copy(JSON.stringify(window.extractedSelectors, null, 2))`
3. **Collez** les résultats dans un fichier texte

## 🔍 Ce que le script va trouver

### Dashboard KPI attendus :
```json
{
  "dashboard": {
    "impressions": ["selector1", "selector2"],
    "followers": ["selector1", "selector2"],
    "profile_views": ["selector1", "selector2"],
    "search_appearances": ["selector1", "selector2"]
  }
}
```

### Posts attendus :
```json
{
  "posts": {
    "containers": ["selector1", "selector2"],
    "urn_selectors": ["selector1", "selector2"],
    "time_selectors": ["selector1", "selector2"],
    "metric_selectors": {
      "reactions": ["selector1"],
      "comments": ["selector1"],
      "shares": ["selector1"],
      "impressions": ["selector1"]
    }
  }
}
```

## 🚨 Points d'attention

1. **Langue** : Assurez-vous d'être sur LinkedIn en français
2. **Données présentes** : Vérifiez que vous avez des posts récents et des KPI visibles
3. **Classes CSS** : LinkedIn utilise des classes obfusquées qui peuvent changer
4. **Attributs data-*** : Cherchez les attributs `data-urn`, `data-*` qui sont plus stables

## 📤 Après l'analyse

Envoyez-moi :
1. **Les résultats JSON** des deux analyses (dashboard + posts)
2. **Des captures d'écran** des pages analysées (optionnel)
3. **Toute erreur** rencontrée dans la console

Je pourrai alors corriger les fichiers `selectors/dashboard.fr.json` et `selectors/posts.fr.json` avec les vrais sélecteurs !

## 🔧 Dépannage

**Si le script ne trouve rien :**
- Vérifiez que vous êtes connecté à LinkedIn
- Assurez-vous d'avoir des données à afficher (posts récents, métriques)
- Essayez de rafraîchir la page et relancer

**Si vous voyez des erreurs :**
- Notez les erreurs et envoyez-les moi
- Le script continue même en cas d'erreur partielle