// Content Script Principal - Router pour LinkedIn
(async function initContentScript() {
  console.debug('[Content] Initialisation du content script LinkedIn');
  
  // Chargement des dépendances
  await loadScript('core/config.js');
  await loadScript('utils/uuid.js');
  await loadScript('utils/normalize.js');
  
  // Vérification de la langue française
  if (!isFrenchPage()) {
    console.warn('[Content] Page non française détectée, scraping ignoré');
    return;
  }

  // Détection de l'URL et routage
  const currentUrl = window.location.href;
  console.debug('[Content] URL détectée:', currentUrl);

  if (currentUrl.includes('/in/') && currentUrl.includes('/recent-activity/all/')) {
    // Page des posts originaux
    const userId = extractUserIdFromUrl(currentUrl);
    if (userId) {
      await storeUserId(userId);
      await loadPostsModule(userId);
    } else {
      console.error('[Content] Impossible d\'extraire user_id de l\'URL');
    }
  } else if (currentUrl.includes('/dashboard/')) {
    // Page dashboard
    const userId = await extractUserIdFromDashboard() || await getStoredUserId();
    if (userId) {
      await loadDashboardModule(userId);
    } else {
      console.error('[Content] Impossible de déterminer user_id pour dashboard');
    }
  } else {
    console.debug('[Content] URL non supportée:', currentUrl);
  }
})();

/**
 * Chargement dynamique de script
 */
function loadScript(path) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(path);
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Vérification de la langue française
 */
function isFrenchPage() {
  const lang = document.documentElement.lang || document.querySelector('html')?.getAttribute('lang');
  if (lang && lang.startsWith('fr')) {
    return true;
  }
  
  // Vérification des libellés clés français
  const frenchIndicators = [
    'Vue de profil',
    'Vues de profil', 
    'Apparitions dans les recherches',
    'Impressions',
    'Réactions',
    'Commentaires',
    'Partages',
    'Abonnés'
  ];
  
  const pageText = document.body.textContent || '';
  return frenchIndicators.some(indicator => pageText.includes(indicator));
}

/**
 * Extraction du user_id depuis l'URL des posts
 */
function extractUserIdFromUrl(url) {
  const match = url.match(/\/in\/([^\/]+)\/recent-activity\/all/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Extraction du user_id depuis le dashboard
 */
function extractUserIdFromDashboard() {
  return new Promise((resolve) => {
    // Attendre que le DOM soit chargé
    setTimeout(() => {
      // Sélecteur pour le lien du profil
      const profileLink = document.querySelector('a[href*="/in/"]');
      if (profileLink) {
        const href = profileLink.getAttribute('href');
        const match = href.match(/\/in\/([^\/]+)/);
        if (match) {
          resolve(decodeURIComponent(match[1]));
          return;
        }
      }
      
      // Fallback: recherche dans tous les liens
      const profileElements = document.querySelectorAll('[href*="/in/"]');
      for (const element of profileElements) {
        const href = element.getAttribute('href');
        if (href && href.includes('/in/') && !href.includes('/recent-activity')) {
          const match = href.match(/\/in\/([^\/]+)/);
          if (match) {
            resolve(decodeURIComponent(match[1]));
            return;
          }
        }
      }
      
      resolve(null);
    }, 1000);
  });
}

/**
 * Stockage du user_id
 */
function storeUserId(userId) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ lastUserId: userId }, () => {
      console.debug('[Content] User ID stocké:', userId);
      resolve();
    });
  });
}

/**
 * Récupération du user_id stocké
 */
function getStoredUserId() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['lastUserId'], (result) => {
      resolve(result.lastUserId || null);
    });
  });
}

/**
 * Chargement du module posts
 */
async function loadPostsModule(userId) {
  console.debug('[Content] Chargement du module posts pour:', userId);
  try {
    await loadScript('modules/posts.fr.js');
    // Le module s'auto-initialise
  } catch (error) {
    console.error('[Content] Erreur chargement module posts:', error);
  }
}

/**
 * Chargement du module dashboard
 */
async function loadDashboardModule(userId) {
  console.debug('[Content] Chargement du module dashboard pour:', userId);
  try {
    await loadScript('modules/dashboard.fr.js');
    // Le module s'auto-initialise
  } catch (error) {
    console.error('[Content] Erreur chargement module dashboard:', error);
  }
}

/**
 * Fonction utilitaire pour envoyer des données via background
 */
function sendData(payload, traceId = null) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: 'TRANSPORT_POST',
      payload,
      trace_id: traceId
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Content] Erreur communication background:', chrome.runtime.lastError);
        resolve({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(response || { ok: false, error: 'Pas de réponse' });
      }
    });
  });
}

// Export des fonctions utilitaires
window.LinkedInScraper = {
  sendData,
  generateTraceId: () => generateUUIDv4(),
  getCurrentUserId: async () => {
    const url = window.location.href;
    if (url.includes('/recent-activity/all/')) {
      return extractUserIdFromUrl(url);
    } else if (url.includes('/dashboard/')) {
      return await extractUserIdFromDashboard() || await getStoredUserId();
    }
    return null;
  }
};