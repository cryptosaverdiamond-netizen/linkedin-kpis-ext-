// Module Dashboard - Scraping des KPI depuis LinkedIn
import('../core/config.js').then(() => {
  import('../utils/normalize.js').then(() => {
    import('../utils/uuid.js').then(() => {
      initDashboardModule();
    });
  });
});

let selectors = null;
let debounceTimer = null;

async function initDashboardModule() {
  console.debug('[Dashboard] Initialisation du module dashboard');
  
  try {
    // Chargement des sélecteurs
    const response = await fetch(chrome.runtime.getURL('selectors/dashboard.fr.json'));
    selectors = await response.json();
    
    // Démarrage du scraping avec debounce
    startScraping();
    
  } catch (error) {
    console.error('[Dashboard] Erreur initialisation:', error);
  }
}

function startScraping() {
  // Debounce pour éviter les appels multiples
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  debounceTimer = setTimeout(() => {
    scrapeDashboard();
  }, CONFIG.DEBOUNCE_MS);
}

async function scrapeDashboard() {
  console.debug('[Dashboard] Début du scraping dashboard');
  
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.error('[Dashboard] User ID non trouvé');
      return;
    }

    const kpiData = await extractKPIData();
    if (kpiData) {
      await sendDashboardData(kpiData, userId);
    }
    
  } catch (error) {
    console.error('[Dashboard] Erreur scraping:', error);
  }
}

async function getCurrentUserId() {
  // Essayer d'extraire depuis le DOM
  const profileLink = document.querySelector('a[href*="/in/"]');
  if (profileLink) {
    const href = profileLink.getAttribute('href');
    const match = href.match(/\/in\/([^\/]+)/);
    if (match) return match[1];
  }
  
  // Fallback au storage
  return new Promise((resolve) => {
    chrome.storage.local.get(['lastUserId'], (result) => {
      resolve(result.lastUserId || null);
    });
  });
}

async function extractKPIData() {
  const kpiData = {};
  
  // Extraction des impressions globales
  kpiData.global_posts_impressions_last_7d = extractKPIValue('global_posts_impressions_last_7d');
  
  // Extraction des followers
  kpiData.followers = extractKPIValue('followers');
  
  // Extraction des vues de profil
  kpiData.profile_views_90d = extractKPIValue('profile_views_90d');
  
  // Extraction des apparitions dans les recherches
  kpiData.search_appearances_last_week = extractKPIValue('search_appearances_last_week');
  
  console.debug('[Dashboard] KPI extraits:', kpiData);
  return kpiData;
}

function extractKPIValue(kpiKey) {
  const selectorList = selectors.kpi_selectors[kpiKey];
  
  for (const selector of selectorList) {
    try {
      const element = document.querySelector(selector);
      if (element) {
        const value = extractNumericValue(element);
        if (value !== null) {
          console.debug(`[Dashboard] ${kpiKey} trouvé avec sélecteur:`, selector, value);
          return value;
        }
      }
    } catch (error) {
      console.debug(`[Dashboard] Sélecteur échoué ${selector}:`, error);
    }
  }
  
  // Fallback avec patterns regex
  const fallbackValue = extractFallbackValue(kpiKey);
  if (fallbackValue !== null) {
    console.debug(`[Dashboard] ${kpiKey} trouvé avec fallback:`, fallbackValue);
    return fallbackValue;
  }
  
  console.warn(`[Dashboard] ${kpiKey} non trouvé`);
  return 0;
}

function extractNumericValue(element) {
  if (!element) return null;
  
  // Essayer d'extraire depuis l'attribut data ou aria-label
  const dataValue = element.getAttribute('data-value') || 
                   element.getAttribute('aria-label') ||
                   element.getAttribute('title');
  
  if (dataValue) {
    const numericValue = Normalize.number(dataValue);
    if (numericValue > 0) return numericValue;
  }
  
  // Essayer d'extraire depuis le texte
  const textValue = element.textContent.trim();
  if (textValue) {
    const numericValue = Normalize.number(textValue);
    if (numericValue > 0) return numericValue;
  }
  
  return null;
}

function extractFallbackValue(kpiKey) {
  const patterns = selectors.fallback_selectors[`${kpiKey.split('_')[0]}_pattern`];
  if (!patterns) return null;
  
  const pageText = document.body.textContent;
  
  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern, 'i');
      const match = pageText.match(regex);
      if (match) {
        const value = Normalize.number(match[0]);
        if (value > 0) return value;
      }
    } catch (error) {
      console.debug(`[Dashboard] Pattern regex échoué ${pattern}:`, error);
    }
  }
  
  return null;
}

async function sendDashboardData(kpiData, userId) {
  const traceId = generateUUIDv4();
  const now = new Date().toISOString();
  
  // Construction du payload
  const payload = {
    type: 'daily',
    company_id: CONFIG.COMPANY_ID,
    team_id: CONFIG.TEAM_ID,
    user_id: userId,
    date_yyyy_mm_dd: getCurrentDateFR(),
    global_posts_impressions_last_7d: kpiData.global_posts_impressions_last_7d,
    followers: kpiData.followers,
    profile_views_90d: kpiData.profile_views_90d,
    search_appearances_last_week: kpiData.search_appearances_last_week,
    source_file: 'dashboard.fr.js',
    captured_at_iso: now,
    trace_id: traceId
  };
  
  console.debug('[Dashboard] Envoi payload:', payload);
  
  try {
    const result = await window.LinkedInScraper.sendData(payload, traceId);
    if (result.ok) {
      console.debug('[Dashboard] Données envoyées avec succès:', result.res);
    } else {
      console.error('[Dashboard] Erreur envoi:', result.error);
    }
  } catch (error) {
    console.error('[Dashboard] Erreur envoi:', error);
  }
}

function getCurrentDateFR() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Export du module
export default {
  init: function(userId) {
    console.debug('[Dashboard] Module initialisé pour:', userId);
    startScraping();
  }
};