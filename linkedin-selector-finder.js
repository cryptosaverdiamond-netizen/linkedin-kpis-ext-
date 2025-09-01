// LINKEDIN SELECTOR FINDER
// Script pour identifier et générer automatiquement les sélecteurs LinkedIn
// À exécuter dans la console des DevTools sur les pages LinkedIn

console.log('🔍 LINKEDIN SELECTOR FINDER - Recherche des vrais sélecteurs...');

// Configuration des KPI à chercher
const KPI_CONFIG = {
    dashboard: {
        'global_posts_impressions_last_7d': {
            keywords: ['impression', 'vue', 'reach', 'portée', '7 jour', '7 day', 'derniers jours'],
            description: 'Impressions globales des publications (7 jours)'
        },
        'followers': {
            keywords: ['follower', 'abonné', 'connection', 'connexion', 'réseau', 'contacts'],
            description: 'Nombre de followers/abonnés'
        },
        'profile_views_90d': {
            keywords: ['vue de profil', 'profile view', 'profil vu', '90 jour', '90 day', 'vues du profil'],
            description: 'Vues du profil (90 jours)'
        },
        'search_appearances_last_week': {
            keywords: ['recherche', 'search', 'apparition', 'appearance', 'découverte', 'semaine', 'week'],
            description: 'Apparitions dans les recherches (semaine)'
        }
    },
    posts: {
        metrics: ['reactions', 'comments', 'shares', 'impressions'],
        repost_keywords: ['repost', 'repartage', 'partagé', 'reposté', 'shared by', 'reposted by']
    }
};

// Fonction principale
function findLinkedInSelectors() {
    const url = window.location.href;
    console.log(`🌐 Analyse de: ${url}`);
    
    if (url.includes('/dashboard/')) {
        return findDashboardSelectors();
    } else if (url.includes('/recent-activity/all/')) {
        return findPostSelectors();
    } else {
        console.log('❌ Page non supportée. Utilisez sur:');
        console.log('   • https://www.linkedin.com/dashboard/');
        console.log('   • https://www.linkedin.com/in/<slug>/recent-activity/all/');
        return null;
    }
}

