// Module Posts - Scraping des posts originaux depuis LinkedIn
import('../core/config.js').then(() => {
  import('../utils/normalize.js').then(() => {
    import('../utils/uuid.js').then(() => {
      initPostsModule();
    });
  });
});

let selectors = null;
let throttleTimer = null;
let processedPosts = new Set();

async function initPostsModule() {
  console.debug('[Posts] Initialisation du module posts');
  
  try {
    // Chargement des sélecteurs
    const response = await fetch(chrome.runtime.getURL('selectors/posts.fr.json'));
    selectors = await response.json();
    
    // Démarrage du scraping avec throttle
    startScraping();
    
  } catch (error) {
    console.error('[Posts] Erreur initialisation:', error);
  }
}

function startScraping() {
  // Throttle pour limiter le rythme d'envoi
  if (throttleTimer) {
    clearTimeout(throttleTimer);
  }
  
  throttleTimer = setTimeout(() => {
    scrapePosts();
  }, CONFIG.DEBOUNCE_MS);
}

async function scrapePosts() {
  console.debug('[Posts] Début du scraping posts');
  
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.error('[Posts] User ID non trouvé');
      return;
    }

    const posts = await extractPosts();
    if (posts && posts.length > 0) {
      await sendPostsData(posts, userId);
    }
    
  } catch (error) {
    console.error('[Posts] Erreur scraping:', error);
  }
}

async function getCurrentUserId() {
  // Extraire depuis l'URL
  const url = window.location.href;
  const match = url.match(/\/in\/([^\/]+)\/recent-activity\/all/);
  return match ? match[1] : null;
}

async function extractPosts() {
  const posts = [];
  const postContainers = findPostContainers();
  
  console.debug(`[Posts] ${postContainers.length} posts trouvés`);
  
  for (const container of postContainers) {
    try {
      const post = await extractPostData(container);
      if (post && !processedPosts.has(post.post_id)) {
        posts.push(post);
        processedPosts.add(post.post_id);
      }
    } catch (error) {
      console.debug('[Posts] Erreur extraction post:', error);
    }
  }
  
  return posts;
}

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
  
  // Stratégie 3: Chercher par structure (header + contenu)
  elements = document.querySelectorAll('div.update-components-header');
  if (elements.length > 0) {
    elements.forEach(header => {
      const container = header.closest('div[id*="ember"], article, div[class*="artdeco"]');
      if (container && !containers.includes(container)) {
        containers.push(container);
      }
    });
    console.debug(`[Posts] Trouvé ${containers.length} conteneurs par structure header`);
    return containers;
  }
  
  // Fallback: essayer les sélecteurs originaux
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

async function extractPostData(container) {
  // Vérifier si c'est un repost
  if (Normalize.isRepost(container)) {
    console.debug('[Posts] Repost détecté, ignoré');
    return null;
  }
  
  const post = {};
  
  // Extraction du post_id
  post.post_id = extractPostId(container);
  if (!post.post_id) {
    console.debug('[Posts] Post ID non trouvé');
    return null;
  }
  
  // Extraction des métriques
  post.impressions = extractMetricValue(container, 'impressions');
  post.reactions = extractMetricValue(container, 'reactions');
  post.comments = extractMetricValue(container, 'comments');
  post.shares = extractMetricValue(container, 'shares');
  post.reshares = extractMetricValue(container, 'reshares');
  
  // Extraction de la date de création
  post.created_at_iso = extractCreatedAt(container);
  
  // Détection de la langue
  post.lang = detectLanguage(container);
  
  // Calcul du taux d'engagement
  post.engagement_rate = calculateEngagementRate(post);
  
  // Marquer comme non-repost
  post.is_repost = false;
  
  return post;
}

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
  
  // Stratégie 4: Chercher dans les IDs
  const elementsWithId = container.querySelectorAll('[id*="urn:li:activity:"]');
  for (const element of elementsWithId) {
    const id = element.id;
    const match = id.match(/urn:li:activity:[0-9]+/);
    if (match) {
      console.debug(`[Posts] URN trouvé dans ID:`, match[0]);
      return match[0];
    }
  }
  
  // Fallback: utiliser les sélecteurs originaux
  for (const selector of selectors.post_selectors.post_id) {
    try {
      const element = container.querySelector(selector);
      if (element) {
        urn = element.getAttribute('data-urn') || 
             element.getAttribute('href') ||
             element.textContent;
        
        if (urn && urn.includes('urn:li:activity:')) {
          console.debug(`[Posts] URN trouvé avec sélecteur ${selector}:`, urn);
          return urn;
        }
      }
    } catch (error) {
      console.debug(`[Posts] Sélecteur post_id échoué ${selector}:`, error);
    }
  }
  
  console.warn(`[Posts] URN non trouvé pour le conteneur`, container);
  return null;
}

