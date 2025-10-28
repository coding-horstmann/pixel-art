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

  // Initiiert PayPal-Zahlung basierend auf gewählter Zahlungsmethode  
  async function initiatePayPalPayment(paymentMethod) {
    console.log('initiatePayPalPayment aufgerufen mit:', paymentMethod);
    
    // Validiere Formular
    if (!validateCheckoutForm()) {
      const formError = document.getElementById('formError');
      if (formError) formError.textContent = 'Bitte überprüfe deine Eingaben.';
      console.log('Formular-Validierung fehlgeschlagen');
      return;
    }

    const formError = document.getElementById('formError');
    if (formError) formError.textContent = '';

    console.log('Formular validiert, rendere PayPal-Button...');

    // Zeige den Button-Container
    const container = document.getElementById('paypal-button-container');
    if (!container) {
      console.error('PayPal Container nicht gefunden');
      if (formError) formError.textContent = 'PayPal konnte nicht gestartet werden.';
      return;
    }

    // Mache Container sichtbar
    container.style.display = 'block';
    container.innerHTML = ''; // Leere vorherigen Inhalt

    // Rendere PayPal Button NEU mit der gewählten Funding-Source
    await renderPayPalButtonForMethod(paymentMethod, container);
    
    // Verstecke "Jetzt kaufen" Button
    const buyNowBtn = document.getElementById('buyNowButton');
    if (buyNowBtn) buyNowBtn.style.display = 'none';
  }

  // Rendert einen einzelnen PayPal-Button für die gewählte Zahlungsmethode
  async function renderPayPalButtonForMethod(paymentMethod, container) {
    const paypal = await waitForPayPal();
    if (!paypal) {
      console.error('PayPal SDK nicht verfügbar');
      return;
    }

    console.log('Rendere PayPal-Button für Methode:', paymentMethod);

    // Bestimme Funding Source
    let fundingSource = paypal.FUNDING.PAYPAL;
    if (paymentMethod === 'card') {
      fundingSource = paypal.FUNDING.CARD;
    } else if (paymentMethod === 'sepa') {
      fundingSource = paypal.FUNDING.SEPA;
    }

    console.log('Verwende Funding Source:', fundingSource);

    try {
      paypal.Buttons({
        fundingSource: fundingSource,
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'pay',
          height: 50
        },

        createOrder: (data, actions) => {
          const cart = window.pixelPosterCart || [];
          const total = calculateTotal(cart);
          const customerData = getCustomerData();

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
                customer: customerData,
                paymentMethod: paymentMethod
              }),
              items: createOrderItems(cart)
            }],
            application_context: {
              brand_name: 'Pixel-Poster',
              shipping_preference: 'NO_SHIPPING'
            }
          });
        },

        onApprove: async (data, actions) => {
          try {
            const order = await actions.order.capture();
            console.log('✓ Zahlung erfolgreich:', order);

            const orderData = {
              orderId: order.id,
              payerId: order.payer.payer_id,
              status: order.status,
              amount: order.purchase_units[0].amount.value,
              currency: order.purchase_units[0].amount.currency_code,
              customerData: getCustomerData(),
              cart: window.pixelPosterCart || [],
              timestamp: new Date().toISOString(),
              paymentMethod: paymentMethod
            };

            window.dispatchEvent(new CustomEvent('payment:success', { detail: orderData }));

            if (window.showToast) {
              window.showToast('Zahlung erfolgreich! Vielen Dank für deine Bestellung!', '✓', 5000);
            }

            window.pixelPosterCart = [];
            window.dispatchEvent(new CustomEvent('cart:updated'));

            setTimeout(() => {
              const modal = document.getElementById('checkoutModal');
              if (modal) modal.classList.remove('is-open');
            }, 2000);

          } catch (error) {
            console.error('Fehler bei der Zahlungsabwicklung:', error);
            const formError = document.getElementById('formError');
            if (formError) formError.textContent = 'Es gab ein Problem bei der Zahlungsabwicklung.';
          }
        },

        onCancel: () => {
          console.log('Zahlung abgebrochen');
          const formError = document.getElementById('formError');
          if (formError) formError.textContent = 'Zahlung wurde abgebrochen.';
          
          // Zeige "Jetzt kaufen" Button wieder
          const buyNowBtn = document.getElementById('buyNowButton');
          if (buyNowBtn) buyNowBtn.style.display = 'block';
          
          // Verstecke PayPal Container
          container.style.display = 'none';
        },

        onError: (err) => {
          console.error('PayPal Fehler:', err);
          const formError = document.getElementById('formError');
          if (formError) formError.textContent = 'Es gab ein Problem mit PayPal.';
          
          // Zeige "Jetzt kaufen" Button wieder
          const buyNowBtn = document.getElementById('buyNowButton');
          if (buyNowBtn) buyNowBtn.style.display = 'block';
          
          // Verstecke PayPal Container
          container.style.display = 'none';
        }
      }).render(container);

      console.log('✓ PayPal Button gerendert');

    } catch (error) {
      console.error('Fehler beim Rendern des PayPal Buttons:', error);
      const formError = document.getElementById('formError');
      if (formError) formError.textContent = 'PayPal-Button konnte nicht geladen werden.';
    }
  }

  // Alte renderPayPalButtons Funktion nicht mehr benötigt - 
  // Buttons werden dynamisch bei Klick auf "Jetzt kaufen" gerendert

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

    // Lausche auf checkout:start Event
    window.addEventListener('checkout:start', (e) => {
      const paymentMethod = e.detail.paymentMethod;
      console.log('checkout:start Event empfangen, Methode:', paymentMethod);
      initiatePayPalPayment(paymentMethod);
    });

    console.log('✓ PayPal initialisiert');
  }

  // Starte Initialisierung wenn Seite geladen ist
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPayPal);
  } else {
    initPayPal();
  }
})();
