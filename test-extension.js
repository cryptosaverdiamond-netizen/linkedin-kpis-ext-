// Script de test pour vérifier que l'extension fonctionne
// À exécuter dans la console des DevTools après avoir installé l'extension

console.log('🧪 TEST EXTENSION LINKEDIN - Démarrage des tests...');

function testDashboard() {
    console.log('\n📊 === TEST DASHBOARD ===');
    
    if (!window.location.href.includes('/dashboard/')) {
        console.log('❌ Pas sur la page dashboard. Allez sur https://www.linkedin.com/dashboard/');
        return;
    }
    
    // Vérifier si l'extension est chargée
    if (!window.LinkedInScraper) {
        console.log('❌ Extension non chargée. Vérifiez que l\'extension est installée et activée.');
        return;
    }
    
    console.log('✅ Extension détectée');
    
    // Tester la détection des KPI avec la nouvelle méthode
    const kpiKeywords = {
        'global_posts_impressions_last_7d': ['impression', 'vue', 'reach', 'portée', '7 jour', '7 day'],
        'followers': ['follower', 'abonné', 'connection', 'connexion', 'réseau'],
        'profile_views_90d': ['vue de profil', 'profile view', 'profil vu', '90 jour', '90 day'],
        'search_appearances_last_week': ['recherche', 'search', 'apparition', 'appearance', 'découverte', 'semaine', 'week']
    };
    
    const results = {};
    
    Object.keys(kpiKeywords).forEach(kpi => {
        const keywords = kpiKeywords[kpi];
        console.log(`\n🎯 Test KPI: ${kpi}`);
        
        // Chercher les éléments avec des nombres
        const numberElements = document.querySelectorAll('p.text-body-large-bold, .text-body-large-bold');
        let found = false;
        
        for (const element of numberElements) {
            const text = element.textContent?.trim();
            if (text && /\d+/.test(text)) {
                const container = element.closest('div, section, article') || element.parentElement;
                if (container) {
                    const contextText = container.textContent.toLowerCase();
                    const hasKeyword = keywords.some(keyword => contextText.includes(keyword.toLowerCase()));
                    
                    if (hasKeyword) {
                        console.log(`   ✅ Trouvé: ${text}`);
                        console.log(`   📍 Contexte: ${contextText.substring(0, 100)}...`);
                        results[kpi] = {
                            value: text,
                            context: contextText.substring(0, 200)
                        };
                        found = true;
                        break;
                    }
                }
            }
        }
        
        if (!found) {
            console.log(`   ❌ Non trouvé`);
            results[kpi] = null;
        }
    });
    
    console.log('\n📋 RÉSULTATS DASHBOARD:');
    console.log(results);
    
    return results;
}

