// Utilitaires de normalisation pour les données françaises
const Normalize = {
  // Normalisation des nombres français
  number(value) {
    if (typeof value === 'number') return value;
    if (!value || typeof value !== 'string') return 0;
    
    // Supprimer les espaces et caractères non numériques sauf séparateurs
    let cleaned = value.replace(/\s/g, '').replace(/[^\d.,]/g, '');
    
    // Gestion des séparateurs français (virgule pour décimaux, espace pour milliers)
    if (cleaned.includes(',')) {
      // Format français: 1 234,56
      cleaned = cleaned.replace(/\s/g, '').replace(',', '.');
    } else if (cleaned.includes('.')) {
      // Format international: 1,234.56 ou 1.234
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        // Plusieurs points = format milliers
        cleaned = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
      }
    }
    
    const result = parseFloat(cleaned);
    return isNaN(result) ? 0 : result;
  },

  // Normalisation des dates françaises
  date(value) {
    if (!value) return null;
    
    // Si c'est déjà une date ISO
    if (value.includes('T') && value.includes('Z')) {
      return value;
    }
    
    // Format français: DD/MM/YYYY ou DD-MM-YYYY
    const frenchDateMatch = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (frenchDateMatch) {
      const [, day, month, year] = frenchDateMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Format américain: MM/DD/YYYY
    const usDateMatch = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (usDateMatch) {
      const [, month, day, year] = usDateMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return null;
  },

  // Normalisation des pourcentages
  percentage(value) {
    if (typeof value === 'number') return value / 100;
    
    const numValue = this.number(value);
    if (numValue === 0) return 0;
    
    // Si c'est déjà un pourcentage (0.064)
    if (numValue < 1) return numValue;
    
    // Si c'est un pourcentage entier (6.4)
    if (numValue < 100) return numValue / 100;
    
    // Si c'est un pourcentage avec % (6.4%)
    return numValue / 100;
  },

  // Normalisation des textes
  text(value) {
    if (!value) return '';
    return String(value).trim();
  },

  // Vérification si c'est un repost
  isRepost(element) {
    if (!element) return false;
    
    const text = element.textContent.toLowerCase();
    const repostIndicators = [
      'repost',
      'repartage',
      'partagé',
      'reposté',
      'reposté par'
    ];
    
    return repostIndicators.some(indicator => text.includes(indicator));
  }
};

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Normalize;
} else {
  window.Normalize = Normalize;
}