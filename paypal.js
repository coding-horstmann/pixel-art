/**
 * PayPal Integration für Pixel-Poster
 * Unterstützt PayPal-Zahlung und Kreditkartenzahlung über PayPal
 */

(() => {
  let paypalLoaded = false;
  let paypalButtonsRendered = false;

  // Hilfsfunktion: Warte auf PayPal SDK
  function waitForPayPal() {
    return new Promise((resolve) => {
      if (window.paypal) {
        resolve(window.paypal);
        return;
      }
      
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        if (window.paypal) {
          clearInterval(checkInterval);
          resolve(window.paypal);
        } else if (attempts > 50) {
          clearInterval(checkInterval);
          console.error('PayPal SDK konnte nicht geladen werden');
          resolve(null);
        }
      }, 100);
    });
  }

  // Lädt das PayPal SDK dynamisch
  async function loadPayPalSDK() {
    if (paypalLoaded) return true;
    
    // Prüfe ob CONFIG verfügbar ist
    if (!window.CONFIG || !window.CONFIG.PAYPAL_CLIENT_ID) {
      console.error('PayPal Client-ID nicht konfiguriert');
      return false;
    }

    const clientId = window.CONFIG.PAYPAL_CLIENT_ID;
    
    // Prüfe ob es ein Platzhalter ist
    if (clientId.includes('##') || clientId === 'sandbox-test-id') {
      console.warn('PayPal Client-ID ist nicht konfiguriert. Bitte Umgebungsvariable setzen.');
      // Im Entwicklungsmodus trotzdem weitermachen (mit Sandbox)
      if (clientId === 'sandbox-test-id') {
        console.log('Verwende Sandbox-Modus für lokale Entwicklung');
      } else {
        return false;
      }
    }

    return new Promise((resolve) => {
      // Prüfe ob SDK bereits geladen wurde
      if (document.getElementById('paypal-sdk')) {
        paypalLoaded = true;
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.id = 'paypal-sdk';
      // enable-funding=card aktiviert den Kreditkarten-Button (inkl. SEPA)
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=EUR&components=buttons&enable-funding=card`;
      script.setAttribute('data-sdk-integration-source', 'button-factory');
      
      script.onload = () => {
        paypalLoaded = true;
        console.log('✓ PayPal SDK geladen');
        resolve(true);
      };
      
      script.onerror = () => {
        console.error('Fehler beim Laden des PayPal SDK');
        resolve(false);
      };

      document.head.appendChild(script);
    });
  }

  // Berechnet Gesamtsumme aus dem Warenkorb
  function calculateTotal(cart) {
    return cart.reduce((sum, item) => sum + item.price, 0);
  }

  // Erstellt PayPal Order Items aus dem Warenkorb
  function createOrderItems(cart) {
    return cart.map((item, index) => ({
      name: `Pixel-Poster ${item.size}`,
      description: `${item.orientation === 'portrait' ? 'Hochformat' : 'Querformat'} Poster`,
      unit_amount: {
        currency_code: 'EUR',
        value: item.price.toFixed(2)
      },
      quantity: '1'
    }));
  }

  // Sammelt Kundendaten aus dem Formular
  function getCustomerData() {
    const form = document.getElementById('modalForm');
    if (!form) return null;

    return {
      vorname: form.vorname.value.trim(),
      nachname: form.nachname.value.trim(),
      email: form.email.value.trim(),
      telefon: form.telefon.value.trim() || '',
      strasse: form.strasse.value.trim(),
      hausnummer: form.hausnummer.value.trim(),
      plz: form.plz.value.trim(),
      ort: form.ort.value.trim(),
      land: 'Deutschland'
    };
  }

  // Validiert das Checkout-Formular
  function validateCheckoutForm() {
    const form = document.getElementById('modalForm');
    const formError = document.getElementById('formError');
    
    if (!form || !formError) return false;

    formError.textContent = '';

    // Prüfe Pflichtfelder
    const customerData = getCustomerData();
    if (!customerData) return false;

    if (!customerData.vorname || !customerData.nachname || !customerData.email || 
        !customerData.strasse || !customerData.hausnummer || !customerData.plz || !customerData.ort) {
      // Keine Fehlermeldung hier - PayPal Buttons zeigen es selbst an
      return false;
    }

    // Validiere E-Mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerData.email)) {
      return false;
    }

    // Prüfe Warenkorb
    const cart = window.pixelPosterCart || [];
    if (cart.length === 0) {
      return false;
    }

    return true;
  }

  // Rendert die PayPal-Buttons
  async function renderPayPalButtons() {
    if (paypalButtonsRendered) return;

    const paypal = await waitForPayPal();
    if (!paypal) {
      console.error('PayPal SDK nicht verfügbar');
      return;
    }

    const container = document.getElementById('paypal-button-container');
    if (!container) {
      console.error('PayPal Button Container nicht gefunden');
      return;
    }

    // Leere Container
    container.innerHTML = '';

    try {
      paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'checkout',
          height: 50
        },

        // Wird aufgerufen wenn die Buttons initialisiert werden
        onInit: (data, actions) => {
          // Initial deaktivieren
          actions.disable();

          // Bei Formular-Änderungen validieren
          const form = document.getElementById('modalForm');
          if (form) {
            form.addEventListener('input', () => {
              if (validateCheckoutForm()) {
                actions.enable();
              } else {
                actions.disable();
              }
            });
          }

          // Bei Warenkorb-Updates validieren
          window.addEventListener('cart:updated', () => {
            if (validateCheckoutForm()) {
              actions.enable();
            } else {
              actions.disable();
            }
          });

          // Initiale Validierung
          if (validateCheckoutForm()) {
            actions.enable();
          }
        },

        // Erstellt die PayPal-Bestellung
        createOrder: (data, actions) => {
          if (!validateCheckoutForm()) {
            return Promise.reject(new Error('Formular nicht gültig'));
          }

          const cart = window.pixelPosterCart || [];
          const total = calculateTotal(cart);
          const customerData = getCustomerData();

          // Erstelle Bestelldetails
          return actions.order.create({
            purchase_units: [{
              amount: {
                currency_code: 'EUR',
                value: total.toFixed(2),
                breakdown: {
                  item_total: {
                    currency_code: 'EUR',
                    value: total.toFixed(2)
                  }
                }
              },
              description: `Pixel-Poster Bestellung (${cart.length} Artikel)`,
              custom_id: JSON.stringify({
                timestamp: Date.now(),
                itemCount: cart.length,
                customer: customerData
              }),
              items: createOrderItems(cart)
            }],
            application_context: {
              brand_name: 'Pixel-Poster',
              shipping_preference: 'NO_SHIPPING' // Wir sammeln Adresse selbst
            }
          });
        },

        // Wird bei erfolgreicher Zahlung aufgerufen
        onApprove: async (data, actions) => {
          const formError = document.getElementById('formError');
          
          try {
            // Zahlung erfassen
            const order = await actions.order.capture();
            
            console.log('✓ Zahlung erfolgreich:', order);

            // Bereite Daten für Speicherung vor (wird in Phase 2 implementiert)
            const orderData = {
              orderId: order.id,
              payerId: order.payer.payer_id,
              status: order.status,
              amount: order.purchase_units[0].amount.value,
              currency: order.purchase_units[0].amount.currency_code,
              customerData: getCustomerData(),
              cart: window.pixelPosterCart || [],
              timestamp: new Date().toISOString()
            };

            // Event für erfolgreiche Zahlung auslösen
            window.dispatchEvent(new CustomEvent('payment:success', { 
              detail: orderData 
            }));

            // TODO Phase 2: Daten in Supabase speichern
            // await saveOrderToSupabase(orderData);

            // TODO Phase 3: Bestätigungs-E-Mails versenden
            // await sendConfirmationEmail(orderData);

            // Zeige Erfolgs-Toast
            if (window.showToast) {
              window.showToast('Zahlung erfolgreich! Vielen Dank für deine Bestellung!', '✓', 5000);
            }

            // Warenkorb leeren
            window.pixelPosterCart = [];
            window.dispatchEvent(new CustomEvent('cart:updated'));

            // Modal schließen nach kurzer Verzögerung
            setTimeout(() => {
              const modal = document.getElementById('checkoutModal');
              if (modal) {
                modal.classList.remove('is-open');
              }
            }, 2000);

          } catch (error) {
            console.error('Fehler bei der Zahlungsabwicklung:', error);
            if (formError) {
              formError.textContent = 'Es gab ein Problem bei der Zahlungsabwicklung. Bitte versuche es erneut.';
            }
          }
        },

        // Wird aufgerufen wenn die Zahlung abgebrochen wird
        onCancel: (data) => {
          console.log('Zahlung abgebrochen:', data);
          const formError = document.getElementById('formError');
          if (formError) {
            formError.textContent = 'Zahlung wurde abgebrochen.';
          }
        },

        // Wird bei Fehlern aufgerufen
        onError: (err) => {
          console.error('PayPal Fehler:', err);
          const formError = document.getElementById('formError');
          if (formError) {
            formError.textContent = 'Es gab ein Problem mit PayPal. Bitte versuche es erneut oder kontaktiere den Support.';
          }
        }
      }).render('#paypal-button-container');

      paypalButtonsRendered = true;
      console.log('✓ PayPal Buttons gerendert');

    } catch (error) {
      console.error('Fehler beim Rendern der PayPal Buttons:', error);
    }
  }

  // Initialisiert PayPal
  async function initPayPal() {
    // Lade PayPal SDK
    const loaded = await loadPayPalSDK();
    if (!loaded) {
      console.error('PayPal SDK konnte nicht geladen werden');
      return;
    }

    // Warte auf PayPal Objekt
    await waitForPayPal();

    // Rendere Buttons wenn Modal geöffnet wird
    const modal = document.getElementById('checkoutModal');
    if (modal) {
      // Observer für Modal-Öffnung
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class') {
            if (modal.classList.contains('is-open')) {
              // Modal wurde geöffnet - rendere Buttons nur einmal
              if (!paypalButtonsRendered) {
                renderPayPalButtons();
              }
            }
          }
        });
      });

      observer.observe(modal, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    console.log('✓ PayPal initialisiert');
  }

  // Starte Initialisierung wenn Seite geladen ist
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPayPal);
  } else {
    initPayPal();
  }
})();