function testPosts() {
    console.log('\n📝 === TEST POSTS ===');
    
    if (!window.location.href.includes('/recent-activity/all/')) {
        console.log('❌ Pas sur la page posts. Allez sur https://www.linkedin.com/in/<slug>/recent-activity/all/');
        return;
    }
    
    // Tester la détection des conteneurs de posts
    let containers = [];
    
    // Test stratégie 1
    let elements = document.querySelectorAll('.feed-shared-update-v2');
    if (elements.length > 0) {
        containers.push(...elements);
        console.log(`✅ Stratégie 1: Trouvé ${elements.length} conteneurs avec .feed-shared-update-v2`);
    }
    
    // Test stratégie 2 si pas de résultats
    if (containers.length === 0) {
        elements = document.querySelectorAll('div[class*="update-components"], div[class*="feed-shared"]');
        if (elements.length > 0) {
            containers.push(...elements);
            console.log(`✅ Stratégie 2: Trouvé ${elements.length} conteneurs avec classes update/feed`);
        }
    }
    
    // Test stratégie 3 si pas de résultats
    if (containers.length === 0) {
        elements = document.querySelectorAll('div.update-components-header');
        if (elements.length > 0) {
            elements.forEach(header => {
                const container = header.closest('div[id*="ember"], article, div[class*="artdeco"]');
                if (container && !containers.includes(container)) {
                    containers.push(container);
                }
            });
            console.log(`✅ Stratégie 3: Trouvé ${containers.length} conteneurs par structure header`);
        }
    }
    
    if (containers.length === 0) {
        console.log('❌ Aucun conteneur de post trouvé');
        return;
    }
    
    // Analyser les 3 premiers posts
    const results = [];
    const postsToAnalyze = containers.slice(0, 3);
    
    postsToAnalyze.forEach((container, index) => {
        console.log(`\n🎯 ANALYSE POST ${index + 1}:`);
        
        const postData = {
            container_found: true,
            urn: null,
            metrics: {},
            timestamp: null
        };
        
        // Test extraction URN
        let urn = container.getAttribute('data-urn');
        if (urn && urn.includes('urn:li:activity:')) {
            postData.urn = urn;
            console.log(`   ✅ URN trouvé sur conteneur: ${urn}`);
        } else {
            // Chercher dans les enfants
            const urnElements = container.querySelectorAll('[data-urn]');
            for (const element of urnElements) {
                urn = element.getAttribute('data-urn');
                if (urn && urn.includes('urn:li:activity:')) {
                    postData.urn = urn;
                    console.log(`   ✅ URN trouvé dans enfant: ${urn}`);
                    break;
                }
            }
        }
        
        if (!postData.urn) {
            console.log(`   ❌ URN non trouvé`);
        }
        
        // Test extraction métriques
        const metricSelectors = {
            reactions: ['.social-details-social-counts__reactions-count', 'button[data-reaction-details] span'],
            comments: ['.social-details-social-counts__comments', '.social-details-social-counts__item--height-two-x'],
            shares: ['.social-details-social-counts__shares']
        };
        
        Object.keys(metricSelectors).forEach(metric => {
            let found = false;
            for (const selector of metricSelectors[metric]) {
                try {
                    const element = container.querySelector(selector);
                    if (element) {
                        const text = element.textContent?.trim();
                        if (text && /^\d+$/.test(text)) {
                            postData.metrics[metric] = text;
                            console.log(`   ✅ ${metric}: ${text}`);
                            found = true;
                            break;
                        }
                    }
                } catch (e) {
                    console.debug(`   Sélecteur ${selector} échoué:`, e);
                }
            }
            if (!found) {
                console.log(`   ❌ ${metric}: non trouvé`);
            }
        });
        
        // Test extraction timestamp
        const timeElement = container.querySelector('time[datetime], .update-components-actor__sub-description time');
        if (timeElement) {
            const datetime = timeElement.getAttribute('datetime') || timeElement.textContent;
            postData.timestamp = datetime;
            console.log(`   ✅ Timestamp: ${datetime}`);
        } else {
            console.log(`   ❌ Timestamp non trouvé`);
        }
        
        results.push(postData);
    });
    
    console.log('\n📋 RÉSULTATS POSTS:');
    console.log(results);
    
    return results;
}

function runTests() {
    const url = window.location.href;
    
    if (url.includes('/dashboard/')) {
        return testDashboard();
    } else if (url.includes('/recent-activity/all/')) {
        return testPosts();
    } else {
        console.log('❌ Page non supportée. Utilisez ce script sur:');
        console.log('   • https://www.linkedin.com/dashboard/');
        console.log('   • https://www.linkedin.com/in/<slug>/recent-activity/all/');
        return null;
    }
}

// Lancer les tests automatiquement
console.log('\n🚀 Lancement des tests...');
const testResults = runTests();

console.log('\n📖 INSTRUCTIONS:');
console.log('1. Les résultats sont dans la variable testResults');
console.log('2. Pour relancer les tests: runTests()');
console.log('3. Pour tester une page spécifique: testDashboard() ou testPosts()');

// Export pour utilisation
window.testLinkedInExtension = {
    runTests,
    testDashboard,
    testPosts,
    results: testResults
};