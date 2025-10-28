/**
 * Cookie-Consent-Banner für Pixel-Poster
 * DSGVO-konform mit granularer Steuerung
 */

(() => {
  // Konfiguration der Cookie-Kategorien
  const COOKIE_CONFIG = {
    necessary: {
      name: 'Notwendige Cookies',
      description: 'Diese Cookies sind für die Grundfunktionen der Website erforderlich und können nicht deaktiviert werden.',
      required: true,
      cookies: [
        { name: 'Supabase Session', description: 'Speichert Ihre Sitzungsdaten', active: true },
        { name: 'reCAPTCHA', description: 'Schutz vor Spam und Bot-Angriffen', active: true },
        { name: 'PayPal Integration', description: 'Ermöglicht sichere Zahlungen', active: true },
        { name: 'Brevo (Sendinblue)', description: 'E-Mail-Versand für Bestellbestätigungen', active: true }
      ]
    },
    analytics: {
      name: 'Analyse-Cookies',
      description: 'Diese Cookies helfen uns zu verstehen, wie Besucher mit der Website interagieren.',
      required: false,
      cookies: [
        { name: 'Google Analytics', key: 'ga', active: false },
        { name: 'Google Search Console', key: 'gsc', active: false }
      ]
    },
    marketing: {
      name: 'Marketing-Cookies',
      description: 'Diese Cookies werden für personalisierte Werbung und Marketing-Kampagnen verwendet.',
      required: false,
      cookies: [
        { name: 'Google Ads', key: 'gads', active: false },
        { name: 'Facebook Ads', key: 'fbads', active: false },
        { name: 'Pinterest Ads', key: 'pinads', active: false }
      ]
    }
  };

  const STORAGE_KEY = 'pixelPosterCookieConsent';
  const CONSENT_VERSION = '1.0';

  // Aktueller Consent-Status
  let currentConsent = loadConsent();

  // Lade gespeicherten Consent aus localStorage
  function loadConsent() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      
      const consent = JSON.parse(stored);
      
      // Prüfe ob Version aktuell ist
      if (consent.version !== CONSENT_VERSION) {
        return null;
      }
      
      return consent;
    } catch (e) {
      console.error('Fehler beim Laden des Cookie-Consent:', e);
      return null;
    }
  }

  // Speichere Consent in localStorage
  function saveConsent(consent) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...consent,
        version: CONSENT_VERSION,
        timestamp: Date.now()
      }));
      currentConsent = consent;
    } catch (e) {
      console.error('Fehler beim Speichern des Cookie-Consent:', e);
    }
  }

  // Erstelle HTML für Cookie-Banner
  function createBannerHTML() {
    return `
      <div id="cookieBanner" class="cookie-banner" role="dialog" aria-labelledby="cookieBannerTitle" aria-describedby="cookieBannerDesc">
        <div class="cookie-banner-content">
          <div class="cookie-banner-icon" aria-hidden="true">🍪</div>
          <div class="cookie-banner-text">
            <h2 id="cookieBannerTitle" class="cookie-banner-title">Cookie-Einstellungen</h2>
            <p id="cookieBannerDesc" class="cookie-banner-desc">
              Wir verwenden Cookies, um Ihnen das beste Erlebnis auf unserer Website zu bieten. 
              Einige sind notwendig, andere helfen uns, die Website zu verbessern.
            </p>
          </div>
          <div class="cookie-banner-actions">
            <button type="button" class="btn btn-secondary" id="cookieSettings">
              Einstellungen
            </button>
            <button type="button" class="btn btn-ghost" id="cookieReject">
              Nur Notwendige
            </button>
            <button type="button" class="btn btn-primary" id="cookieAcceptAll">
              Alle akzeptieren
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Erstelle HTML für Cookie-Einstellungs-Modal
  function createSettingsModalHTML() {
    const categoriesHTML = Object.entries(COOKIE_CONFIG).map(([key, category]) => `
      <div class="cookie-category">
        <div class="cookie-category-header">
          <div class="cookie-category-title-row">
            <h3 class="cookie-category-title">${category.name}</h3>
            ${category.required 
              ? '<span class="cookie-required-badge">Erforderlich</span>'
              : `<label class="cookie-toggle">
                  <input type="checkbox" 
                         id="cookie-cat-${key}" 
                         ${currentConsent?.[key] ? 'checked' : ''}>
                  <span class="cookie-toggle-slider"></span>
                </label>`
            }
          </div>
          <p class="cookie-category-desc">${category.description}</p>
        </div>
        <div class="cookie-list">
          ${category.cookies.map(cookie => `
            <div class="cookie-item">
              <div class="cookie-item-name">${cookie.name}</div>
              ${cookie.description ? `<div class="cookie-item-desc">${cookie.description}</div>` : ''}
              <div class="cookie-item-status ${cookie.active || category.required ? 'active' : ''}">
                ${cookie.active || category.required ? 'Aktiv' : 'Inaktiv'}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    return `
      <div id="cookieSettingsModal" class="cookie-modal" role="dialog" aria-labelledby="cookieModalTitle" aria-modal="true">
        <div class="cookie-modal-backdrop"></div>
        <div class="cookie-modal-dialog">
          <button class="cookie-modal-close" type="button" aria-label="Schließen">✕</button>
          <h2 id="cookieModalTitle" class="cookie-modal-title">Cookie-Einstellungen</h2>
          <div class="cookie-modal-content">
            <p class="cookie-modal-intro">
              Wir respektieren Ihre Privatsphäre. Wählen Sie, welche Cookies Sie zulassen möchten.
              Sie können Ihre Einstellungen jederzeit über den Link im Footer ändern.
            </p>
            <div class="cookie-categories">
              ${categoriesHTML}
            </div>
          </div>
          <div class="cookie-modal-actions">
            <button type="button" class="btn btn-ghost" id="cookieSaveReject">
              Nur Notwendige
            </button>
            <button type="button" class="btn btn-primary" id="cookieSaveSettings">
              Auswahl speichern
            </button>
            <button type="button" class="btn btn-secondary" id="cookieSaveAll">
              Alle akzeptieren
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Zeige Cookie-Banner
  function showBanner() {
    let banner = document.getElementById('cookieBanner');
    if (!banner) {
      document.body.insertAdjacentHTML('beforeend', createBannerHTML());
      banner = document.getElementById('cookieBanner');
      wireUpBannerEvents();
    }
    
    // Kleine Verzögerung für Animation
    setTimeout(() => {
      banner.classList.add('show');
    }, 100);
  }

  // Verstecke Cookie-Banner
  function hideBanner() {
    const banner = document.getElementById('cookieBanner');
    if (banner) {
      banner.classList.remove('show');
      setTimeout(() => {
        banner.remove();
      }, 300);
    }
  }

  // Zeige Einstellungs-Modal
  function showSettingsModal() {
    let modal = document.getElementById('cookieSettingsModal');
    if (!modal) {
      document.body.insertAdjacentHTML('beforeend', createSettingsModalHTML());
      modal = document.getElementById('cookieSettingsModal');
      wireUpModalEvents();
    }
    
    // Update Checkbox-Status basierend auf currentConsent
    Object.keys(COOKIE_CONFIG).forEach(key => {
      if (!COOKIE_CONFIG[key].required) {
        const checkbox = document.getElementById(`cookie-cat-${key}`);
        if (checkbox) {
          checkbox.checked = currentConsent?.[key] || false;
        }
      }
    });
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  // Verstecke Einstellungs-Modal
  function hideSettingsModal() {
    const modal = document.getElementById('cookieSettingsModal');
    if (modal) {
      modal.classList.remove('show');
      document.body.style.overflow = '';
    }
  }

  // Lese aktuelle Auswahl aus Modal
  function getModalSelection() {
    const consent = {
      necessary: true // Immer aktiv
    };
    
    Object.keys(COOKIE_CONFIG).forEach(key => {
      if (!COOKIE_CONFIG[key].required) {
        const checkbox = document.getElementById(`cookie-cat-${key}`);
        consent[key] = checkbox ? checkbox.checked : false;
      }
    });
    
    return consent;
  }

  // Akzeptiere alle Cookies
  function acceptAll() {
    const consent = { necessary: true };
    Object.keys(COOKIE_CONFIG).forEach(key => {
      consent[key] = true;
    });
    saveConsent(consent);
    hideBanner();
    hideSettingsModal();
    loadScripts();
    showConsentFeedback('Alle Cookies wurden akzeptiert');
  }

  // Akzeptiere nur notwendige Cookies
  function rejectAll() {
    const consent = { necessary: true };
    Object.keys(COOKIE_CONFIG).forEach(key => {
      if (key !== 'necessary') {
        consent[key] = false;
      }
    });
    saveConsent(consent);
    hideBanner();
    hideSettingsModal();
    showConsentFeedback('Nur notwendige Cookies wurden aktiviert');
  }

  // Speichere individuelle Auswahl
  function saveSelection() {
    const consent = getModalSelection();
    saveConsent(consent);
    hideSettingsModal();
    hideBanner();
    loadScripts();
    showConsentFeedback('Ihre Cookie-Einstellungen wurden gespeichert');
  }

  // Zeige Feedback-Toast
  function showConsentFeedback(message) {
    if (window.showToast) {
      window.showToast(message, '🍪', 3000);
    } else {
      console.log(message);
    }
  }

  // Wire up Banner Events
  function wireUpBannerEvents() {
    const acceptAllBtn = document.getElementById('cookieAcceptAll');
    const rejectBtn = document.getElementById('cookieReject');
    const settingsBtn = document.getElementById('cookieSettings');
    
    if (acceptAllBtn) acceptAllBtn.addEventListener('click', acceptAll);
    if (rejectBtn) rejectBtn.addEventListener('click', rejectAll);
    if (settingsBtn) settingsBtn.addEventListener('click', () => {
      hideBanner();
      showSettingsModal();
    });
  }

  // Wire up Modal Events
  function wireUpModalEvents() {
    const modal = document.getElementById('cookieSettingsModal');
    const closeBtn = modal.querySelector('.cookie-modal-close');
    const backdrop = modal.querySelector('.cookie-modal-backdrop');
    const saveBtn = document.getElementById('cookieSaveSettings');
    const rejectBtn = document.getElementById('cookieSaveReject');
    const acceptAllBtn = document.getElementById('cookieSaveAll');
    
    if (closeBtn) closeBtn.addEventListener('click', hideSettingsModal);
    if (backdrop) backdrop.addEventListener('click', hideSettingsModal);
    if (saveBtn) saveBtn.addEventListener('click', saveSelection);
    if (rejectBtn) rejectBtn.addEventListener('click', rejectAll);
    if (acceptAllBtn) acceptAllBtn.addEventListener('click', acceptAll);

    // Toggle-Checkboxen aktualisieren Cookie-Item-Status visuell
    Object.keys(COOKIE_CONFIG).forEach(key => {
      if (!COOKIE_CONFIG[key].required) {
        const checkbox = document.getElementById(`cookie-cat-${key}`);
        if (checkbox) {
          checkbox.addEventListener('change', (e) => {
            updateCookieItemsStatus(key, e.target.checked);
          });
        }
      }
    });
  }

  // Aktualisiere visuelle Status der Cookie-Items
  function updateCookieItemsStatus(categoryKey, isActive) {
    const category = COOKIE_CONFIG[categoryKey];
    if (!category) return;
    
    const modal = document.getElementById('cookieSettingsModal');
    if (!modal) return;
    
    const categories = modal.querySelectorAll('.cookie-category');
    categories.forEach((catElement, index) => {
      const catKeys = Object.keys(COOKIE_CONFIG);
      if (catKeys[index] === categoryKey) {
        const items = catElement.querySelectorAll('.cookie-item-status');
        items.forEach(item => {
          if (isActive) {
            item.classList.add('active');
            item.textContent = 'Aktiv';
          } else {
            item.classList.remove('active');
            item.textContent = 'Inaktiv';
          }
        });
      }
    });
  }

  // Lade externe Skripte basierend auf Consent
  function loadScripts() {
    if (!currentConsent) return;
    
    // Google Analytics
    if (currentConsent.analytics && !window.gtag) {
      loadGoogleAnalytics();
    }
    
    // Google Ads
    if (currentConsent.marketing && !window.googletag) {
      loadGoogleAds();
    }
    
    // Facebook Pixel
    if (currentConsent.marketing && !window.fbq) {
      loadFacebookPixel();
    }
    
    // Pinterest Tag
    if (currentConsent.marketing && !window.pintrk) {
      loadPinterestTag();
    }
    
    // Brevo ist immer aktiv (notwendig für Bestellbestätigungen)
    // Kein Consent-Check erforderlich
  }

  // Google Analytics laden
  function loadGoogleAnalytics() {
    const GA_MEASUREMENT_ID = window.CONFIG?.GA_MEASUREMENT_ID;
    
    if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID.includes('##')) {
      console.log('Google Analytics ID nicht konfiguriert');
      return;
    }
    
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
    
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
      anonymize_ip: true,
      cookie_flags: 'SameSite=None;Secure'
    });
    
    console.log('✓ Google Analytics geladen');
  }

  // Google Ads laden
  function loadGoogleAds() {
    const GOOGLE_ADS_ID = window.CONFIG?.GOOGLE_ADS_ID;
    
    if (!GOOGLE_ADS_ID || GOOGLE_ADS_ID.includes('##')) {
      console.log('Google Ads ID nicht konfiguriert');
      return;
    }
    
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
    document.head.appendChild(script);
    
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', GOOGLE_ADS_ID);
    
    console.log('✓ Google Ads geladen');
  }

  // Facebook Pixel laden
  function loadFacebookPixel() {
    const FB_PIXEL_ID = window.CONFIG?.FB_PIXEL_ID;
    
    if (!FB_PIXEL_ID || FB_PIXEL_ID.includes('##')) {
      console.log('Facebook Pixel ID nicht konfiguriert');
      return;
    }
    
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', FB_PIXEL_ID);
    fbq('track', 'PageView');
    
    console.log('✓ Facebook Pixel geladen');
  }

  // Pinterest Tag laden
  function loadPinterestTag() {
    const PINTEREST_TAG_ID = window.CONFIG?.PINTEREST_TAG_ID;
    
    if (!PINTEREST_TAG_ID || PINTEREST_TAG_ID.includes('##')) {
      console.log('Pinterest Tag ID nicht konfiguriert');
      return;
    }
    
    !function(e){if(!window.pintrk){window.pintrk = function () {
    window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var
      n=window.pintrk;n.queue=[],n.version="3.0";var
      t=document.createElement("script");t.async=!0,t.src=e;var
      r=document.getElementsByTagName("script")[0];
      r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
    pintrk('load', PINTEREST_TAG_ID);
    pintrk('page');
    
    console.log('✓ Pinterest Tag geladen');
  }

  // Füge Cookie-Einstellungs-Link zum Footer hinzu
  function addFooterLink() {
    const footerLinks = document.querySelector('.foot-links');
    if (!footerLinks) return;
    
    // Prüfe ob Link schon existiert
    if (document.getElementById('cookieSettingsLink')) return;
    
    const link = document.createElement('a');
    link.id = 'cookieSettingsLink';
    link.href = '#';
    link.className = 'foot-link';
    link.textContent = 'Cookie-Einstellungen';
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showSettingsModal();
    });
    
    // Füge Link nach Datenschutz ein
    const datenschutzLink = Array.from(footerLinks.children).find(
      a => a.textContent.includes('Datenschutz')
    );
    
    if (datenschutzLink) {
      datenschutzLink.after(link);
    } else {
      footerLinks.appendChild(link);
    }
  }

  // Globale Funktion zum Öffnen der Cookie-Einstellungen
  window.openCookieSettings = function() {
    showSettingsModal();
  };

  // Initialisierung
  function init() {
    // Footer-Link hinzufügen
    addFooterLink();
    
    // Prüfe ob Consent bereits vorhanden
    if (!currentConsent) {
      // Zeige Banner nach kurzer Verzögerung
      setTimeout(() => {
        showBanner();
      }, 1000);
    } else {
      // Lade Skripte basierend auf gespeichertem Consent
      loadScripts();
    }
    
    console.log('✓ Cookie-Consent initialisiert');
  }

  // Warte auf DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

