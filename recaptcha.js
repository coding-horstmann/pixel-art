/**
 * Google reCAPTCHA v3 Integration für Pixel-Poster
 * Schützt vor Bot-Angriffen beim Checkout
 */

(() => {
  let recaptchaLoaded = false;
  let recaptchaReady = false;

  /**
   * Lädt das Google reCAPTCHA v3 Script
   */
  function loadRecaptchaScript() {
    if (recaptchaLoaded) {
      console.log('reCAPTCHA-Script bereits geladen');
      return Promise.resolve(true);
    }

    // Prüfe ob Site Key konfiguriert ist
    if (!window.CONFIG || !window.CONFIG.RECAPTCHA_SITE_KEY) {
      console.warn('⚠️ reCAPTCHA Site Key nicht konfiguriert - Bot-Schutz deaktiviert');
      return Promise.resolve(false);
    }

    const siteKey = window.CONFIG.RECAPTCHA_SITE_KEY;

    // Prüfe ob es ein Platzhalter ist
    if (siteKey.includes('##') || siteKey === '') {
      console.warn('⚠️ reCAPTCHA Site Key ist Platzhalter - Bot-Schutz deaktiviert');
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      // Prüfe ob Script bereits existiert
      if (document.getElementById('recaptcha-script')) {
        recaptchaLoaded = true;
        resolve(true);
        return;
      }

      console.log('📦 Lade Google reCAPTCHA v3 Script...');

      const script = document.createElement('script');
      script.id = 'recaptcha-script';
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
      
      script.onload = () => {
        recaptchaLoaded = true;
        console.log('✅ reCAPTCHA-Script geladen');
        
        // Warte bis grecaptcha.ready verfügbar ist
        if (window.grecaptcha && window.grecaptcha.ready) {
          window.grecaptcha.ready(() => {
            recaptchaReady = true;
            console.log('✅ reCAPTCHA bereit');
            resolve(true);
          });
        } else {
          // Fallback: Warte kurz und setze ready
          setTimeout(() => {
            recaptchaReady = true;
            resolve(true);
          }, 500);
        }
      };
      
      script.onerror = () => {
        console.error('❌ Fehler beim Laden des reCAPTCHA-Scripts');
        resolve(false);
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Generiert ein reCAPTCHA v3 Token für eine bestimmte Aktion
   * @param {string} action - Die Aktion (z.B. 'checkout', 'submit_form')
   * @returns {Promise<string|null>} Das reCAPTCHA-Token oder null bei Fehler
   */
  async function getRecaptchaToken(action = 'submit') {
    if (!recaptchaLoaded || !recaptchaReady) {
      console.warn('⚠️ reCAPTCHA nicht geladen - Token wird übersprungen');
      return null;
    }

    if (!window.grecaptcha || !window.grecaptcha.execute) {
      console.error('❌ grecaptcha.execute nicht verfügbar');
      return null;
    }

    const siteKey = window.CONFIG.RECAPTCHA_SITE_KEY;

    try {
      console.log(`🔐 Generiere reCAPTCHA-Token für Aktion: ${action}`);
      const token = await window.grecaptcha.execute(siteKey, { action: action });
      console.log('✅ reCAPTCHA-Token erhalten:', token.substring(0, 20) + '...');
      return token;
    } catch (error) {
      console.error('❌ Fehler beim Generieren des reCAPTCHA-Tokens:', error);
      return null;
    }
  }

  /**
   * Initialisiert reCAPTCHA beim Laden der Seite
   */
  async function initRecaptcha() {
    console.log('🚀 Initialisiere reCAPTCHA...');
    const loaded = await loadRecaptchaScript();
    
    if (loaded) {
      console.log('✅ reCAPTCHA erfolgreich initialisiert');
    } else {
      console.warn('⚠️ reCAPTCHA wurde nicht initialisiert (deaktiviert oder Fehler)');
    }
  }

  // Exportiere Funktionen global
  window.RecaptchaService = {
    init: initRecaptcha,
    getToken: getRecaptchaToken,
    isReady: () => recaptchaReady
  };

  // Auto-Initialisierung beim Laden der Seite
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRecaptcha);
  } else {
    initRecaptcha();
  }
})();

