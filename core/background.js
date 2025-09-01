// Background Service Worker - Gestion des communications
importScripts('./config.js', './transport.js');

// Instance du transport
let transport = null;

// Initialisation
chrome.runtime.onStartup.addListener(initialize);
chrome.runtime.onInstalled.addListener(initialize);

function initialize() {
  console.debug('[Background] Extension LinkedIn initialisée');
  transport = new Transport(CONFIG);
}

// Écoute des messages des content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRANSPORT_POST') {
    handleTransportPost(message, sender, sendResponse);
    return true; // Réponse asynchrone
  }
  
  if (message.type === 'GET_CONFIG') {
    sendResponse({ config: CONFIG });
    return false;
  }
});

/**
 * Gestion des envois de données
 */
async function handleTransportPost(message, sender, sendResponse) {
  const { payload, trace_id } = message;
  
  console.debug('[Background] Envoi de données', { 
    type: payload.type || 'unknown',
    trace_id,
    tab: sender.tab?.id 
  });

  try {
    // Initialiser transport si nécessaire
    if (!transport) {
      transport = new Transport(CONFIG);
    }

    // Envoi des données
    const result = await transport.postJSON(payload, trace_id);
    
    if (result.ok) {
      console.debug('[Background] Données envoyées avec succès', { 
        trace_id, 
        response: result.res 
      });
    } else {
      console.error('[Background] Échec envoi données', { 
        trace_id, 
        error: result.error 
      });
    }

    sendResponse({
      ok: result.ok,
      res: result.res,
      error: result.error,
      trace_id
    });

  } catch (error) {
    console.error('[Background] Exception lors de l\'envoi', { 
      error: error.message, 
      trace_id 
    });
    
    sendResponse({
      ok: false,
      error: error.message,
      trace_id
    });
  }
}

// Gestion des erreurs non capturées
self.addEventListener('error', (event) => {
  console.error('[Background] Erreur non capturée:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[Background] Promise rejetée:', event.reason);
  event.preventDefault();
});

console.debug('[Background] Service worker chargé');

// Test temporaire de chargement des modules
try {
  console.log('=== TEST DE CHARGEMENT DES MODULES ===');
  console.log('1. CONFIG disponible:', typeof CONFIG !== 'undefined' ? '✅' : '❌');
  console.log('2. Transport disponible:', typeof Transport !== 'undefined' ? '✅' : '❌');
  
  if (typeof CONFIG !== 'undefined' && typeof Transport !== 'undefined') {
    const testTransport = new Transport(CONFIG);
    console.log('3. Transport initialisé: ✅');
  } else {
    console.log('3. Transport non initialisé: ❌');
  }
  console.log('=== FIN DES TESTS ===');
} catch (error) {
  console.error('[Background] Erreur test chargement:', error);
}