// Analyse du dashboard
function findDashboardSelectors() {
    console.log('\n📊 === ANALYSE DASHBOARD ===');
    
    const results = {
        url: window.location.href,
        kpi_selectors: {},
        found_elements: {}
    };
    
    // Trouver tous les éléments avec des nombres
    const allElements = Array.from(document.querySelectorAll('*'))
        .filter(el => {
            const text = el.textContent?.trim();
            return text && /^\d[\d\s,.']*$/.test(text) && text.length < 20;
        });
    
    console.log(`🔢 Trouvé ${allElements.length} éléments avec des nombres`);
    
    // Analyser chaque KPI
    Object.keys(KPI_CONFIG.dashboard).forEach(kpiKey => {
        const config = KPI_CONFIG.dashboard[kpiKey];
        console.log(`\n🎯 Recherche: ${config.description}`);
        
        const matches = [];
        
        allElements.forEach(element => {
            // Analyser le contexte (parent, siblings, etc.)
            const contexts = [
                element.parentElement?.textContent || '',
                element.closest('div, section, article')?.textContent || '',
                element.previousElementSibling?.textContent || '',
                element.nextElementSibling?.textContent || ''
            ];
            
            const fullContext = contexts.join(' ').toLowerCase();
            
            // Vérifier si le contexte contient les mots-clés
            const hasKeyword = config.keywords.some(keyword => 
                fullContext.includes(keyword.toLowerCase())
            );
            
            if (hasKeyword) {
                const selector = generateOptimalSelector(element);
                matches.push({
                    element: element,
                    value: element.textContent.trim(),
                    selector: selector,
                    context: fullContext.substring(0, 200),
                    tagName: element.tagName,
                    className: element.className,
                    parent_selector: generateOptimalSelector(element.parentElement)
                });
            }
        });
        
        results.found_elements[kpiKey] = matches;
        
        // Générer les sélecteurs optimaux
        const selectors = generateSelectorsForKPI(matches);
        results.kpi_selectors[kpiKey] = selectors;
        
        console.log(`   ✅ ${matches.length} correspondances trouvées`);
        matches.forEach((match, i) => {
            console.log(`   ${i+1}. "${match.value}" | ${match.selector}`);
        });
    });
    
    return results;
}

// Analyse des posts
function findPostSelectors() {
    console.log('\n📝 === ANALYSE POSTS ===');
    
    const results = {
        url: window.location.href,
        post_selectors: {
            post_container: [],
            post_id: [],
            created_at: [],
            impressions: [],
            reactions: [],
            comments: [],
            shares: [],
            reshares: []
        },
        repost_indicators: {
            text_patterns: [],
            visual_indicators: []
        },
        found_posts: []
    };
    
    // 1. Trouver les conteneurs de posts
    const containerSelectors = [
        '.feed-shared-update-v2',
        'div[class*="feed-shared-update"]',
        'div[class*="update-components"]',
        'article',
        'div[data-urn]',
        'div[id*="ember"]'
    ];
    
    let containers = [];
    
    for (const selector of containerSelectors) {
        try {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                console.log(`📦 Conteneurs trouvés avec "${selector}": ${elements.length}`);
                containers = Array.from(elements);
                results.post_selectors.post_container.push(selector);
                break;
            }
        } catch (e) {
            console.debug(`Sélecteur invalide: ${selector}`);
        }
    }
    
    if (containers.length === 0) {
        console.log('❌ Aucun conteneur de post trouvé');
        return results;
    }
    
    // 2. Analyser les premiers posts
    const postsToAnalyze = containers.slice(0, 5);
    
    postsToAnalyze.forEach((container, index) => {
        console.log(`\n🎯 ANALYSE POST ${index + 1}:`);
        
        const postData = {
            container_selector: generateOptimalSelector(container),
            urn: null,
            urn_selectors: [],
            time_elements: [],
            metrics: {},
            is_repost: false
        };
        
        // 3. Chercher l'URN
        const urnSearches = [
            () => container.getAttribute('data-urn'),
            () => container.querySelector('[data-urn]')?.getAttribute('data-urn'),
            () => {
                const link = container.querySelector('a[href*="urn:li:activity:"]');
                return link ? link.getAttribute('href').match(/urn:li:activity:[0-9]+/)?.[0] : null;
            },
            () => {
                const element = container.querySelector('[id*="urn:li:activity:"]');
                return element ? element.id.match(/urn:li:activity:[0-9]+/)?.[0] : null;
            }
        ];
        
        for (const search of urnSearches) {
            const urn = search();
            if (urn && urn.includes('urn:li:activity:')) {
                postData.urn = urn;
                console.log(`   ✅ URN: ${urn}`);
                break;
            }
        }
        
        // 4. Chercher les éléments de temps
        const timeSelectors = [
            'time[datetime]',
            'time',
            '[class*="time"]',
            '[class*="date"]',
            '.update-components-actor__sub-description',
            '.feed-shared-actor__sub-description'
        ];
        
        timeSelectors.forEach(selector => {
            try {
                const timeEl = container.querySelector(selector);
                if (timeEl) {
                    const datetime = timeEl.getAttribute('datetime') || timeEl.textContent?.trim();
                    if (datetime) {
                        postData.time_elements.push({
                            selector: selector,
                            value: datetime,
                            element_selector: generateOptimalSelector(timeEl)
                        });
                        
                        if (!results.post_selectors.created_at.includes(selector)) {
                            results.post_selectors.created_at.push(selector);
                        }
                    }
                }
            } catch (e) {}
        });
        
        // 5. Chercher les métriques
        const metricPatterns = {
            reactions: ['reaction', 'like', 'réaction', 'j\'aime'],
            comments: ['comment', 'commentaire', 'réponse'],
            shares: ['share', 'partage', 'repartage'],
            impressions: ['impression', 'vue', 'view']
        };
        
        // Chercher tous les éléments avec des nombres dans le post
        const numberElements = Array.from(container.querySelectorAll('*'))
            .filter(el => {
                const text = el.textContent?.trim();
                return text && /^\d+$/.test(text) && parseInt(text) >= 0;
            });
        
        Object.keys(metricPatterns).forEach(metric => {
            const patterns = metricPatterns[metric];
            
            numberElements.forEach(numEl => {
                const context = (numEl.parentElement?.textContent || '').toLowerCase();
                const hasPattern = patterns.some(pattern => context.includes(pattern));
                
                if (hasPattern) {
                    const selector = generateOptimalSelector(numEl);
                    
                    if (!postData.metrics[metric]) {
                        postData.metrics[metric] = [];
                    }
                    
                    postData.metrics[metric].push({
                        value: numEl.textContent.trim(),
                        selector: selector,
                        context: context.substring(0, 100)
                    });
                    
                    // Ajouter aux sélecteurs globaux
                    if (!results.post_selectors[metric].includes(selector)) {
                        results.post_selectors[metric].push(selector);
                    }
                }
            });
        });
        
        // 6. Détecter les reposts
        const containerText = container.textContent.toLowerCase();
        const repostKeywords = KPI_CONFIG.posts.repost_keywords;
        
        postData.is_repost = repostKeywords.some(keyword => 
            containerText.includes(keyword.toLowerCase())
        );
        
        if (postData.is_repost) {
            console.log(`   ⚠️ REPOST détecté - sera ignoré`);
        }
        
        // Log des résultats
        console.log(`   📦 Conteneur: ${postData.container_selector}`);
        console.log(`   ⏰ Temps: ${postData.time_elements.length} éléments`);
        Object.keys(postData.metrics).forEach(metric => {
            console.log(`   📊 ${metric}: ${postData.metrics[metric].length} trouvés`);
        });
        
        results.found_posts.push(postData);
    });
    
    // Nettoyer et optimiser les sélecteurs
    Object.keys(results.post_selectors).forEach(key => {
        results.post_selectors[key] = [...new Set(results.post_selectors[key])];
    });
    
    return results;
}

