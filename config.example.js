// Configuration d'exemple pour l'extension LinkedIn
// Copier ce fichier vers core/config.js et modifier les valeurs

const CONFIG = {
  // === CONFIGURATION OBLIGATOIRE ===
  
  // URL de votre webapp Google Apps Script
  WEBAPP_URL: "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",
  
  // Clé secrète pour l'authentification
  SECRET: "YOUR_SECRET_KEY_HERE",
  
  // Identifiants de votre organisation
  COMPANY_ID: "your_company_id",
  TEAM_ID: "your_team_id",
  
  // === PARAMÈTRES DE PERFORMANCE ===
  
  // Timeout pour les requêtes HTTP (en millisecondes)
  TIMEOUT_MS: 10000,
  
  // Nombre maximum de tentatives en cas d'erreur
  RETRIES: 3,
  
  // Délai entre les envois (en millisecondes)
  DEBOUNCE_MS: 1000,
  
  // Taille maximale des batches pour les posts
  BATCH_SIZE_MAX: 10,
  
  // === CONTRÔLE ===
  
  // Kill switch pour désactiver l'extension rapidement
  KILL_SWITCH: false,
  
  // === EXEMPLES DE VALEURS ===
  
  // WEBAPP_URL: "https://script.google.com/macros/s/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/exec"
  // SECRET: "my-super-secret-key-123"
  // COMPANY_ID: "acme-corp"
  // TEAM_ID: "marketing-team"
  
  // === NOTES ===
  
  // 1. WEBAPP_URL : Récupérer depuis votre Google Apps Script déployé
  // 2. SECRET : Choisir une clé forte et unique
  // 3. COMPANY_ID/TEAM_ID : Identifiants internes de votre organisation
  // 4. Ne pas commiter ce fichier avec vos vraies clés !
};

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else {
  window.CONFIG = CONFIG;
}