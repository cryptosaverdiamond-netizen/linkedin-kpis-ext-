// Module Posts - Scraping des posts originaux depuis LinkedIn
(async function initPostsModule() {
  console.debug('[Posts] Initialisation du module posts');
  
  let selectors = null;
  let throttleTimer = null;
  let processedPosts = new Set();
  
  try {
    // Chargement des sélecteurs
    const response = await fetch(chrome.runtime.getURL('selectors/posts.fr.json'));
    selectors = await response.json();
    
    // Attendre que le DOM soit stable
    setTimeout(() => {
      startScraping();
    }, CONFIG.DEBOUNCE_MS);
    
  } catch (error) {
    console.error('[Posts] Erreur initialisation:', error);
  }

  /**
   * Démarrage du scraping avec throttle
   */
  function startScraping() {
    if (throttleTimer) {
      clearTimeout(throttleTimer);
    }
    
    throttleTimer = setTimeout(() => {
      scrapePosts();
    }, CONFIG.DEBOUNCE_MS);
  }

  /**
   * Scraping principal des posts
   */
  async function scrapePosts() {
    console.debug('[Posts] Début du scraping posts');
    
    try {
      const userId = await window.LinkedInScraper.getCurrentUserId();
      if (!userId) {
        console.error('[Posts] User ID non trouvé');
        return;
      }

      const posts = await extractPosts();
      if (posts && posts.length > 0) {
        await sendPostsData(posts, userId);
      } else {
        console.debug('[Posts] Aucun post à traiter');
      }
      
    } catch (error) {
      console.error('[Posts] Erreur scraping:', error);
    }
  }

  /**
   * Extraction de tous les posts de la page
   */
  async function extractPosts() {
    const posts = [];
    const postContainers = findPostContainers();
    
    console.debug(`[Posts] ${postContainers.length} conteneurs trouvés`);
    
    for (const container of postContainers) {
      try {
        const post = await extractPostData(container);
        if (post && !post.is_repost && !processedPosts.has(post.post_id)) {
          posts.push(post);
          processedPosts.add(post.post_id);
        }
      } catch (error) {
        console.debug('[Posts] Erreur extraction post:', error);
      }
    }
    
    console.debug(`[Posts] ${posts.length} posts valides extraits`);
    return posts;
  }

  /**
   * Recherche des conteneurs de posts (logique validée)
   */
  function findPostContainers() {
    let containers = [];
    
    // Stratégie 1: Chercher les conteneurs avec feed-shared-update-v2
    let elements = document.querySelectorAll('.feed-shared-update-v2');
    if (elements.length > 0) {
      containers.push(...elements);
      console.debug(`[Posts] Trouvé ${elements.length} conteneurs avec .feed-shared-update-v2`);
      return containers;
    }
    
    // Stratégie 2: Chercher les conteneurs avec des classes contenant 'update'
    elements = document.querySelectorAll('div[class*="update-components"], div[class*="feed-shared"]');
    if (elements.length > 0) {
      containers.push(...elements);
      console.debug(`[Posts] Trouvé ${elements.length} conteneurs avec classes update/feed`);
      return containers;
    }
    
    // Fallback: essayer les sélecteurs configurés
    for (const selector of selectors.post_selectors.post_container) {
      try {
        elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          containers.push(...elements);
          console.debug(`[Posts] Fallback: Trouvé ${elements.length} avec ${selector}`);
          break;
        }
      } catch (error) {
        console.debug(`[Posts] Sélecteur échoué ${selector}:`, error);
      }
    }
    
    return containers;
  }

  /**
   * Extraction des données d'un post
   */
  async function extractPostData(container) {
    // Vérifier si c'est un repost
    if (Normalize.isRepost(container)) {
      console.debug('[Posts] Repost détecté, ignoré');
      return { is_repost: true };
    }
    
    const post = {};
    
    // Extraction du post_id (URN)
    post.post_id = extractPostId(container);
    if (!post.post_id) {
      console.debug('[Posts] Post ID non trouvé, post ignoré');
      return null;
    }
    
    // Extraction des métriques
    post.reactions = extractMetricValue(container, 'reactions');
    post.comments = extractMetricValue(container, 'comments'); 
    post.shares = extractMetricValue(container, 'shares');
    post.reshares = extractMetricValue(container, 'reshares');
    post.impressions = extractMetricValue(container, 'impressions');
    
    // Extraction de la date de création
    post.created_at_iso = extractCreatedAt(container);
    
    // Détection de la langue
    post.lang = detectLanguage(container);
    
    // Calcul du taux d'engagement
    post.engagement_rate = calculateEngagementRate(post);
    
    // Marquer comme non-repost
    post.is_repost = false;
    
    console.debug('[Posts] Post extrait:', {
      post_id: post.post_id,
      reactions: post.reactions,
      comments: post.comments,
      shares: post.shares
    });
    
    return post;
  }

  /**
   * Extraction de l'URN du post (logique validée)
   */
  function extractPostId(container) {
    // Stratégie 1: Chercher data-urn directement sur le conteneur
    let urn = container.getAttribute('data-urn');
    if (urn && urn.includes('urn:li:activity:')) {
      console.debug(`[Posts] URN trouvé sur conteneur:`, urn);
      return urn;
    }
    
    // Stratégie 2: Chercher dans tous les éléments enfants avec data-urn
    const urnElements = container.querySelectorAll('[data-urn]');
    for (const element of urnElements) {
      urn = element.getAttribute('data-urn');
      if (urn && urn.includes('urn:li:activity:')) {
        console.debug(`[Posts] URN trouvé dans enfant:`, urn);
        return urn;
      }
    }
    
    // Stratégie 3: Chercher dans les liens href
    const linkElements = container.querySelectorAll('a[href*="urn:li:activity:"]');
    for (const link of linkElements) {
      const href = link.getAttribute('href');
      const match = href.match(/urn:li:activity:[0-9]+/);
      if (match) {
        console.debug(`[Posts] URN trouvé dans href:`, match[0]);
        return match[0];
      }
    }
    
    console.warn(`[Posts] URN non trouvé pour le conteneur`);
    return null;
  }

  /**
   * Extraction d'une métrique spécifique (logique validée)
   */
  function extractMetricValue(container, metricKey) {
    const selectorList = selectors.post_selectors[metricKey] || [];
    
    // Stratégie spéciale pour les métriques basées sur aria-label
    if (metricKey === 'reactions') {
      const reactionsBtn = container.querySelector('button[aria-label*="réactions"]');
      if (reactionsBtn) {
        const match = reactionsBtn.getAttribute('aria-label').match(/(\d+)\s*réactions?/);
        if (match) {
          return parseInt(match[1]);
        }
      }
    }
    
    if (metricKey === 'comments') {
      const commentsBtn = container.querySelector('button[aria-label*="commentaires"]');
      if (commentsBtn) {
        const match = commentsBtn.getAttribute('aria-label').match(/(\d+)\s*commentaires?/);
        if (match) {
          return parseInt(match[1]);
        }
      }
    }
    
    if (metricKey === 'shares' || metricKey === 'reshares') {
      const sharesBtn = container.querySelector('button[aria-label*="republications"]');
      if (sharesBtn) {
        const match = sharesBtn.getAttribute('aria-label').match(/(\d+)\s*republications?/);
        if (match) {
          return parseInt(match[1]);
        }
      }
    }
    
    // Fallback: essayer les sélecteurs configurés
    for (const selector of selectorList) {
      try {
        const element = container.querySelector(selector);
        if (element) {
          const value = extractNumericValue(element);
          if (value !== null && value >= 0) {
            return value;
          }
        }
      } catch (error) {
        console.debug(`[Posts] Sélecteur ${metricKey} échoué ${selector}:`, error);
      }
    }
    
    return 0;
  }

  /**
   * Extraction de valeur numérique depuis un élément
   */
  function extractNumericValue(element) {
    if (!element) return null;
    
    // Essayer d'extraire depuis l'attribut aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      const numericValue = Normalize.number(ariaLabel);
      if (numericValue >= 0) return numericValue;
    }
    
    // Essayer d'extraire depuis le texte
    const textValue = element.textContent?.trim();
    if (textValue) {
      const numericValue = Normalize.number(textValue);
      if (numericValue >= 0) return numericValue;
    }
    
    return null;
  }

  /**
   * Extraction de la date de création (logique améliorée)
   */
  function extractCreatedAt(container) {
    for (const selector of selectors.post_selectors.created_at) {
      try {
        const element = container.querySelector(selector);
        if (element) {
          const datetime = element.getAttribute('datetime');
          if (datetime) {
            return new Date(datetime).toISOString();
          }
          
          const textValue = element.textContent?.trim();
          if (textValue) {
            // Chercher les patterns de date LinkedIn (ex: "1 mois •", "Il y a 4 mois")
            const datePatterns = [
              /(\d+)\s*(mois|jour|semaine|an|minute|heure)s?\s*•/,
              /Il y a\s+(\d+)\s*(mois|jour|semaine|an|minute|heure)/,
              /(\d+)\s*(mois|jour|semaine|an|minute|heure)s?\s*$/
            ];
            
            for (const pattern of datePatterns) {
              const match = textValue.match(pattern);
              if (match) {
                console.debug(`[Posts] Date extraite: "${match[0]}" du texte: "${textValue}"`);
                // Pour l'instant, retourner la date actuelle
                // TODO: Calculer la vraie date basée sur la période
                return new Date().toISOString();
              }
            }
          }
        }
      } catch (error) {
        console.debug(`[Posts] Sélecteur created_at échoué ${selector}:`, error);
      }
    }
    
    // Fallback: date actuelle
    return new Date().toISOString();
  }

  /**
   * Détection de la langue du post
   */
  function detectLanguage(container) {
    const text = container.textContent.toLowerCase();
    
    // Compter les mots français vs anglais
    let frenchCount = 0;
    let englishCount = 0;
    
    for (const word of selectors.language_detection.french_indicators) {
      if (text.includes(word)) frenchCount++;
    }
    
    for (const word of selectors.language_detection.english_indicators) {
      if (text.includes(word)) englishCount++;
    }
    
    if (frenchCount > englishCount) return 'fr';
    if (englishCount > frenchCount) return 'en';
    return 'other';
  }

  /**
   * Calcul du taux d'engagement
   */
  function calculateEngagementRate(post) {
    if (!post.impressions || post.impressions === 0) return 0;
    
    const totalEngagement = (post.reactions || 0) + (post.comments || 0) + (post.shares || 0);
    const rate = totalEngagement / post.impressions;
    
    return Math.round(rate * 10000) / 10000; // 4 décimales
  }

  /**
   * Envoi des données posts vers le serveur
   */
  async function sendPostsData(posts, userId) {
    const traceId = generateUUIDv4();
    const now = new Date().toISOString();
    
    // Préparation des posts avec métadonnées
    const postsWithMetadata = posts.map(post => ({
      type: 'post',
      company_id: CONFIG.COMPANY_ID,
      team_id: CONFIG.TEAM_ID,
      user_id: userId,
      ...post,
      captured_at_iso: now,
      trace_id: traceId
    }));
    
    // Validation basique
    const validPosts = postsWithMetadata.filter(post => validatePostPayload(post));
    
    if (validPosts.length === 0) {
      console.warn('[Posts] Aucun post valide à envoyer');
      return;
    }
    
    // Envoi par batch
    const batches = chunkArray(validPosts, CONFIG.BATCH_SIZE_MAX);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchTraceId = `${traceId}-batch-${i + 1}`;
      
      const payload = batch.length === 1 ? batch[0] : {
        type: 'post',
        items: batch
      };
      
      console.debug(`[Posts] Envoi batch ${i + 1}/${batches.length}:`, {
        count: batch.length,
        trace_id: batchTraceId
      });
      
      try {
        const result = await window.LinkedInScraper.sendData(payload, batchTraceId);
        if (result.ok) {
          console.debug(`[Posts] Batch ${i + 1} envoyé avec succès`);
        } else {
          console.error(`[Posts] Erreur envoi batch ${i + 1}:`, result.error);
        }
        
        // Attendre entre les batches pour respecter le throttle
        if (i < batches.length - 1) {
          await delay(CONFIG.DEBOUNCE_MS);
        }
        
      } catch (error) {
        console.error(`[Posts] Exception envoi batch ${i + 1}:`, error);
      }
    }
  }

  /**
   * Validation basique du payload post
   */
  function validatePostPayload(post) {
    const required = ['type', 'company_id', 'team_id', 'user_id', 'post_id'];
    for (const field of required) {
      if (!post[field]) {
        console.error(`[Posts] Champ requis manquant: ${field}`);
        return false;
      }
    }
    
    // Vérifier le format de l'URN
    if (!post.post_id.match(/^urn:li:activity:\d+$/)) {
      console.error(`[Posts] Format URN invalide: ${post.post_id}`);
      return false;
    }
    
    return true;
  }

  /**
   * Découpage en chunks
   */
  function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Délai pour throttling
   */
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
})();