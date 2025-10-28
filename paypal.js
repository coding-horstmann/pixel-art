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

    console.log('Formular validiert, öffne PayPal-Pop-up...');

    // Öffne Pop-up mit PayPal-Button
    openPayPalPopup(paymentMethod);
  }

  // Öffnet ein Pop-up-Fenster mit dem PayPal-Button
  function openPayPalPopup(paymentMethod) {
    // Erstelle Pop-up Overlay wenn nicht vorhanden
    let popup = document.getElementById('paypal-popup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'paypal-popup';
      popup.className = 'paypal-popup';
      popup.innerHTML = `
        <div class="paypal-popup-overlay"></div>
        <div class="paypal-popup-content">
          <button class="paypal-popup-close" aria-label="Schließen">✕</button>
          <h3 class="paypal-popup-title">Zahlung abschließen</h3>
          <p class="paypal-popup-text">Bitte klicke auf den Button unten, um deine Zahlung abzuschließen.</p>
          <div id="paypal-popup-button-container"></div>
        </div>
      `;
      document.body.appendChild(popup);

      // Close Handler
      const closeBtn = popup.querySelector('.paypal-popup-close');
      const overlay = popup.querySelector('.paypal-popup-overlay');
      
      const closePopup = () => {
        popup.classList.remove('is-open');
      };
      
      closeBtn.addEventListener('click', closePopup);
      overlay.addEventListener('click', closePopup);
    }

    // Zeige Pop-up
    popup.classList.add('is-open');

    // Rendere PayPal Button im Pop-up
    const container = document.getElementById('paypal-popup-button-container');
    if (container) {
      container.innerHTML = ''; // Leere vorherigen Inhalt
      renderPayPalButtonForMethod(paymentMethod, container);
    }
  }

  // Rendert einen einzelnen PayPal-Button für die gewählte Zahlungsmethode
  async function renderPayPalButtonForMethod(paymentMethod, container) {
    const paypal = await waitForPayPal();
    if (!paypal) {
      console.error('PayPal SDK nicht verfügbar');
      return;
    }

    console.log('Rendere PayPal-Button für Methode:', paymentMethod);

    // Bestimme Funding Source und Button Style
    let fundingSource = paypal.FUNDING.PAYPAL;
    let buttonColor = 'gold';
    
    if (paymentMethod === 'card' || paymentMethod === 'sepa') {
      // Kombiniere Kreditkarte + Lastschrift in einen Button
      // Nutze CARD funding source (PayPal zeigt dann beide Optionen an)
      fundingSource = paypal.FUNDING.CARD;
      buttonColor = 'black'; // Für card/sepa ist nur black oder white erlaubt
    }

    console.log('Verwende Funding Source:', fundingSource, 'Farbe:', buttonColor);

    try {
      const buttonInstance = paypal.Buttons({
        fundingSource: fundingSource,
        style: {
          layout: 'vertical',
          color: buttonColor,
          shape: 'rect',
          label: 'pay',
          height: 50
        },

      createOrder: (data, actions) => {
          const cart = window.pixelPosterCart || [];
          const total = calculateTotal(cart);
          const customerData = getCustomerData();

          // custom_id darf nur 127 Zeichen sein - speichere nur essenzielle Info
          const orderId = `ORDER-${Date.now()}`;
          
          // Speichere Bestelldaten temporär im Window für Phase 2 (Supabase)
          window.currentOrderData = {
            orderId: orderId,
            timestamp: Date.now(),
            itemCount: cart.length,
            customer: customerData,
            paymentMethod: paymentMethod,
            cart: cart
          };
          
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
              custom_id: orderId, // Nur Order-ID (kurz)
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

            // Speichere Bestellung in Supabase (falls verfügbar)
            if (window.SupabaseClient && window.SupabaseClient.saveOrder) {
              try {
                console.log('💾 Speichere Bestellung in Supabase...');
                const savedOrder = await window.SupabaseClient.saveOrder(orderData);
                console.log('✅ Bestellung in Supabase gespeichert:', savedOrder);
                
                // Füge Supabase Order ID zum orderData hinzu
                if (savedOrder && savedOrder.order) {
                  orderData.supabaseOrderId = savedOrder.order.id;
                }
              } catch (supabaseError) {
                console.error('⚠️ Fehler beim Speichern in Supabase (Zahlung war aber erfolgreich!):', supabaseError);
                // Zahlung war erfolgreich, auch wenn Supabase fehlschlug
                // Zeige Warnung aber breche nicht ab
                if (window.showToast) {
                  window.showToast('Zahlung erfolgreich! (Hinweis: Daten konnten nicht gespeichert werden)', '⚠️', 5000);
                }
              }
            } else {
              console.warn('⚠️ Supabase Client nicht verfügbar - Bestellung wird nicht gespeichert!');
            }

            // Sende Bestellbestätigungs-E-Mails (Kunde + Shop)
            try {
              console.log('📧 Sende Bestellbestätigungs-E-Mails...');
              
              // Sammle Bilder als Base64-Daten
              const orderImages = orderData.cart.map(item => item.imageDataUrl);
              
              const emailResponse = await fetch('/api/send-order-confirmation', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  orderData: {
                    orderId: order.id,
                    payerId: order.payer.payer_id,
                    timestamp: new Date().toISOString(),
                    paymentMethod: paymentMethod
                  },
                  customerData: orderData.customerData,
                  cart: orderData.cart.map(item => ({
                    size: item.size,
                    price: item.price,
                    orientation: item.orientation
                  })),
                  orderImages: orderImages
                })
              });

              if (emailResponse.ok) {
                const emailResult = await emailResponse.json();
                console.log('✅ E-Mails erfolgreich versendet:', emailResult);
              } else {
                const errorData = await emailResponse.json();
                console.error('⚠️ E-Mail-Versand fehlgeschlagen (Zahlung war aber erfolgreich!):', errorData);
                // Nicht abbrechen - Zahlung war erfolgreich!
              }
            } catch (emailError) {
              console.error('⚠️ Fehler beim E-Mail-Versand (Zahlung war aber erfolgreich!):', emailError);
              // Nicht abbrechen - Zahlung war erfolgreich!
            }

            window.dispatchEvent(new CustomEvent('payment:success', { detail: orderData }));

            if (window.showToast) {
              window.showToast('Zahlung erfolgreich! Vielen Dank für deine Bestellung!', '✓', 5000);
            }

            window.pixelPosterCart = [];
            window.dispatchEvent(new CustomEvent('cart:updated'));

            // Schließe Pop-up und Checkout-Modal
            const popup = document.getElementById('paypal-popup');
            if (popup) popup.classList.remove('is-open');

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
          
          // Schließe Pop-up
          const popup = document.getElementById('paypal-popup');
          if (popup) popup.classList.remove('is-open');
        },

        onError: (err) => {
          console.error('PayPal Fehler:', err);
          const formError = document.getElementById('formError');
          if (formError) formError.textContent = 'Es gab ein Problem mit PayPal.';
          
          // Schließe Pop-up
          const popup = document.getElementById('paypal-popup');
          if (popup) popup.classList.remove('is-open');
        }
      });

      // Rendere den Button
      await buttonInstance.render(container);
      console.log('✓ PayPal Button gerendert und sichtbar');

    } catch (error) {
      console.error('Fehler beim Rendern des PayPal Buttons:', error);
      const formError = document.getElementById('formError');
      if (formError) formError.textContent = 'PayPal-Button konnte nicht geladen werden: ' + error.message;
      
      // Schließe Pop-up
      const popup = document.getElementById('paypal-popup');
      if (popup) popup.classList.remove('is-open');
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
