// Utilitaires de normalisation pour les données françaises
const Normalize = {
  /**
   * Normalisation des nombres français
   * Gère: "1 234", "1,234", "1.234", "1,5" etc.
   */
  number(value) {
    if (typeof value === 'number') return value;
    if (!value || typeof value !== 'string') return 0;
    
    // Supprimer les espaces et caractères non numériques sauf séparateurs
    let cleaned = value.replace(/\s/g, '').replace(/[^\d.,]/g, '');
    
    if (!cleaned) return 0;
    
    // Gestion des séparateurs français
    if (cleaned.includes(',') && cleaned.includes('.')) {
      // Format: 1.234,56 (européen) ou 1,234.56 (américain)
      const lastComma = cleaned.lastIndexOf(',');
      const lastDot = cleaned.lastIndexOf('.');
      
      if (lastComma > lastDot) {
        // Format européen: 1.234,56
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        // Format américain: 1,234.56
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (cleaned.includes(',')) {
      // Seulement des virgules
      const commaCount = (cleaned.match(/,/g) || []).length;
      if (commaCount === 1 && cleaned.length - cleaned.lastIndexOf(',') <= 3) {
        // Probablement décimal: 1,5
        cleaned = cleaned.replace(',', '.');
      } else {
        // Probablement milliers: 1,234
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (cleaned.includes('.')) {
      // Seulement des points - laisser tel quel
    }
    
    const result = parseFloat(cleaned);
    return isNaN(result) ? 0 : result;
  },

  /**
   * Normalisation des dates françaises vers ISO
   */
  date(value) {
    if (!value) return null;
    
    // Si c'est déjà une date ISO
    if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
      return value;
    }
    
    // Patterns de dates LinkedIn
    const patterns = [
      /(\d+)\s*(mois|jour|semaine|an|minute|heure)s?\s*•?/i,
      /Il y a\s+(\d+)\s*(mois|jour|semaine|an|minute|heure)s?/i,
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    ];
    
    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (match) {
        // Pour l'instant, retourner la date actuelle pour les dates relatives
        // TODO: Calculer la vraie date basée sur la période
        return new Date().toISOString();
      }
    }
    
    // Essayer de parser directement
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch (e) {
      // Ignore
    }
    
    return null;
  },

  /**
   * Normalisation des pourcentages
   */
  percentage(value) {
    if (typeof value === 'number') {
      return value < 1 ? value : value / 100;
    }
    
    const numValue = this.number(value);
    if (numValue === 0) return 0;
    
    // Si c'est déjà un pourcentage décimal (0.064)
    if (numValue < 1) return numValue;
    
    // Si c'est un pourcentage entier (6.4%)
    return numValue / 100;
  },

  /**
   * Normalisation des textes
   */
  text(value) {
    if (!value) return '';
    return String(value).trim();
  },

  /**
   * Vérification si c'est un repost
   */
  isRepost(element) {
    if (!element) return false;
    
    const text = element.textContent.toLowerCase();
    const repostIndicators = [
      'repost',
      'repartage', 
      'partagé',
      'reposté',
      'reposté par',
      'shared by',
      'reposted by',
      'a republié ceci'
    ];
    
    return repostIndicators.some(indicator => text.includes(indicator));
  },

  /**
   * Date actuelle au format YYYY-MM-DD (timezone Europe/Paris)
   */
  getCurrentDateFR() {
    const now = new Date();
    // TODO: Gérer correctement la timezone Europe/Paris
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Normalize;
} else {
  window.Normalize = Normalize;
}