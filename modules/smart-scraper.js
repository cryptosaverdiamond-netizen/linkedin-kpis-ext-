// Module de scraping intelligent avec découverte automatique des sélecteurs
class SmartScraper {
  constructor() {
    this.selectorDiscovery = null;
    this.discoveredSelectors = {};
    this.confidenceThreshold = 0.7;
    this.retryAttempts = 3;
  }

  // Initialisation du scraper intelligent
  async init() {
    try {
      // Charger le module de découverte
      if (typeof SelectorDiscovery !== 'undefined') {
        this.selectorDiscovery = new SelectorDiscovery();
      } else {
        console.warn('[SmartScraper] SelectorDiscovery non disponible, utilisation des sélecteurs par défaut');
      }
      
      // Charger les sélecteurs découverts précédemment
      await this.loadDiscoveredSelectors();
      
      console.debug('[SmartScraper] Initialisation terminée');
    } catch (error) {
      console.error('[SmartScraper] Erreur initialisation:', error);
    }
  }

  // Scraping intelligent des KPI dashboard
  async scrapeDashboardKPIs() {
    console.debug('[SmartScraper] Début du scraping intelligent dashboard');
    
    const kpiData = {};
    const requiredKPIs = [
      'global_posts_impressions_last_7d',
      'followers', 
      'profile_views_90d',
      'search_appearances_last_week'
    ];
    
    for (const kpiKey of requiredKPIs) {
      try {
        const value = await this.extractKPIValue(kpiKey);
        kpiData[kpiKey] = value;
        
        console.debug(`[SmartScraper] ${kpiKey}: ${value}`);
      } catch (error) {
        console.warn(`[SmartScraper] Erreur extraction ${kpiKey}:`, error);
        kpiData[kpiKey] = 0;
      }
    }
    
    return kpiData;
  }

  // Scraping intelligent des posts
  async scrapePosts() {
    console.debug('[SmartScraper] Début du scraping intelligent posts');
    
    const posts = [];
    const postElements = this.findPostElements();
    
    console.debug(`[SmartScraper] ${postElements.length} posts trouvés`);
    
    for (const postElement of postElements) {
      try {
        const post = await this.extractPostData(postElement);
        if (post && !this.isRepost(postElement)) {
          posts.push(post);
        }
      } catch (error) {
        console.debug('[SmartScraper] Erreur extraction post:', error);
      }
    }
    
    return posts;
  }

  // Extraction intelligente d'un KPI
  async extractKPIValue(kpiKey) {
    // 1. Essayer avec les sélecteurs découverts
    const discoveredValue = await this.tryDiscoveredSelector(kpiKey);
    if (discoveredValue !== null) {
      return discoveredValue;
    }
    
    // 2. Découverte automatique si activée
    if (this.selectorDiscovery) {
      const discoveredSelector = await this.discoverSelector(kpiKey);
      if (discoveredSelector) {
        const value = this.extractValueWithSelector(discoveredSelector);
        if (value !== null) {
          // Sauvegarder le sélecteur découvert
          await this.saveDiscoveredSelector(kpiKey, discoveredSelector);
          return value;
        }
      }
    }
    
    // 3. Fallback avec recherche par pattern
    const fallbackValue = this.extractByPattern(kpiKey);
    if (fallbackValue !== null) {
      return fallbackValue;
    }
    
    // 4. Valeur par défaut
    console.warn(`[SmartScraper] Aucune valeur trouvée pour ${kpiKey}, utilisation de 0`);
    return 0;
  }

  // Essayer avec un sélecteur découvert
  async tryDiscoveredSelector(kpiKey) {
    const selectors = this.discoveredSelectors.dashboard?.[kpiKey];
    if (!selectors) return null;
    
    // Essayer chaque sélecteur découvert
    for (const selector of selectors) {
      try {
        const value = this.extractValueWithSelector(selector);
        if (value !== null) {
          console.debug(`[SmartScraper] ${kpiKey} trouvé avec sélecteur découvert:`, selector, value);
          return value;
        }
      } catch (error) {
        console.debug(`[SmartScraper] Sélecteur découvert échoué ${selector}:`, error);
      }
    }
    
    return null;
  }

