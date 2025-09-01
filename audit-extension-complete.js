// AUDIT COMPLET DE L'EXTENSION LINKEDIN
// Script pour vérifier TOUS les éléments avant de valider

console.log('🔍 AUDIT COMPLET EXTENSION LINKEDIN - Démarrage...');

const AUDIT_CONFIG = {
    dashboard: {
        url_pattern: '/dashboard/',
        required_kpis: [
            'global_posts_impressions_last_7d',
            'followers', 
            'profile_views_90d',
            'search_appearances_last_week'
        ],
        kpi_keywords: {
            'global_posts_impressions_last_7d': ['impression', 'vue', 'reach', 'portée', '7 jour', '7 day'],
            'followers': ['follower', 'abonné', 'connection', 'connexion', 'réseau'],
            'profile_views_90d': ['vue de profil', 'profile view', 'profil vu', '90 jour', '90 day'],
            'search_appearances_last_week': ['recherche', 'search', 'apparition', 'appearance', 'semaine', 'week']
        }
    },
    posts: {
        url_pattern: '/recent-activity/all/',
        required_elements: [
            'post_containers',
            'post_urns',
            'reactions',
            'comments', 
            'shares',
            'timestamps'
        ],
        repost_keywords: ['repost', 'repartage', 'partagé', 'reposté', 'shared by']
    }
};

// Fonction principale d'audit
function auditExtension() {
    const url = window.location.href;
    console.log(`🌐 Audit de: ${url}`);
    
    const results = {
        url: url,
        timestamp: new Date().toISOString(),
        page_type: null,
        status: 'unknown',
        issues: [],
        warnings: [],
        success: [],
        details: {}
    };
    
    if (url.includes(AUDIT_CONFIG.dashboard.url_pattern)) {
        results.page_type = 'dashboard';
        return auditDashboard(results);
    } else if (url.includes(AUDIT_CONFIG.posts.url_pattern)) {
        results.page_type = 'posts';
        return auditPosts(results);
    } else {
        results.status = 'error';
        results.issues.push('Page non supportée pour l\'audit');
        return results;
    }
}

// Audit du dashboard
function auditDashboard(results) {
    console.log('\n📊 === AUDIT DASHBOARD ===');
    
    results.details = {
        kpi_found: {},
        selectors_tested: {},
        context_analysis: {}
    };
    
    // 1. Vérifier la présence des KPI
    const config = AUDIT_CONFIG.dashboard;
    
    config.required_kpis.forEach(kpi => {
        console.log(`\n🎯 Audit KPI: ${kpi}`);
        
        const kpiResult = {
            found: false,
            values: [],
            selectors_working: [],
            context_matches: []
        };
        
        // Tester les sélecteurs de l'extension
        const selectors = [
            '.text-body-large-bold.t-black',
            'div',
            '.text-body-large-bold',
            'p.text-body-large-bold',
            '[class*="text-body-large"]'
        ];
        
        selectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    kpiResult.selectors_working.push({
                        selector: selector,
                        count: elements.length
                    });
                }
            } catch (e) {
                console.warn(`Sélecteur invalide: ${selector}`);
            }
        });
        
        // Analyser le contexte pour ce KPI
        const keywords = config.kpi_keywords[kpi];
        const numberElements = Array.from(document.querySelectorAll('.text-body-large-bold, p.text-body-large-bold'))
            .filter(el => {
                const text = el.textContent?.trim();
                return text && /\d+/.test(text);
            });
        
        numberElements.forEach(element => {
            const value = element.textContent.trim();
            const container = element.closest('div, section, article') || element.parentElement;
            const contextText = container?.textContent?.toLowerCase() || '';
            
            const hasKeyword = keywords.some(keyword => contextText.includes(keyword.toLowerCase()));
            
            if (hasKeyword) {
                kpiResult.found = true;
                kpiResult.values.push(value);
                kpiResult.context_matches.push({
                    value: value,
                    context: contextText.substring(0, 100),
                    matched_keywords: keywords.filter(k => contextText.includes(k.toLowerCase()))
                });
            }
        });
        
        results.details.kpi_found[kpi] = kpiResult;
        
        // Résultats
        if (kpiResult.found) {
            console.log(`   ✅ KPI trouvé: ${kpiResult.values.join(', ')}`);
            results.success.push(`KPI ${kpi} détecté`);
        } else {
            console.log(`   ❌ KPI non trouvé`);
            results.issues.push(`KPI ${kpi} manquant`);
        }
    });
    
    // 2. Vérifier l'extraction du user_id
    console.log(`\n👤 Audit User ID:`);
    
    const profileLink = document.querySelector('a[href*="/in/"]');
    if (profileLink) {
        const href = profileLink.getAttribute('href');
        const match = href.match(/\/in\/([^\/]+)/);
        if (match) {
            console.log(`   ✅ User ID trouvé: ${match[1]}`);
            results.success.push(`User ID détecté: ${match[1]}`);
            results.details.user_id = match[1];
        }
    } else {
        console.log(`   ❌ User ID non trouvé`);
        results.issues.push('User ID manquant');
    }
    
    // 3. Vérifier la langue
    console.log(`\n🇫🇷 Audit Langue:`);
    const lang = document.documentElement.lang;
    if (lang && lang.startsWith('fr')) {
        console.log(`   ✅ Langue française détectée: ${lang}`);
        results.success.push('Page en français');
    } else {
        console.log(`   ⚠️ Langue non française: ${lang}`);
        results.warnings.push(`Langue détectée: ${lang}`);
    }
    
    // Statut final
    if (results.issues.length === 0) {
        results.status = 'success';
    } else if (results.issues.length <= 2) {
        results.status = 'warning';
    } else {
        results.status = 'error';
    }
    
    return results;
}

