(() => {
  const modalForm = document.getElementById('modalForm');
  const formError = document.getElementById('formError');
  let order = { size: null, orientation: 'portrait', price: 0 };

  function validateForm() {
    formError.textContent = '';
    const vorname = modalForm.vorname.value.trim();
    const nachname = modalForm.nachname.value.trim();
    const email = modalForm.email.value.trim();
    const strasse = modalForm.strasse.value.trim();
    const hausnummer = modalForm.hausnummer.value.trim();
    const plz = modalForm.plz.value.trim();
    const ort = modalForm.ort.value.trim();
    if (!vorname || !nachname || !email || !strasse || !hausnummer || !plz || !ort) {
      formError.textContent = 'Bitte alle Pflichtfelder ausfüllen.';
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      formError.textContent = 'Bitte eine gültige E-Mail-Adresse eingeben.';
      return false;
    }
    if (!order.size || !order.price) {
      formError.textContent = 'Bitte zuerst eine Postergröße wählen.';
      return false;
    }
    return true;
  }

  function ensurePaypalButtons() {
    if (!window.paypal || !paypal.Buttons) {
      // SDK not loaded yet
      setTimeout(ensurePaypalButtons, 300);
      return;
    }
    const container = document.getElementById('paypal-button-container');
    container.innerHTML = '';
    paypal.Buttons({
      style: { layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay' },
      onInit: (_, actions) => {
        if (!validateForm()) actions.disable();
        modalForm.addEventListener('input', () => {
          if (validateForm()) actions.enable(); else actions.disable();
        });
        window.addEventListener('order:updated', () => {
          if (validateForm()) actions.enable(); else actions.disable();
        });
      },
      createOrder: (data, actions) => {
        if (!validateForm()) return;
        const description = `Pixel-Poster ${order.orientation} ${order.size}`;
        return actions.order.create({
          purchase_units: [{
            amount: { currency_code: 'EUR', value: order.price.toFixed(2) },
            description,
            custom_id: JSON.stringify({
              size: order.size,
              orientation: order.orientation,
              vorname: modalForm.vorname.value.trim(),
              nachname: modalForm.nachname.value.trim(),
              email: modalForm.email.value.trim(),
              telefon: modalForm.telefon.value.trim(),
              adresse: `${modalForm.strasse.value.trim()} ${modalForm.hausnummer.value.trim()}, ${modalForm.plz.value.trim()} ${modalForm.ort.value.trim()}, Deutschland`,
            })
          }],
          application_context: { shipping_preference: 'GET_FROM_FILE' }
        });
      },
      onApprove: async (data, actions) => {
        try {
          await actions.order.capture();
          const successUrl = new URL(window.location.href);
          successUrl.hash = '#checkout';
          successUrl.searchParams.set('status', 'success');
          window.location.assign(successUrl.toString());
        } catch (e) {
          formError.textContent = 'Payment could not be completed. Please try again.';
        }
      },
      onCancel: () => {
        formError.textContent = 'Payment was cancelled.';
      },
      onError: () => {
        formError.textContent = 'An error occurred with PayPal. Please try again.';
      }
    }).render('#paypal-button-container');
  }

  window.addEventListener('order:updated', (e) => {
    order = { ...order, ...e.detail };
  });

  if (document.readyState !== 'loading') ensurePaypalButtons();
  else document.addEventListener('DOMContentLoaded', ensurePaypalButtons);
})();