  // Découvrir un sélecteur pour un KPI
  async discoverSelector(kpiKey) {
    if (!this.selectorDiscovery) return null;
    
    try {
      console.debug(`[SmartScraper] Découverte de sélecteur pour ${kpiKey}`);
      
      // Lancer la découverte
      const selectors = await this.selectorDiscovery.discoverSelectors();
      
      if (selectors.dashboard && selectors.dashboard[kpiKey]) {
        return selectors.dashboard[kpiKey];
      }
      
      return null;
    } catch (error) {
      console.debug(`[SmartScraper] Erreur découverte sélecteur pour ${kpiKey}:`, error);
      return null;
    }
  }

  // Extraire une valeur avec un sélecteur
  extractValueWithSelector(selector) {
    try {
      const element = document.querySelector(selector);
      if (!element) return null;
      
      const value = this.extractNumericValue(element);
      return value;
    } catch (error) {
      console.debug(`[SmartScraper] Erreur extraction avec sélecteur ${selector}:`, error);
      return null;
    }
  }

  // Extraction par pattern de texte (fallback)
  extractByPattern(kpiKey) {
    const patterns = {
      'followers': [
        /(\d+)\s*(followers?|abonnés?|connections?)/i,
        /(\d+)\s*personnes?\s*(suivent|follow)/i
      ],
      'impressions': [
        /(\d+)\s*(impressions?|vues?|views?)/i,
        /(\d+)\s*fois\s*vu/i
      ],
      'profile_views': [
        /(\d+)\s*(vues?\s*de\s*profil|profile\s*views?)/i,
        /(\d+)\s*personnes?\s*ont\s*vu\s*votre\s*profil/i
      ],
      'search_appearances': [
        /(\d+)\s*(apparitions?\s*dans\s*les?\s*recherches?)/i,
        /(\d+)\s*fois\s*trouvé\s*dans\s*les?\s*recherches?/i
      ]
    };
    
    const kpiPatterns = patterns[kpiKey];
    if (!kpiPatterns) return null;
    
    const pageText = document.body.textContent;
    
    for (const pattern of kpiPatterns) {
      const match = pageText.match(pattern);
      if (match) {
        const value = parseInt(match[1]);
        if (value > 0) {
          console.debug(`[SmartScraper] ${kpiKey} trouvé par pattern:`, match[0], value);
          return value;
        }
      }
    }
    
    return null;
  }

  // Extraction des données d'un post
  async extractPostData(postElement) {
    const post = {};
    
    // Extraction du post_id
    post.post_id = this.extractPostId(postElement);
    if (!post.post_id) {
      console.debug('[SmartScraper] Post ID non trouvé, post ignoré');
      return null;
    }
    
    // Extraction des métriques
    post.impressions = this.extractPostMetric(postElement, 'impressions');
    post.reactions = this.extractPostMetric(postElement, 'reactions');
    post.comments = this.extractPostMetric(postElement, 'comments');
    post.shares = this.extractPostMetric(postElement, 'shares');
    post.reshares = this.extractPostMetric(postElement, 'reshares');
    
    // Extraction de la date
    post.created_at_iso = this.extractPostDate(postElement);
    
    // Détection de la langue
    post.lang = this.detectPostLanguage(postElement);
    
    // Calcul du taux d'engagement
    post.engagement_rate = this.calculateEngagementRate(post);
    
    // Marquer comme non-repost
    post.is_repost = false;
    
    return post;
  }

  // Extraction de l'ID du post
  extractPostId(postElement) {
    // 1. Essayer avec les sélecteurs découverts
    const discoveredSelector = this.discoveredSelectors.posts?.post_id;
    if (discoveredSelector) {
      const element = postElement.querySelector(discoveredSelector);
      if (element) {
        const urn = element.getAttribute('data-urn') || element.getAttribute('href');
        if (urn && urn.includes('urn:li:activity:')) {
          return urn;
        }
      }
    }
    
    // 2. Recherche par attributs
    const urnElement = postElement.querySelector('[data-urn]') || 
                      postElement.querySelector('a[href*="urn:li:activity:"]');
    
    if (urnElement) {
      const urn = urnElement.getAttribute('data-urn') || urnElement.getAttribute('href');
      if (urn && urn.includes('urn:li:activity:')) {
        return urn;
      }
    }
    
    return null;
  }