// Audit des posts
function auditPosts(results) {
    console.log('\n📝 === AUDIT POSTS ===');
    
    results.details = {
        containers: [],
        urns: [],
        metrics: {},
        reposts: [],
        timestamps: []
    };
    
    // 1. Vérifier les conteneurs de posts
    console.log(`\n📦 Audit Conteneurs:`);
    
    const containers = document.querySelectorAll('.feed-shared-update-v2');
    console.log(`   Conteneurs trouvés: ${containers.length}`);
    
    if (containers.length === 0) {
        results.issues.push('Aucun conteneur de post trouvé');
        results.status = 'error';
        return results;
    }
    
    results.success.push(`${containers.length} conteneurs détectés`);
    
    // 2. Analyser chaque post
    const postsToAnalyze = Array.from(containers).slice(0, 5);
    
    postsToAnalyze.forEach((container, index) => {
        console.log(`\n🎯 AUDIT POST ${index + 1}:`);
        
        const postAnalysis = {
            index: index + 1,
            urn: null,
            metrics: {},
            timestamp: null,
            is_repost: false,
            issues: []
        };
        
        // URN
        const urn = container.getAttribute('data-urn');
        if (urn && urn.includes('urn:li:activity:')) {
            postAnalysis.urn = urn;
            console.log(`   ✅ URN: ${urn}`);
        } else {
            postAnalysis.issues.push('URN manquant');
            console.log(`   ❌ URN non trouvé`);
        }
        
        // Métriques
        console.log(`   📊 Métriques:`);
        
        // Réactions
        const reactionsBtn = container.querySelector('button[aria-label*="réactions"]');
        if (reactionsBtn) {
            const reactionsMatch = reactionsBtn.getAttribute('aria-label').match(/(\d+)\s*réactions?/);
            if (reactionsMatch) {
                postAnalysis.metrics.reactions = parseInt(reactionsMatch[1]);
                console.log(`      ✅ Réactions: ${postAnalysis.metrics.reactions}`);
            }
        } else {
            postAnalysis.issues.push('Réactions non trouvées');
            console.log(`      ❌ Réactions non trouvées`);
        }
        
        // Commentaires
        const commentsBtn = container.querySelector('button[aria-label*="commentaires"]');
        if (commentsBtn) {
            const commentsMatch = commentsBtn.getAttribute('aria-label').match(/(\d+)\s*commentaires?/);
            if (commentsMatch) {
                postAnalysis.metrics.comments = parseInt(commentsMatch[1]);
                console.log(`      ✅ Commentaires: ${postAnalysis.metrics.comments}`);
            }
        } else {
            postAnalysis.issues.push('Commentaires non trouvés');
            console.log(`      ❌ Commentaires non trouvés`);
        }
        
        // Republications
        const sharesBtn = container.querySelector('button[aria-label*="republications"]');
        if (sharesBtn) {
            const sharesMatch = sharesBtn.getAttribute('aria-label').match(/(\d+)\s*republications?/);
            if (sharesMatch) {
                postAnalysis.metrics.shares = parseInt(sharesMatch[1]);
                console.log(`      ✅ Republications: ${postAnalysis.metrics.shares}`);
            }
        } else {
            console.log(`      ⚠️ Republications: 0 (normal si aucune)`);
        }
        
        // Timestamp
        const timeElement = container.querySelector('time[datetime], [class*="date"]');
        if (timeElement) {
            const datetime = timeElement.getAttribute('datetime') || timeElement.textContent;
            postAnalysis.timestamp = datetime;
            console.log(`      ✅ Timestamp: ${datetime}`);
        } else {
            postAnalysis.issues.push('Timestamp manquant');
            console.log(`      ❌ Timestamp non trouvé`);
        }
        
        // Détection repost
        const containerText = container.textContent.toLowerCase();
        const repostKeywords = AUDIT_CONFIG.posts.repost_keywords;
        postAnalysis.is_repost = repostKeywords.some(keyword => containerText.includes(keyword));
        
        if (postAnalysis.is_repost) {
            console.log(`      ⚠️ REPOST détecté - sera ignoré`);
            results.details.reposts.push(postAnalysis);
        }
        
        console.log(`      Issues: ${postAnalysis.issues.length}`);
        
        results.details.containers.push(postAnalysis);
        
        if (postAnalysis.urn) {
            results.details.urns.push(postAnalysis.urn);
        }
    });
    
    // 3. Vérifier l'extraction du user_id depuis l'URL
    console.log(`\n👤 Audit User ID:`);
    const urlMatch = window.location.href.match(/\/in\/([^\/]+)\/recent-activity\/all/);
    if (urlMatch) {
        console.log(`   ✅ User ID depuis URL: ${urlMatch[1]}`);
        results.success.push(`User ID détecté: ${urlMatch[1]}`);
        results.details.user_id = urlMatch[1];
    } else {
        console.log(`   ❌ User ID non extrait de l'URL`);
        results.issues.push('User ID manquant dans URL');
    }
    
    // Statut final
    const totalIssues = results.details.containers.reduce((sum, post) => sum + post.issues.length, 0);
    
    if (totalIssues === 0 && results.issues.length === 0) {
        results.status = 'success';
    } else if (totalIssues <= 3) {
        results.status = 'warning';
    } else {
        results.status = 'error';
    }
    
    return results;
}

