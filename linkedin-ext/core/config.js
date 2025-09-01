// Configuration de l'extension LinkedIn
const CONFIG = {
  // À configurer en build
  WEBAPP_URL: "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",
  SECRET: "YOUR_SECRET_KEY",
  
  // Paramètres de performance
  TIMEOUT_MS: 10000,
  RETRIES: 3,
  DEBOUNCE_MS: 1000,
  BATCH_SIZE_MAX: 10,
  
  // Kill switch pour désactiver l'extension
  KILL_SWITCH: false,
  
  // Company et team ID (à configurer)
  COMPANY_ID: "c1",
  TEAM_ID: "t1"
};

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else {
  window.CONFIG = CONFIG;
}