  // Extraction d'une métrique de post
  extractPostMetric(postElement, metricKey) {
    // 1. Essayer avec les sélecteurs découverts
    const discoveredSelector = this.discoveredSelectors.posts?.metrics?.[metricKey];
    if (discoveredSelector) {
      const element = postElement.querySelector(discoveredSelector);
      if (element) {
        const value = this.extractNumericValue(element);
        if (value !== null) return value;
      }
    }
    
    // 2. Recherche par pattern dans le texte du post
    const patterns = {
      'impressions': /(\d+)\s*(impressions?|vues?)/i,
      'reactions': /(\d+)\s*(réactions?|reactions?|likes?)/i,
      'comments': /(\d+)\s*(commentaires?|comments?)/i,
      'shares': /(\d+)\s*(partages?|shares?)/i,
      'reshares': /(\d+)\s*(repartages?|reshares?)/i
    };
    
    const pattern = patterns[metricKey];
    if (pattern) {
      const text = postElement.textContent;
      const match = text.match(pattern);
      if (match) {
        const value = parseInt(match[1]);
        if (value >= 0) return value;
      }
    }
    
    return 0;
  }

  // Extraction de la date du post
  extractPostDate(postElement) {
    // 1. Essayer avec les sélecteurs découverts
    const discoveredSelector = this.discoveredSelectors.posts?.created_at;
    if (discoveredSelector) {
      const element = postElement.querySelector(discoveredSelector);
      if (element) {
        const datetime = element.getAttribute('datetime');
        if (datetime) {
          return new Date(datetime).toISOString();
        }
      }
    }
    
    // 2. Recherche par attributs time
    const timeElement = postElement.querySelector('time[datetime]');
    if (timeElement) {
      const datetime = timeElement.getAttribute('datetime');
      if (datetime) {
        return new Date(datetime).toISOString();
      }
    }
    
    // 3. Fallback: date actuelle
    return new Date().toISOString();
  }

  // Détection de la langue du post
  detectPostLanguage(postElement) {
    const text = postElement.textContent.toLowerCase();
    
    const frenchWords = ['bonjour', 'salut', 'merci', 'très', 'avec', 'pour', 'dans', 'sur', 'par', 'de', 'la', 'le', 'les', 'un', 'une', 'et', 'ou', 'mais', 'donc', 'car'];
    const englishWords = ['hello', 'hi', 'thanks', 'very', 'with', 'for', 'in', 'on', 'by', 'the', 'a', 'an', 'and', 'or', 'but', 'so', 'because'];
    
    let frenchCount = 0;
    let englishCount = 0;
    
    for (const word of frenchWords) {
      if (text.includes(word)) frenchCount++;
    }
    
    for (const word of englishWords) {
      if (text.includes(word)) englishCount++;
    }
    
    if (frenchCount > englishCount) return 'fr';
    if (englishCount > frenchCount) return 'en';
    return 'other';
  }

  // Calcul du taux d'engagement
  calculateEngagementRate(post) {
    if (!post.impressions || post.impressions === 0) return 0;
    
    const totalEngagement = (post.reactions || 0) + (post.comments || 0) + (post.shares || 0);
    return totalEngagement / post.impressions;
  }

  // Vérifier si c'est un repost
  isRepost(postElement) {
    const text = postElement.textContent.toLowerCase();
    const repostIndicators = [
      'repost', 'repartage', 'partagé', 'reposté', 'reposté par',
      'shared by', 'reposted by', 'partagé par'
    ];
    
    return repostIndicators.some(indicator => text.includes(indicator));
  }

  // Trouver les éléments de posts
  findPostElements() {
    // 1. Essayer avec les sélecteurs découverts
    const discoveredSelector = this.discoveredSelectors.posts?.post_container;
    if (discoveredSelector) {
      try {
        const posts = document.querySelectorAll(discoveredSelector);
        if (posts.length > 0) {
          return Array.from(posts);
        }
      } catch (error) {
        console.debug(`[SmartScraper] Sélecteur découvert échoué ${discoveredSelector}:`, error);
      }
    }
    
    // 2. Sélecteurs par défaut
    const defaultSelectors = [
      '.feed-shared-update-v2',
      '.feed-shared-post',
      '[data-urn*="urn:li:activity:"]',
      '.post-container'
    ];
    
    for (const selector of defaultSelectors) {
      try {
        const posts = document.querySelectorAll(selector);
        if (posts.length > 0) {
          return Array.from(posts);
        }
      } catch (error) {
        console.debug(`[SmartScraper] Sélecteur par défaut échoué ${selector}:`, error);
      }
    }
    
    return [];
  }

