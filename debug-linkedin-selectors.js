// Script de debug pour identifier les sélecteurs LinkedIn
// À exécuter dans la console des DevTools sur les pages LinkedIn

console.log('🔍 LINKEDIN SELECTOR DEBUGGER - Démarrage de l\'analyse...');

// Fonction pour analyser le dashboard LinkedIn
function debugDashboard() {
    console.log('\n📊 === ANALYSE DASHBOARD === ');
    
    // Mots-clés à rechercher pour les KPI
    const kpiKeywords = {
        impressions: ['impression', 'vue', 'view', 'reach', 'portée'],
        followers: ['follower', 'abonné', 'connection', 'connexion'],
        profile_views: ['vue de profil', 'profile view', 'profil vu'],
        search_appearances: ['recherche', 'search', 'apparition', 'appearance', 'découverte']
    };
    
    const results = {
        dashboard_url: window.location.href,
        found_elements: {},
        potential_selectors: {},
        text_content_samples: {}
    };
    
    // Rechercher tous les éléments contenant des nombres
    const allElements = document.querySelectorAll('*');
    const elementsWithNumbers = [];
    
    allElements.forEach(el => {
        const text = el.textContent?.trim();
        if (text && /\d+/.test(text) && text.length < 100) {
            elementsWithNumbers.push({
                element: el,
                text: text,
                tagName: el.tagName,
                className: el.className,
                id: el.id,
                attributes: Array.from(el.attributes).map(attr => `${attr.name}="${attr.value}"`),
                selector: generateSelector(el)
            });
        }
    });
    
    console.log(`🔢 Trouvé ${elementsWithNumbers.length} éléments avec des nombres`);
    
    // Analyser chaque KPI
    Object.keys(kpiKeywords).forEach(kpi => {
        console.log(`\n🎯 Recherche KPI: ${kpi.toUpperCase()}`);
        const keywords = kpiKeywords[kpi];
        const matches = [];
        
        elementsWithNumbers.forEach(item => {
            const fullText = item.element.closest('div')?.textContent?.toLowerCase() || '';
            const hasKeyword = keywords.some(keyword => fullText.includes(keyword.toLowerCase()));
            
            if (hasKeyword) {
                matches.push({
                    text: item.text,
                    fullContext: fullText.substring(0, 200),
                    selector: item.selector,
                    className: item.className,
                    attributes: item.attributes
                });
            }
        });
        
        results.found_elements[kpi] = matches;
        console.log(`   ✅ ${matches.length} correspondances trouvées`);
        matches.forEach((match, i) => {
            console.log(`   ${i+1}. "${match.text}" | Sélecteur: ${match.selector}`);
            console.log(`      Contexte: ${match.fullContext.substring(0, 100)}...`);
        });
    });
    
    return results;
}

// Fonction pour analyser les posts LinkedIn
function debugPosts() {
    console.log('\n📝 === ANALYSE POSTS === ');
    
    const results = {
        posts_url: window.location.href,
        post_containers: [],
        post_structure: {}
    };
    
    // Rechercher les conteneurs de posts
    const potentialContainers = [
        'div[data-urn*="urn:li:activity:"]',
        'article',
        'div[class*="feed"]',
        'div[class*="post"]',
        'div[class*="update"]',
        'div[class*="activity"]'
    ];
    
    let foundContainers = [];
    
    potentialContainers.forEach(selector => {
        try {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                console.log(`📦 Conteneurs trouvés avec "${selector}": ${elements.length}`);
                foundContainers.push(...Array.from(elements));
            }
        } catch (e) {
            console.log(`❌ Sélecteur invalide: ${selector}`);
        }
    });
    
    // Analyser les premiers posts
    const uniqueContainers = [...new Set(foundContainers)].slice(0, 3);
    
    uniqueContainers.forEach((container, index) => {
        console.log(`\n🎯 ANALYSE POST ${index + 1}:`);
        
        const postData = {
            container_selector: generateSelector(container),
            container_classes: container.className,
            container_attributes: Array.from(container.attributes).map(attr => `${attr.name}="${attr.value}"`),
            text_preview: container.textContent.substring(0, 150),
            metrics_found: {},
            urn_candidates: [],
            time_elements: []
        };
        
        // Rechercher l'URN/ID du post
        const urnElements = container.querySelectorAll('[data-urn], [href*="urn:li:activity"], [id*="urn"]');
        urnElements.forEach(el => {
            postData.urn_candidates.push({
                selector: generateSelector(el),
                urn: el.getAttribute('data-urn') || el.getAttribute('href') || el.id,
                tag: el.tagName
            });
        });
        
        // Rechercher les éléments de temps
        const timeElements = container.querySelectorAll('time, [datetime], [class*="time"], [class*="date"]');
        timeElements.forEach(el => {
            postData.time_elements.push({
                selector: generateSelector(el),
                datetime: el.getAttribute('datetime'),
                text: el.textContent?.trim(),
                tag: el.tagName
            });
        });
        
        // Rechercher les métriques (éléments avec des nombres)
        const numbersInPost = container.querySelectorAll('*');
        Array.from(numbersInPost).forEach(el => {
            const text = el.textContent?.trim();
            if (text && /^\d+$/.test(text) && text.length < 10) {
                const context = el.closest('button, span, div')?.textContent?.toLowerCase() || '';
                let metricType = 'unknown';
                
                if (context.includes('réaction') || context.includes('reaction') || context.includes('like')) {
                    metricType = 'reactions';
                } else if (context.includes('commentaire') || context.includes('comment')) {
                    metricType = 'comments';
                } else if (context.includes('partage') || context.includes('share') || context.includes('repost')) {
                    metricType = 'shares';
                } else if (context.includes('impression') || context.includes('vue')) {
                    metricType = 'impressions';
                }
                
                if (!postData.metrics_found[metricType]) {
                    postData.metrics_found[metricType] = [];
                }
                
                postData.metrics_found[metricType].push({
                    value: text,
                    selector: generateSelector(el),
                    context: context.substring(0, 100),
                    parent_selector: generateSelector(el.parentElement)
                });
            }
        });
        
        results.post_containers.push(postData);
        
        // Affichage des résultats
        console.log(`   📦 Conteneur: ${postData.container_selector}`);
        console.log(`   🆔 URN candidats: ${postData.urn_candidates.length}`);
        postData.urn_candidates.forEach(urn => {
            console.log(`      • ${urn.urn} | ${urn.selector}`);
        });
        
        console.log(`   ⏰ Éléments temps: ${postData.time_elements.length}`);
        postData.time_elements.forEach(time => {
            console.log(`      • ${time.datetime || time.text} | ${time.selector}`);
        });
        
        console.log(`   📊 Métriques trouvées:`);
        Object.keys(postData.metrics_found).forEach(metric => {
            console.log(`      • ${metric}: ${postData.metrics_found[metric].length} candidats`);
            postData.metrics_found[metric].forEach(m => {
                console.log(`        - ${m.value} | ${m.selector}`);
            });
        });
    });
    
    return results;
}