function extractMetricValue(container, metricKey) {
  const selectorList = selectors.post_selectors[metricKey];
  
  for (const selector of selectorList) {
    try {
      const element = container.querySelector(selector);
      if (element) {
        const value = extractNumericValue(element);
        if (value !== null) {
          return value;
        }
      }
    } catch (error) {
      console.debug(`[Posts] Sélecteur ${metricKey} échoué ${selector}:`, error);
    }
  }
  
  // Fallback avec patterns regex
  return extractFallbackMetric(container, metricKey);
}

function extractNumericValue(element) {
  if (!element) return null;
  
  // Essayer d'extraire depuis l'attribut data ou aria-label
  const dataValue = element.getAttribute('data-value') || 
                   element.getAttribute('aria-label') ||
                   element.getAttribute('title');
  
  if (dataValue) {
    const numericValue = Normalize.number(dataValue);
    if (numericValue >= 0) return numericValue;
  }
  
  // Essayer d'extraire depuis le texte
  const textValue = element.textContent.trim();
  
  if (textValue) {
    const numericValue = Normalize.number(textValue);
    if (numericValue >= 0) return numericValue;
  }
  
  return 0;
}

function extractFallbackMetric(container, metricKey) {
  const patterns = selectors.fallback_patterns[metricKey];
  if (!patterns) return 0;
  
  const containerText = container.textContent;
  
  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern, 'i');
      const match = containerText.match(regex);
      if (match) {
        const value = Normalize.number(match[0]);
        if (value >= 0) return value;
      }
    } catch (error) {
      console.debug(`[Posts] Pattern regex échoué ${pattern}:`, error);
    }
  }
  
  return 0;
}

function extractCreatedAt(container) {
  for (const selector of selectors.post_selectors.created_at) {
    try {
      const element = container.querySelector(selector);
      if (element) {
        const datetime = element.getAttribute('datetime');
        if (datetime) {
          return new Date(datetime).toISOString();
        }
        
        const textValue = element.textContent.trim();
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
              return match[0]; // Retourner juste la date extraite (ex: "1 mois •")
            }
          }
          
          const dateValue = Normalize.date(textValue);
          if (dateValue) {
            return new Date(dateValue).toISOString();
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

function calculateEngagementRate(post) {
  if (!post.impressions || post.impressions === 0) return 0;
  
  const totalEngagement = (post.reactions || 0) + (post.comments || 0) + (post.shares || 0);
  return totalEngagement / post.impressions;
}

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
  
  // Envoi par batch
  const batches = chunkArray(postsWithMetadata, CONFIG.BATCH_SIZE_MAX);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchTraceId = `${traceId}-batch-${i + 1}`;
    
    const payload = {
      items: batch
    };
    
    console.debug(`[Posts] Envoi batch ${i + 1}/${batches.length}:`, payload);
    
    try {
      const result = await window.LinkedInScraper.sendData(payload, batchTraceId);
      if (result.ok) {
        console.debug(`[Posts] Batch ${i + 1} envoyé avec succès:`, result.res);
      } else {
        console.error(`[Posts] Erreur envoi batch ${i + 1}:`, result.error);
      }
      
      // Attendre entre les batches pour respecter le throttle
      if (i < batches.length - 1) {
        await delay(CONFIG.DEBOUNCE_MS);
      }
      
    } catch (error) {
      console.error(`[Posts] Erreur envoi batch ${i + 1}:`, error);
    }
  }
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Export du module
export default {
  init: function(userId) {
    console.debug('[Posts] Module initialisé pour:', userId);
    startScraping();
  }
};