// Générer un sélecteur optimal pour un élément
function generateOptimalSelector(element) {
    if (!element) return '';
    
    // 1. ID unique
    if (element.id && !element.id.includes('ember')) {
        return `#${element.id}`;
    }
    
    // 2. Classes spécifiques
    if (element.className && typeof element.className === 'string') {
        const classes = element.className.split(' ')
            .filter(c => c.trim() && !c.includes('ember'))
            .slice(0, 3);
        
        if (classes.length > 0) {
            const classSelector = '.' + classes.join('.');
            if (document.querySelectorAll(classSelector).length < 10) {
                return classSelector;
            }
        }
    }
    
    // 3. Attributs data-*
    const dataAttrs = Array.from(element.attributes)
        .filter(attr => attr.name.startsWith('data-') && !attr.name.includes('ember'))
        .slice(0, 1);
    
    if (dataAttrs.length > 0) {
        const attr = dataAttrs[0];
        return `[${attr.name}="${attr.value}"]`;
    }
    
    // 4. Sélecteur par tag + classe
    let selector = element.tagName.toLowerCase();
    if (element.className) {
        const firstClass = element.className.split(' ')[0];
        if (firstClass && !firstClass.includes('ember')) {
            selector += '.' + firstClass;
        }
    }
    
    return selector;
}