  // Extraction d'une valeur numérique
  extractNumericValue(element) {
    if (!element) return null;
    
    // 1. Essayer depuis les attributs data
    const dataValue = element.getAttribute('data-value') || 
                     element.getAttribute('aria-label') ||
                     element.getAttribute('href');
    
    if (dataValue) {
      const numericValue = this.parseNumber(dataValue);
      if (numericValue !== null) return numericValue;
    }
    
    // 2. Essayer depuis le texte
    const textValue = element.textContent.trim();
    if (textValue) {
      const numericValue = this.parseNumber(textValue);
      if (numericValue !== null) return numericValue;
    }
    
    return null;
  }

  // Parser un nombre depuis du texte
  parseNumber(text) {
    if (!text || typeof text !== 'string') return null;
    
    // Supprimer les espaces et caractères non numériques sauf séparateurs
    let cleaned = text.replace(/\s/g, '').replace(/[^\d.,]/g, '');
    
    // Gestion des séparateurs français
    if (cleaned.includes(',')) {
      cleaned = cleaned.replace(/\s/g, '').replace(',', '.');
    } else if (cleaned.includes('.')) {
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        cleaned = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
      }
    }
    
    const result = parseFloat(cleaned);
    return isNaN(result) ? null : result;
  }

  // Sauvegarder un sélecteur découvert
  async saveDiscoveredSelector(kpiKey, selector) {
    try {
      if (!this.discoveredSelectors.dashboard) {
        this.discoveredSelectors.dashboard = {};
      }
      
      if (!this.discoveredSelectors.dashboard[kpiKey]) {
        this.discoveredSelectors.dashboard[kpiKey] = [];
      }
      
      // Ajouter le sélecteur s'il n'existe pas déjà
      if (!this.discoveredSelectors.dashboard[kpiKey].includes(selector)) {
        this.discoveredSelectors.dashboard[kpiKey].push(selector);
        
        // Sauvegarder dans le storage
        await this.saveDiscoveredSelectors();
        
        console.debug(`[SmartScraper] Sélecteur découvert sauvegardé pour ${kpiKey}:`, selector);
      }
    } catch (error) {
      console.debug('[SmartScraper] Erreur sauvegarde sélecteur découvert:', error);
    }
  }

  // Sauvegarder tous les sélecteurs découverts
  async saveDiscoveredSelectors() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ 
          discoveredSelectors: this.discoveredSelectors,
          discoveryTimestamp: Date.now()
        });
      } else {
        localStorage.setItem('linkedinSelectors', JSON.stringify(this.discoveredSelectors));
        localStorage.setItem('linkedinSelectorsTimestamp', Date.now());
      }
         } catch (error) {
       console.debug('[SmartScraper] Erreur sauvegarde sélecteurs:', error);
     }
   }

  // Charger les sélecteurs découverts
  async loadDiscoveredSelectors() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        return new Promise((resolve) => {
          chrome.storage.local.get(['discoveredSelectors'], (result) => {
            this.discoveredSelectors = result.discoveredSelectors || {};
            resolve();
          });
        });
      } else {
        const stored = localStorage.getItem('linkedinSelectors');
        this.discoveredSelectors = stored ? JSON.parse(stored) : {};
      }
    } catch (error) {
      console.debug('[SmartScraper] Erreur chargement sélecteurs:', error);
      this.discoveredSelectors = {};
    }
  }

  // Mode debug pour analyser la page
  debugMode() {
    console.log('[SmartScraper] 🔍 MODE DEBUG ACTIVÉ');
    
    if (this.selectorDiscovery) {
      return this.selectorDiscovery.debugMode();
    } else {
      console.log('[SmartScraper] SelectorDiscovery non disponible');
      return null;
    }
  }
}

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SmartScraper;
} else {
  window.SmartScraper = SmartScraper;
}