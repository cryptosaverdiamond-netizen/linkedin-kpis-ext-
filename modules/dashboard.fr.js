// Module Dashboard - Scraping des KPI depuis LinkedIn Dashboard
(async function initDashboardModule() {
  console.debug('[Dashboard] Initialisation du module dashboard');
  
  let selectors = null;
  let debounceTimer = null;
  
  try {
    // Chargement des sélecteurs
    const response = await fetch(chrome.runtime.getURL('selectors/dashboard.fr.json'));
    selectors = await response.json();
    
    // Attendre que le DOM soit stable
    setTimeout(() => {
      startScraping();
    }, CONFIG.DEBOUNCE_MS);
    
  } catch (error) {
    console.error('[Dashboard] Erreur initialisation:', error);
  }

  /**
   * Démarrage du scraping avec debounce
   */
  function startScraping() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    debounceTimer = setTimeout(() => {
      scrapeDashboard();
    }, CONFIG.DEBOUNCE_MS);
  }

  /**
   * Scraping principal du dashboard
   */
  async function scrapeDashboard() {
    console.debug('[Dashboard] Début du scraping dashboard');
    
    try {
      const userId = await window.LinkedInScraper.getCurrentUserId();
      if (!userId) {
        console.error('[Dashboard] User ID non trouvé');
        return;
      }

      const kpiData = extractKPIData();
      if (Object.keys(kpiData).length > 0) {
        await sendDashboardData(kpiData, userId);
      } else {
        console.warn('[Dashboard] Aucun KPI extrait');
      }
      
    } catch (error) {
      console.error('[Dashboard] Erreur scraping:', error);
    }
  }

  /**
   * Extraction des 4 KPI requis
   */
  function extractKPIData() {
    const kpiData = {};
    
    // Extraction des 4 KPI requis
    kpiData.global_posts_impressions_last_7d = extractKPIValue('global_posts_impressions_last_7d');
    kpiData.followers = extractKPIValue('followers');
    kpiData.profile_views_90d = extractKPIValue('profile_views_90d');
    kpiData.search_appearances_last_week = extractKPIValue('search_appearances_last_week');
    
    console.debug('[Dashboard] KPI extraits:', kpiData);
    return kpiData;
  }

  /**
   * Extraction d'un KPI spécifique avec contexte
   */
  function extractKPIValue(kpiKey) {
    const keywords = selectors.context_keywords[kpiKey] || [];
    
    // D'abord essayer avec le contexte
    const valueWithContext = extractKPIWithContext(kpiKey, keywords);
    if (valueWithContext !== null) {
      console.debug(`[Dashboard] ${kpiKey} trouvé avec contexte:`, valueWithContext);
      return valueWithContext;
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

  /**
   * Extraction avec analyse contextuelle (logique validée dans les tests)
   */
  function extractKPIWithContext(kpiKey, keywords) {
    const numberElements = document.querySelectorAll('p.text-body-large-bold, .text-body-large-bold');
    
    for (const element of numberElements) {
      const value = extractNumericValue(element);
      if (value === null || value === 0) continue;
      
      // Analyser le contexte - parent direct d'abord
      const parentText = element.parentElement?.textContent?.toLowerCase() || '';
      const containerText = element.closest('div, section, article')?.textContent?.toLowerCase() || '';
      
      // Vérifier d'abord le parent direct, puis le conteneur
      const contexts = [parentText, containerText];
      
      for (const contextText of contexts) {
        if (!contextText) continue;
        
        // Vérifier si le contexte contient les mots-clés du KPI
        const hasKeyword = keywords.some(keyword => contextText.includes(keyword.toLowerCase()));
        
        if (hasKeyword) {
          // Vérification anti-collision pour éviter les faux positifs
          if (kpiKey === 'profile_views_90d') {
            // Pour profile views, s'assurer qu'on n'a pas "impressions" dans le contexte
            if (contextText.includes('impression')) {
              console.debug(`[Dashboard] Profile views - skip car contient "impressions":`, contextText.substring(0, 100));
              continue;
            }
          }
          
          if (kpiKey === 'global_posts_impressions_last_7d') {
            // Pour impressions, s'assurer qu'on a bien "impressions" ou "posts"
            if (!contextText.includes('impression') && !contextText.includes('post')) {
              console.debug(`[Dashboard] Impressions - skip car pas de "impressions":`, contextText.substring(0, 100));
              continue;
            }
          }
          
          console.debug(`[Dashboard] KPI ${kpiKey} trouvé par contexte:`, value, contextText.substring(0, 100));
          return value;
        }
      }
    }
    
    return null;
  }

  /**
   * Extraction de valeur numérique depuis un élément
   */
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
    const textValue = element.textContent?.trim();
    if (textValue) {
      const numericValue = Normalize.number(textValue);
      if (numericValue >= 0) return numericValue;
    }
    
    return null;
  }

  /**
   * Extraction fallback avec patterns regex
   */
  function extractFallbackValue(kpiKey) {
    const patternKey = `${kpiKey.split('_')[0]}_pattern`;
    const patterns = selectors.fallback_patterns[patternKey];
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

  /**
   * Envoi des données dashboard vers le serveur
   */
  async function sendDashboardData(kpiData, userId) {
    const traceId = generateUUIDv4();
    const now = new Date().toISOString();
    
    // Construction du payload selon le contrat
    const payload = {
      type: 'daily',
      company_id: CONFIG.COMPANY_ID,
      team_id: CONFIG.TEAM_ID,
      user_id: userId,
      date_yyyy_mm_dd: Normalize.getCurrentDateFR(),
      global_posts_impressions_last_7d: kpiData.global_posts_impressions_last_7d || 0,
      followers: kpiData.followers || 0,
      profile_views_90d: kpiData.profile_views_90d || 0,
      search_appearances_last_week: kpiData.search_appearances_last_week || 0,
      source_file: 'dashboard.fr.js',
      captured_at_iso: now,
      trace_id: traceId
    };
    
    // Validation du payload (basique)
    if (!validateDashboardPayload(payload)) {
      console.error('[Dashboard] Payload invalide:', payload);
      return;
    }
    
    console.debug('[Dashboard] Envoi payload:', payload);
    
    try {
      const result = await window.LinkedInScraper.sendData(payload, traceId);
      if (result.ok) {
        console.debug('[Dashboard] Données envoyées avec succès:', result.res);
      } else {
        console.error('[Dashboard] Erreur envoi:', result.error);
      }
    } catch (error) {
      console.error('[Dashboard] Exception envoi:', error);
    }
  }

  /**
   * Validation basique du payload dashboard
   */
  function validateDashboardPayload(payload) {
    const required = ['type', 'company_id', 'team_id', 'user_id'];
    for (const field of required) {
      if (!payload[field]) {
        console.error(`[Dashboard] Champ requis manquant: ${field}`);
        return false;
      }
    }
    return true;
  }
})();