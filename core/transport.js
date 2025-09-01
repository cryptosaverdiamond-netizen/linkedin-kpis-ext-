// Module de transport pour l'envoi des données vers Google Apps Script
class Transport {
  constructor() {
    this.retryCount = 0;
    this.maxRetries = CONFIG.RETRIES;
    this.timeoutMs = CONFIG.TIMEOUT_MS;
  }

  // Envoi POST avec retry et gestion d'erreurs
  async postJSON(payload, traceId = null) {
    if (CONFIG.KILL_SWITCH) {
      console.debug('[Transport] Kill switch activé, envoi bloqué');
      return { ok: false, error: 'Kill switch activé' };
    }

    const url = this.buildUrl(traceId);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        redirect: 'follow',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        this.retryCount = 0;
        const result = await response.json();
        console.debug(`[Transport] Succès (${response.status}):`, result);
        return { ok: true, res: result, trace_id: traceId };
      }

      // Gestion des erreurs HTTP
      if (response.status >= 400 && response.status < 500) {
        console.error(`[Transport] Erreur client (${response.status}):`, response.statusText);
        return { ok: false, error: `Erreur ${response.status}: ${response.statusText}`, trace_id: traceId };
      }

      // Erreurs serveur (5xx) - retry
      if (response.status >= 500 && this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.warn(`[Transport] Erreur serveur (${response.status}), retry ${this.retryCount}/${this.maxRetries}`);
        
        // Attendre avant retry (backoff exponentiel)
        await this.delay(Math.pow(2, this.retryCount) * 1000);
        return this.postJSON(payload, traceId);
      }

      // Quotas ou erreurs fatales
      if (response.status === 429 || response.status === 503) {
        console.error(`[Transport] Quota dépassé ou service indisponible (${response.status})`);
        return { ok: false, error: 'Quota dépassé ou service indisponible', trace_id: traceId };
      }

      return { ok: false, error: `Erreur ${response.status}: ${response.statusText}`, trace_id: traceId };

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.error('[Transport] Timeout atteint');
        return { ok: false, error: 'Timeout atteint', trace_id: traceId };
      }

      // Erreurs réseau - retry
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.warn(`[Transport] Erreur réseau, retry ${this.retryCount}/${this.maxRetries}:`, error.message);
        
        await this.delay(Math.pow(2, this.retryCount) * 1000);
        return this.postJSON(payload, traceId);
      }

      console.error('[Transport] Erreur fatale après retries:', error);
      return { ok: false, error: error.message, trace_id: traceId };
    }
  }

  // Construction de l'URL avec paramètres
  buildUrl(traceId) {
    let url = `${CONFIG.WEBAPP_URL}?X-Secret=${CONFIG.SECRET}`;
    if (traceId) {
      url += `&X-Trace-Id=${traceId}`;
    }
    return url;
  }

  // Délai pour retry
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Transport;
} else {
  window.Transport = Transport;
}