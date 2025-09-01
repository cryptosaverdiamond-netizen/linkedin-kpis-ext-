// Service Worker Background pour l'extension LinkedIn
importScripts('./config.js');
importScripts('./transport.js');

const transport = new Transport();

// Écoute des messages des content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.debug('[Background] Message reçu:', message);

  if (message.type === 'TRANSPORT_POST') {
    handleTransportPost(message, sendResponse);
    return true; // Indique que la réponse sera asynchrone
  }

  sendResponse({ ok: false, error: 'Type de message non reconnu' });
});

// Gestion des envois de données
async function handleTransportPost(message, sendResponse) {
  try {
    const { payload, trace_id } = message;
    
    if (!payload) {
      sendResponse({ ok: false, error: 'Payload manquant', trace_id });
      return;
    }

    console.debug(`[Background] Envoi vers ${CONFIG.WEBAPP_URL}`, { payload, trace_id });

    // Envoi via transport
    const result = await transport.postJSON(payload, trace_id);
    
    if (result.ok) {
      console.debug(`[Background] Succès (${trace_id}):`, result.res);
      sendResponse({ ok: true, res: result.res, trace_id });
    } else {
      console.error(`[Background] Erreur (${trace_id}):`, result.error);
      sendResponse({ ok: false, error: result.error, trace_id });
    }

  } catch (error) {
    console.error('[Background] Erreur fatale:', error);
    sendResponse({ 
      ok: false, 
      error: error.message, 
      trace_id: message.trace_id 
    });
  }
}

// Installation du service worker
chrome.runtime.onInstalled.addListener(() => {
  console.debug('[Background] Extension installée');
});

// Gestion des erreurs
chrome.runtime.onStartup.addListener(() => {
  console.debug('[Background] Extension démarrée');
});