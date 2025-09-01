// Content Script Principal - Router pour LinkedIn
import('./core/config.js').then(() => {
  import('./utils/uuid.js').then(() => {
    import('./utils/normalize.js').then(() => {
      initContentScript();
    });
  });
});

function initContentScript() {
  console.debug('[Content] Initialisation du content script LinkedIn');
  
  // Vérification de la langue
  if (!isFrenchPage()) {
    console.warn('[Content] Page non française détectée, scraping ignoré');
    return;
  }

  // Détection de l'URL et routage
  const currentUrl = window.location.href;
  let userId = null;

  if (currentUrl.includes('/in/') && currentUrl.includes('/recent-activity/all/')) {
    // Page des posts originaux
    userId = extractUserIdFromUrl(currentUrl);
    if (userId) {
      storeUserId(userId);
      loadPostsModule(userId);
    }
  } else if (currentUrl.includes('/dashboard/')) {
    // Page dashboard
    userId = extractUserIdFromDashboard() || getStoredUserId();
    if (userId) {
      loadDashboardModule(userId);
    } else {
      console.error('[Content] Impossible de déterminer user_id pour dashboard');
    }
  } else {
    console.debug('[Content] URL non supportée:', currentUrl);
  }
}

// Vérification de la langue française
function isFrenchPage() {
  const lang = document.documentElement.lang || document.querySelector('html').getAttribute('lang');
  if (lang && lang.startsWith('fr')) {
    return true;
  }
  
  // Vérification des libellés clés
  const frenchIndicators = [
    'Vue de profil',
    'Vues de profil',
    'Apparitions dans les recherches',
    'Impressions',
    'Réactions',
    'Commentaires',
    'Partages'
  ];
  
  return frenchIndicators.some(indicator => 
    document.body.textContent.includes(indicator)
  );
}

// Extraction du user_id depuis l'URL des posts
function extractUserIdFromUrl(url) {
  const match = url.match(/\/in\/([^\/]+)\/recent-activity\/all/);
  return match ? match[1] : null;
}

// Extraction du user_id depuis le dashboard
function extractUserIdFromDashboard() {
  // Sélecteur pour le lien du profil
  const profileLink = document.querySelector('a[href*="/in/"]');
  if (profileLink) {
    const href = profileLink.getAttribute('href');
    const match = href.match(/\/in\/([^\/]+)/);
    return match ? match[1] : null;
  }
  
  // Fallback: recherche dans le DOM
  const profileElements = document.querySelectorAll('[href*="/in/"]');
  for (const element of profileElements) {
    const href = element.getAttribute('href');
    if (href && href.includes('/in/') && !href.includes('/recent-activity')) {
      const match = href.match(/\/in\/([^\/]+)/);
      if (match) return match[1];
    }
  }
  
  return null;
}

// Stockage du user_id
function storeUserId(userId) {
  chrome.storage.local.set({ lastUserId: userId }, () => {
    console.debug('[Content] User ID stocké:', userId);
  });
}

// Récupération du user_id stocké
function getStoredUserId() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['lastUserId'], (result) => {
      resolve(result.lastUserId || null);
    });
  });
}

// Chargement du module posts
async function loadPostsModule(userId) {
  console.debug('[Content] Chargement du module posts pour:', userId);
  try {
    const module = await import('./modules/posts.fr.js');
    if (module.default && typeof module.default.init === 'function') {
      module.default.init(userId);
    }
  } catch (error) {
    console.error('[Content] Erreur chargement module posts:', error);
  }
}

// Chargement du module dashboard
async function loadDashboardModule(userId) {
  console.debug('[Content] Initialisation du module dashboard pour:', userId);
  try {
    const module = await import('./modules/dashboard.fr.js');
    if (module.default && typeof module.default.init === 'function') {
      module.default.init(userId);
    }
  } catch (error) {
    console.error('[Content] Erreur chargement module dashboard:', error);
  }
}

// Fonction utilitaire pour envoyer des données via background
async function sendData(payload, traceId = null) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: 'TRANSPORT_POST',
      payload,
      trace_id: traceId
    }, (response) => {
      resolve(response);
    });
  });
}

// Export des fonctions utilitaires
window.LinkedInScraper = {
  sendData,
  generateTraceId: () => window.generateUUIDv4()
};