// Générer le rapport final
function generateAuditReport(results) {
    console.log('\n📋 === RAPPORT D\'AUDIT ===');
    
    console.log(`🌐 URL: ${results.url}`);
    console.log(`📄 Type: ${results.page_type}`);
    console.log(`📊 Statut: ${results.status.toUpperCase()}`);
    
    if (results.success.length > 0) {
        console.log(`\n✅ SUCCÈS (${results.success.length}):`);
        results.success.forEach(item => console.log(`   • ${item}`));
    }
    
    if (results.warnings.length > 0) {
        console.log(`\n⚠️ AVERTISSEMENTS (${results.warnings.length}):`);
        results.warnings.forEach(item => console.log(`   • ${item}`));
    }
    
    if (results.issues.length > 0) {
        console.log(`\n❌ PROBLÈMES (${results.issues.length}):`);
        results.issues.forEach(item => console.log(`   • ${item}`));
    }
    
    // Recommandations
    console.log(`\n💡 RECOMMANDATIONS:`);
    
    if (results.status === 'success') {
        console.log(`   🎉 L'extension devrait fonctionner parfaitement sur cette page !`);
    } else if (results.status === 'warning') {
        console.log(`   ⚠️ L'extension peut fonctionner mais avec des limitations`);
        console.log(`   🔧 Vérifiez les avertissements ci-dessus`);
    } else {
        console.log(`   🚨 L'extension ne fonctionnera PAS correctement`);
        console.log(`   🛠️ Corrigez les problèmes identifiés avant de continuer`);
    }
    
    console.log(`\n💾 Résultats sauvegardés dans window.auditResults`);
    window.auditResults = results;
    
    console.log(`📋 Pour copier: copy(JSON.stringify(window.auditResults, null, 2))`);
    
    return results;
}

// Exécution automatique
console.log('\n🚀 Démarrage de l\'audit...');
const auditResults = auditExtension();
const finalReport = generateAuditReport(auditResults);

// Export des fonctions
window.LinkedInAudit = {
    audit: auditExtension,
    report: generateAuditReport,
    results: finalReport
};