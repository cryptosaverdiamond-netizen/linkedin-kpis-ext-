// Système de découverte automatique des sélecteurs LinkedIn
class SelectorDiscovery {
  constructor() {
    this.discoveredSelectors = new Map();
    this.confidenceScores = new Map();
    this.fallbackPatterns = new Map();
    this.initializePatterns();
  }

  // Initialisation des patterns de recherche
  initializePatterns() {
    this.fallbackPatterns = new Map([
      ['followers', {
        keywords: ['followers', 'abonnés', 'connections', 'connexions'],
        patterns: [
          /(\d+)\s*(followers?|abonnés?|connections?|connexions?)/i,
          /(\d+)\s*personnes?\s*(suivent|follow)/i
        ]
      }],
      ['impressions', {
        keywords: ['impressions', 'vues', 'views', 'affichages'],
        patterns: [
          /(\d+)\s*(impressions?|vues?|views?|affichages?)/i,
          /(\d+)\s*fois\s*vu/i
        ]
      }],
      ['profile_views', {
        keywords: ['vues de profil', 'profile views', 'vues profil'],
        patterns: [
          /(\d+)\s*(vues?\s*de\s*profil|profile\s*views?)/i,
          /(\d+)\s*personnes?\s*ont\s*vu\s*votre\s*profil/i
        ]
      }],
      ['search_appearances', {
        keywords: ['apparitions recherches', 'search appearances', 'recherches'],
        patterns: [
          /(\d+)\s*(apparitions?\s*dans\s*les?\s*recherches?|search\s*appearances?)/i,
          /(\d+)\s*fois\s*trouvé\s*dans\s*les?\s*recherches?/i
        ]
      }],
      ['reactions', {
        keywords: ['réactions', 'reactions', 'likes', 'j\'aime'],
        patterns: [
          /(\d+)\s*(réactions?|reactions?|likes?|j'aime)/i
        ]
      }],
      ['comments', {
        keywords: ['commentaires', 'comments', 'réponses'],
        patterns: [
          /(\d+)\s*(commentaires?|comments?|réponses?)/i
        ]
      }],
      ['shares', {
        keywords: ['partages', 'shares', 'partagé'],
        patterns: [
          /(\d+)\s*(partages?|shares?|partagé)/i
        ]
      }]
    ]);
  }

  // Découverte automatique des sélecteurs
  async discoverSelectors() {
    console.debug('[SelectorDiscovery] Début de la découverte automatique');
    
    const selectors = {};
    
    // Découvrir les KPI du dashboard
    if (window.location.href.includes('/dashboard/')) {
      selectors.dashboard = await this.discoverDashboardSelectors();
    }
    
    // Découvrir les sélecteurs des posts
    if (window.location.href.includes('/recent-activity/')) {
      selectors.posts = await this.discoverPostSelectors();
    }
    
    // Sauvegarder les sélecteurs découverts
    this.saveDiscoveredSelectors(selectors);
    
    return selectors;
  }

  // Découverte des sélecteurs dashboard
  async discoverDashboardSelectors() {
    const dashboardSelectors = {};
    
    for (const [kpiKey, config] of this.fallbackPatterns) {
      if (['followers', 'impressions', 'profile_views', 'search_appearances'].includes(kpiKey)) {
        const selector = await this.findBestSelector(kpiKey, config);
        if (selector) {
          dashboardSelectors[kpiKey] = selector;
        }
      }
    }
    
    return dashboardSelectors;
  }

  // Découverte des sélecteurs posts
  async discoverPostSelectors() {
    const postSelectors = {};
    
    // Analyser les posts visibles pour identifier la structure
    const posts = this.findPostElements();
    
    if (posts.length > 0) {
      // Analyser le premier post pour identifier la structure
      const samplePost = posts[0];
      
      postSelectors.post_container = this.generateSelector(samplePost);
      postSelectors.post_id = this.findPostIdSelector(samplePost);
      postSelectors.metrics = this.findMetricsSelectors(samplePost);
    }
    
    return postSelectors;
  }

  // Trouver le meilleur sélecteur pour un KPI
  async findBestSelector(kpiKey, config) {
    console.debug(`[SelectorDiscovery] Recherche sélecteur pour: ${kpiKey}`);
    
    // 1. Essayer les sélecteurs spécifiques connus
    const specificSelector = this.trySpecificSelectors(kpiKey);
    if (specificSelector) {
      console.debug(`[SelectorDiscovery] Sélecteur spécifique trouvé pour ${kpiKey}:`, specificSelector);
      return specificSelector;
    }
    
    // 2. Recherche par pattern de texte
    const textSelector = this.findByTextPattern(kpiKey, config);
    if (textSelector) {
      console.debug(`[SelectorDiscovery] Sélecteur par texte trouvé pour ${kpiKey}:`, textSelector);
      return textSelector;
    }
    
         // 3. Recherche par attributs et contexte
     const contextSelector = this.findByContext(kpiKey, config);
     if (contextSelector) {
       console.debug(`[SelectorDiscovery] Sélecteur par contexte trouvé pour ${kpiKey}:`, contextSelector);
       return contextSelector;
     }
    
    console.warn(`[SelectorDiscovery] Aucun sélecteur trouvé pour ${kpiKey}`);
    return null;
  }

  // Essayer les sélecteurs spécifiques connus
  trySpecificSelectors(kpiKey) {
    const knownSelectors = {
      'followers': [
        '[data-test-id="followers-count"]',
        '.followers-count',
        '[aria-label*="followers"]',
        '[aria-label*="abonnés"]',
        '.pv-top-card-profile-picture__image + div .text-body-medium',
        '[data-section="top-card"] .text-body-medium'
      ],
      'impressions': [
        '[data-test-id="impressions"]',
        '.impressions-count',
        '[aria-label*="impressions"]',
        '[aria-label*="vues"]'
      ],
      'profile_views': [
        '[data-test-id="profile-views"]',
        '.profile-views',
        '[aria-label*="vues de profil"]',
        '[aria-label*="profile views"]'
      ],
      'search_appearances': [
        '[data-test-id="search-appearances"]',
        '.search-appearances',
        '[aria-label*="apparitions dans les recherches"]',
        '[aria-label*="search appearances"]'
      ]
    };
    
    const selectors = knownSelectors[kpiKey] || [];
    
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element && this.isValidDataElement(element, kpiKey)) {
          return selector;
        }
      } catch (error) {
        console.debug(`[SelectorDiscovery] Sélecteur échoué ${selector}:`, error);
      }
    }
    
    return null;
  }

  // Recherche par pattern de texte
  findByTextPattern(kpiKey, config) {
    const { patterns, keywords } = config;
    
    // Rechercher dans tout le document
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      NodeFilter.FILTER_ACCEPT,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent.trim();
      
      // Vérifier les patterns
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          const parent = node.parentElement;
          if (parent && this.isValidDataElement(parent, kpiKey)) {
            const selector = this.generateSelector(parent);
            console.debug(`[SelectorDiscovery] Pattern trouvé pour ${kpiKey}:`, text, selector);
            return selector;
          }
        }
      }
      
      // Vérifier les keywords
      for (const keyword of keywords) {
        if (text.toLowerCase().includes(keyword.toLowerCase())) {
          const parent = node.parentElement;
          if (parent && this.isValidDataElement(parent, kpiKey)) {
            const selector = this.generateSelector(parent);
            console.debug(`[SelectorDiscovery] Keyword trouvé pour ${kpiKey}:`, text, selector);
            return selector;
          }
        }
      }
    }
    
    return null;
  }

  // Recherche par contexte
  findByContext(kpiKey, config) {
    // Chercher dans les sections pertinentes
    const relevantSections = [
      '.pv-top-card',
      '.pv-profile-section',
      '.pv-dashboard-section',
      '[data-section*="analytics"]',
      '[data-section*="insights"]'
    ];
    
    for (const sectionSelector of relevantSections) {
      try {
        const section = document.querySelector(sectionSelector);
        if (section) {
          const selector = this.findInSection(section, kpiKey, config);
          if (selector) return selector;
        }
      } catch (error) {
        console.debug(`[SelectorDiscovery] Section échouée ${sectionSelector}:`, error);
      }
    }
    
    return null;
  }

  // Rechercher dans une section spécifique
  findInSection(section, kpiKey, config) {
    const { patterns } = config;
    
    // Chercher les éléments avec des nombres
    const numberElements = section.querySelectorAll('*');
    
    for (const element of numberElements) {
      const text = element.textContent.trim();
      
      // Vérifier si c'est un nombre valide
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          const number = parseInt(match[1]);
          if (number > 0 && this.isValidDataElement(element, kpiKey)) {
            const selector = this.generateSelector(element);
            console.debug(`[SelectorDiscovery] Élément valide trouvé dans section pour ${kpiKey}:`, text, selector);
            return selector;
          }
        }
      }
    }
    
    return null;
  }

  // Vérifier si un élément contient des données valides
  isValidDataElement(element, kpiKey) {
    if (!element) return false;
    
    const text = element.textContent.trim();
    
    // Vérifier qu'il contient un nombre
    const hasNumber = /\d+/.test(text);
    if (!hasNumber) return false;
    
    // Vérifier qu'il n'est pas trop long (éviter les paragraphes)
    if (text.length > 100) return false;
    
    // Vérifier qu'il n'est pas caché
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    
    return true;
  }

  // Générer un sélecteur unique pour un élément
  generateSelector(element) {
    if (!element || element === document.body) return null;
    
    let path = [];
    let current = element;
    let maxDepth = 10; // Éviter les sélecteurs trop longs
    
    while (current && current !== document.body && maxDepth > 0) {
      let selector = current.tagName.toLowerCase();
      
      // Ajouter l'ID si disponible
      if (current.id && current.id !== '') {
        selector = '#' + current.id;
        path.unshift(selector);
        break;
      }
      
      // Ajouter les classes
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(' ').filter(c => c.trim() !== '');
        if (classes.length > 0) {
          selector += '.' + classes.join('.');
        }
      }
      
      // Ajouter les attributs data-* importants
      const dataAttrs = ['data-test-id', 'data-section', 'data-urn', 'aria-label'];
      for (const attr of dataAttrs) {
        if (current.hasAttribute(attr)) {
          const value = current.getAttribute(attr);
          if (value) {
            selector += `[${attr}="${value}"]`;
            break;
          }
        }
      }
      
      path.unshift(selector);
      current = current.parentElement;
      maxDepth--;
    }
    
    return path.join(' > ');
  }

  // Trouver les éléments de posts
  findPostElements() {
    const postSelectors = [
      '.feed-shared-update-v2',
      '.feed-shared-post',
      '[data-urn*="urn:li:activity:"]',
      '.post-container'
    ];
    
    for (const selector of postSelectors) {
      try {
        const posts = document.querySelectorAll(selector);
        if (posts.length > 0) {
          return Array.from(posts);
        }
      } catch (error) {
        console.debug(`[SelectorDiscovery] Sélecteur post échoué ${selector}:`, error);
      }
    }
    
    return [];
  }

  // Trouver le sélecteur pour l'ID du post
  findPostIdSelector(postElement) {
    // Chercher l'URN dans les attributs
    const urnElement = postElement.querySelector('[data-urn]') || 
                      postElement.querySelector('a[href*="urn:li:activity:"]');
    
    if (urnElement) {
      return this.generateSelector(urnElement);
    }
    
    return null;
  }

  // Trouver les sélecteurs pour les métriques
  findMetricsSelectors(postElement) {
    const metrics = {};
    
    // Analyser le texte du post pour identifier les métriques
    const text = postElement.textContent;
    
    // Chercher les impressions
    const impressionsMatch = text.match(/(\d+)\s*(impressions?|vues?)/i);
    if (impressionsMatch) {
      const impressionsElement = this.findElementWithText(postElement, impressionsMatch[0]);
      if (impressionsElement) {
        metrics.impressions = this.generateSelector(impressionsElement);
      }
    }
    
    // Chercher les réactions
    const reactionsMatch = text.match(/(\d+)\s*(réactions?|reactions?|likes?)/i);
    if (reactionsMatch) {
      const reactionsElement = this.findElementWithText(postElement, reactionsMatch[0]);
      if (reactionsElement) {
        metrics.reactions = this.generateSelector(reactionsElement);
      }
    }
    
    // Chercher les commentaires
    const commentsMatch = text.match(/(\d+)\s*(commentaires?|comments?)/i);
    if (commentsMatch) {
      const commentsElement = this.findElementWithText(postElement, commentsMatch[0]);
      if (commentsElement) {
        metrics.comments = this.generateSelector(commentsElement);
      }
    }
    
    return metrics;
  }

  // Trouver un élément contenant un texte spécifique
  findElementWithText(parent, text) {
    const walker = document.createTreeWalker(
      parent,
      NodeFilter.SHOW_TEXT,
      NodeFilter.FILTER_ACCEPT,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.includes(text)) {
        return node.parentElement;
      }
    }
    
    return null;
  }

  // Sauvegarder les sélecteurs découverts
  saveDiscoveredSelectors(selectors) {
    try {
      chrome.storage.local.set({ 
        discoveredSelectors: selectors,
        discoveryTimestamp: Date.now()
      }, () => {
        console.debug('[SelectorDiscovery] Sélecteurs sauvegardés:', selectors);
      });
    } catch (error) {
      console.debug('[SelectorDiscovery] Erreur sauvegarde:', error);
      // Fallback localStorage si chrome.storage n'est pas disponible
      try {
        localStorage.setItem('linkedinSelectors', JSON.stringify(selectors));
        localStorage.setItem('linkedinSelectorsTimestamp', Date.now());
      } catch (localError) {
        console.debug('[SelectorDiscovery] Erreur localStorage:', localError);
      }
    }
  }

  // Charger les sélecteurs découverts
  async loadDiscoveredSelectors() {
    try {
      // Essayer chrome.storage d'abord
      if (typeof chrome !== 'undefined' && chrome.storage) {
        return new Promise((resolve) => {
          chrome.storage.local.get(['discoveredSelectors'], (result) => {
            resolve(result.discoveredSelectors || {});
          });
        });
      } else {
        // Fallback localStorage
        const stored = localStorage.getItem('linkedinSelectors');
        return stored ? JSON.parse(stored) : {};
      }
    } catch (error) {
      console.debug('[SelectorDiscovery] Erreur chargement:', error);
      return {};
    }
  }

  // Mode debug pour afficher tous les éléments potentiels
  debugMode() {
    console.log('[SelectorDiscovery] 🔍 MODE DEBUG ACTIVÉ');
    console.log('[SelectorDiscovery] Analyse de la page en cours...');
    
    const potentialElements = [];
    
    // Parcourir tous les éléments avec du texte
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      NodeFilter.FILTER_ACCEPT,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent.trim();
      
      // Chercher les éléments avec des nombres
      if (/\d+/.test(text) && text.length < 100) {
        const parent = node.parentElement;
        if (parent && this.isValidDataElement(parent)) {
          potentialElements.push({
            text: text,
            selector: this.generateSelector(parent),
            element: parent
          });
        }
      }
    }
    
    console.log('[SelectorDiscovery] Éléments potentiels trouvés:', potentialElements);
    
    // Grouper par type de données
    const grouped = this.groupElementsByType(potentialElements);
    console.log('[SelectorDiscovery] Éléments groupés par type:', grouped);
    
    return grouped;
  }

  // Grouper les éléments par type de données
  groupElementsByType(elements) {
    const grouped = {};
    
    for (const element of elements) {
      const text = element.text;
      
      // Classifier par type
      if (text.match(/\d+\s*(followers?|abonnés?|connections?)/i)) {
        if (!grouped.followers) grouped.followers = [];
        grouped.followers.push(element);
      } else if (text.match(/\d+\s*(impressions?|vues?)/i)) {
        if (!grouped.impressions) grouped.impressions = [];
        grouped.impressions.push(element);
      } else if (text.match(/\d+\s*(vues?\s*de\s*profil|profile\s*views?)/i)) {
        if (!grouped.profile_views) grouped.profile_views = [];
        grouped.profile_views.push(element);
      } else if (text.match(/\d+\s*(apparitions?\s*dans\s*les?\s*recherches?)/i)) {
        if (!grouped.search_appearances) grouped.search_appearances = [];
        grouped.search_appearances.push(element);
      } else if (text.match(/\d+\s*(réactions?|reactions?|likes?)/i)) {
        if (!grouped.reactions) grouped.reactions = [];
        grouped.reactions.push(element);
      } else if (text.match(/\d+\s*(commentaires?|comments?)/i)) {
        if (!grouped.comments) grouped.comments = [];
        grouped.comments.push(element);
      } else if (text.match(/\d+\s*(partages?|shares?)/i)) {
        if (!grouped.shares) grouped.shares = [];
        grouped.shares.push(element);
      } else {
        if (!grouped.other) grouped.other = [];
        grouped.other.push(element);
      }
    }
    
    return grouped;
  }

  // Valider un élément (version simplifiée)
  isValidDataElement(element) {
    if (!element) return false;
    
    const text = element.textContent.trim();
    const hasNumber = /\d+/.test(text);
    const notTooLong = text.length < 100;
    
    return hasNumber && notTooLong;
  }
}

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SelectorDiscovery;
} else {
  window.SelectorDiscovery = SelectorDiscovery;
}