// Générer les meilleurs sélecteurs pour un KPI
function generateSelectorsForKPI(matches) {
    if (matches.length === 0) return [];
    
    const selectors = [];
    
    // Prendre les sélecteurs les plus spécifiques
    matches.forEach(match => {
        if (!selectors.includes(match.selector)) {
            selectors.push(match.selector);
        }
        
        // Ajouter aussi le sélecteur parent si pertinent
        if (match.parent_selector && !selectors.includes(match.parent_selector)) {
            selectors.push(match.parent_selector);
        }
    });
    
    // Ajouter des sélecteurs génériques en fallback
    const genericSelectors = [
        '.text-body-large-bold',
        'p.text-body-large-bold',
        '[class*="text-body-large"]'
    ];
    
    genericSelectors.forEach(sel => {
        if (!selectors.includes(sel)) {
            selectors.push(sel);
        }
    });
    
    return selectors.slice(0, 6); // Limiter à 6 sélecteurs max
}

// Générer les fichiers JSON
function generateSelectorFiles(results) {
    if (!results) {
        console.log('❌ Aucun résultat à traiter');
        return;
    }
    
    console.log('\n📁 === GÉNÉRATION DES FICHIERS ===');
    
    if (results.kpi_selectors) {
        // Fichier dashboard.fr.json
        const dashboardJson = {
            "kpi_selectors": results.kpi_selectors,
            "fallback_selectors": {
                "impressions_pattern": [
                    "\\d+\\s*impression",
                    "\\d+\\s*vue",
                    "\\d+\\s*view"
                ],
                "followers_pattern": [
                    "\\d+\\s*follower",
                    "\\d+\\s*abonné",
                    "\\d+\\s*connection"
                ],
                "profile_views_pattern": [
                    "\\d+\\s*vue.*profil",
                    "\\d+\\s*profile.*view"
                ],
                "search_pattern": [
                    "\\d+\\s*recherche",
                    "\\d+\\s*search.*appearance"
                ]
            },
            "text_indicators": {
                "french_keywords": [
                    "impressions", "followers", "vues de profil", 
                    "apparitions dans les recherches", "abonnés"
                ]
            }
        };
        
        console.log('📄 dashboard.fr.json:');
        console.log(JSON.stringify(dashboardJson, null, 2));
        
        window.dashboardSelectors = dashboardJson;
    }
    
    if (results.post_selectors) {
        // Fichier posts.fr.json
        const postsJson = {
            "post_selectors": results.post_selectors,
            "repost_indicators": {
                "text_patterns": KPI_CONFIG.posts.repost_keywords,
                "visual_indicators": [
                    ".repost-indicator",
                    ".shared-indicator",
                    "[class*='repost']",
                    "[class*='shared']"
                ]
            },
            "fallback_patterns": {
                "reactions": ["\\d+\\s*réaction", "\\d+\\s*like"],
                "comments": ["\\d+\\s*commentaire", "\\d+\\s*comment"],
                "shares": ["\\d+\\s*partage", "\\d+\\s*share"]
            }
        };
        
        console.log('\n📄 posts.fr.json:');
        console.log(JSON.stringify(postsJson, null, 2));
        
        window.postsSelectors = postsJson;
    }
    
    console.log('\n💾 Les fichiers JSON sont sauvegardés dans:');
    console.log('   • window.dashboardSelectors (pour dashboard.fr.json)');
    console.log('   • window.postsSelectors (pour posts.fr.json)');
    console.log('\n📋 Pour copier:');
    console.log('   • copy(JSON.stringify(window.dashboardSelectors, null, 2))');
    console.log('   • copy(JSON.stringify(window.postsSelectors, null, 2))');
}

// Exécution automatique
console.log('\n🚀 Démarrage de l\'analyse...');
const results = findLinkedInSelectors();

if (results) {
    generateSelectorFiles(results);
    
    console.log('\n✅ ANALYSE TERMINÉE !');
    console.log('📊 Résultats complets dans window.linkedinSelectorResults');
    window.linkedinSelectorResults = results;
} else {
    console.log('❌ Impossible d\'analyser cette page');
}

// Export des fonctions
window.LinkedInSelectorFinder = {
    find: findLinkedInSelectors,
    generateFiles: generateSelectorFiles,
    results: results
};