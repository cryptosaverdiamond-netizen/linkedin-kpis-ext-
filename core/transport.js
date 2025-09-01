// Module de transport pour communication avec Apps Script
class Transport {
  constructor(config) {
    this.config = config;
  }

  /**
   * Envoi POST JSON vers Apps Script avec retry et gestion d'erreurs
   * @param {Object} payload - Données à envoyer
   * @param {string} traceId - ID de traçage
   * @returns {Promise<{ok: boolean, res?: any, error?: string}>}
   */
  async postJSON(payload, traceId = null) {
    if (this.config.KILL_SWITCH) {
      console.warn('[Transport] Kill switch activé - envoi annulé');
      return { ok: false, error: 'Kill switch activé' };
    }

    const url = this.buildURL(traceId);
    let lastError = null;

    for (let attempt = 1; attempt <= this.config.RETRIES; attempt++) {
      try {
        const result = await this.makeRequest(url, payload, attempt);
        
        if (result.ok) {
          console.debug(`[Transport] Succès (tentative ${attempt})`, { traceId, status: result.status });
          return { ok: true, res: result.data };
        }

        // Pas de retry sur les erreurs 4xx
        if (result.status >= 400 && result.status < 500) {
          console.error(`[Transport] Erreur 4xx - pas de retry`, { 
            status: result.status, 
            error: result.error, 
            traceId 
          });
          return { ok: false, error: `HTTP ${result.status}: ${result.error}` };
        }

        // Retry sur 5xx et erreurs réseau
        lastError = result.error;
        console.warn(`[Transport] Tentative ${attempt}/${this.config.RETRIES} échouée`, { 
          status: result.status, 
          error: result.error, 
          traceId 
        });

        if (attempt < this.config.RETRIES) {
          await this.delay(1000 * attempt); // Backoff exponentiel
        }

      } catch (error) {
        lastError = error.message;
        console.warn(`[Transport] Exception tentative ${attempt}`, { error: error.message, traceId });
        
        if (attempt < this.config.RETRIES) {
          await this.delay(1000 * attempt);
        }
      }
    }

    console.error(`[Transport] Échec après ${this.config.RETRIES} tentatives`, { error: lastError, traceId });
    return { ok: false, error: lastError };
  }

  /**
   * Construction de l'URL avec paramètres
   */
  buildURL(traceId) {
    const url = new URL(this.config.WEBAPP_URL);
    url.searchParams.set('X-Secret', this.config.SECRET);
    
    if (traceId) {
      url.searchParams.set('X-Trace-Id', traceId);
    }
    
    return url.toString();
  }

  /**
   * Exécution de la requête HTTP
   */
  async makeRequest(url, payload, attempt) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        redirect: 'follow',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      let data = null;
      let error = null;

      try {
        const text = await response.text();
        if (text) {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        error = `Parse error: ${parseError.message}`;
      }

      return {
        ok: response.ok,
        status: response.status,
        data: data,
        error: error || (response.ok ? null : `HTTP ${response.status}`)
      };

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        throw new Error(`Timeout après ${this.config.TIMEOUT_MS}ms`);
      }
      
      throw fetchError;
    }
  }

  /**
   * Délai pour retry avec backoff
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export pour background script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Transport;
} else {
  window.Transport = Transport;
}