// Fonction utilitaire pour générer un sélecteur CSS
function generateSelector(element) {
    if (!element) return '';
    
    // Si l'élément a un ID unique
    if (element.id) {
        return `#${element.id}`;
    }
    
    // Construire un sélecteur basé sur les classes et la position
    let selector = element.tagName.toLowerCase();
    
    if (element.className && typeof element.className === 'string') {
        const classes = element.className.split(' ').filter(c => c.trim());
        if (classes.length > 0) {
            selector += '.' + classes.slice(0, 3).join('.');
        }
    }
    
    // Ajouter les attributs data-* importants
    const dataAttrs = Array.from(element.attributes)
        .filter(attr => attr.name.startsWith('data-'))
        .slice(0, 2);
    
    dataAttrs.forEach(attr => {
        selector += `[${attr.name}="${attr.value}"]`;
    });
    
    return selector;
}

// Fonction principale d'analyse
function analyzeLinkedInPage() {
    const url = window.location.href;
    console.log(`🌐 Analyse de: ${url}`);
    
    let results = {};
    
    if (url.includes('/dashboard/')) {
        results = debugDashboard();
    } else if (url.includes('/recent-activity/all/')) {
        results = debugPosts();
    } else {
        console.log('❌ Page non supportée. Utilisez ce script sur:');
        console.log('   • https://www.linkedin.com/dashboard/');
        console.log('   • https://www.linkedin.com/in/<slug>/recent-activity/all/');
        return;
    }
    
    // Sauvegarder les résultats
    window.linkedinDebugResults = results;
    console.log('\n💾 Résultats sauvegardés dans window.linkedinDebugResults');
    console.log('📋 Pour copier les résultats: copy(JSON.stringify(window.linkedinDebugResults, null, 2))');
    
    return results;
}

// Fonction pour extraire et copier les sélecteurs
function extractSelectors() {
    if (!window.linkedinDebugResults) {
        console.log('❌ Aucun résultat trouvé. Exécutez d\'abord analyzeLinkedInPage()');
        return;
    }
    
    const results = window.linkedinDebugResults;
    const selectors = {};
    
    if (results.found_elements) {
        // Dashboard
        selectors.dashboard = {};
        Object.keys(results.found_elements).forEach(kpi => {
            selectors.dashboard[kpi] = results.found_elements[kpi].map(item => item.selector);
        });
    }
    
    if (results.post_containers) {
        // Posts
        selectors.posts = {
            containers: results.post_containers.map(p => p.container_selector),
            urn_selectors: [],
            time_selectors: [],
            metric_selectors: {}
        };
        
        results.post_containers.forEach(post => {
            // URN selectors
            post.urn_candidates.forEach(urn => {
                if (!selectors.posts.urn_selectors.includes(urn.selector)) {
                    selectors.posts.urn_selectors.push(urn.selector);
                }
            });
            
            // Time selectors
            post.time_elements.forEach(time => {
                if (!selectors.posts.time_selectors.includes(time.selector)) {
                    selectors.posts.time_selectors.push(time.selector);
                }
            });
            
            // Metric selectors
            Object.keys(post.metrics_found).forEach(metric => {
                if (!selectors.posts.metric_selectors[metric]) {
                    selectors.posts.metric_selectors[metric] = [];
                }
                post.metrics_found[metric].forEach(m => {
                    if (!selectors.posts.metric_selectors[metric].includes(m.selector)) {
                        selectors.posts.metric_selectors[metric].push(m.selector);
                    }
                });
            });
        });
    }
    
    console.log('\n🎯 SÉLECTEURS EXTRAITS:');
    console.log(JSON.stringify(selectors, null, 2));
    
    window.extractedSelectors = selectors;
    console.log('\n📋 Pour copier: copy(JSON.stringify(window.extractedSelectors, null, 2))');
    
    return selectors;
}

// Lancer l'analyse automatiquement
console.log('\n🚀 Lancement de l\'analyse...');
analyzeLinkedInPage();

console.log('\n📖 INSTRUCTIONS:');
console.log('1. Les résultats sont dans window.linkedinDebugResults');
console.log('2. Pour extraire les sélecteurs: extractSelectors()');
console.log('3. Pour copier les résultats: copy(JSON.stringify(window.linkedinDebugResults, null, 2))');
console.log('4. Pour relancer l\'analyse: analyzeLinkedInPage()');