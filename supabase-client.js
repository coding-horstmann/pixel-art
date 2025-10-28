/**
 * Supabase Client für Pixel-Poster
 * Handhabt Bestellungen, Kundendaten und Bild-Uploads
 */

(() => {
  // Warte auf CONFIG
  function waitForConfig() {
    return new Promise((resolve) => {
      if (window.CONFIG && window.CONFIG.SUPABASE_URL && window.CONFIG.SUPABASE_ANON_KEY) {
        resolve(true);
        return;
      }
      
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        if (window.CONFIG && window.CONFIG.SUPABASE_URL && window.CONFIG.SUPABASE_ANON_KEY) {
          clearInterval(checkInterval);
          resolve(true);
        } else if (attempts > 50) {
          clearInterval(checkInterval);
          console.error('Supabase-Konfiguration nicht verfügbar');
          resolve(false);
        }
      }, 100);
    });
  }

  // Initialisiere Supabase Client
  let supabaseClient = null;

  async function initSupabaseClient() {
    const configReady = await waitForConfig();
    if (!configReady) {
      console.warn('⚠️ Supabase nicht konfiguriert - Bestellungen werden nicht gespeichert!');
      return null;
    }

    const SUPABASE_URL = window.CONFIG.SUPABASE_URL;
    const SUPABASE_ANON_KEY = window.CONFIG.SUPABASE_ANON_KEY;

    // Prüfe ob Platzhalter
    if (SUPABASE_URL.includes('##') || SUPABASE_ANON_KEY.includes('##')) {
      console.warn('⚠️ Supabase nicht konfiguriert (Platzhalter) - Bestellungen werden nicht gespeichert!');
      return null;
    }

    // Lade Supabase SDK dynamisch
    if (!window.supabase) {
      await loadSupabaseSDK();
    }

    if (!window.supabase || !window.supabase.createClient) {
      console.error('❌ Supabase SDK konnte nicht geladen werden');
      return null;
    }

    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✓ Supabase Client initialisiert');
    return supabaseClient;
  }

  // Lädt Supabase SDK dynamisch
  function loadSupabaseSDK() {
    return new Promise((resolve, reject) => {
      if (document.getElementById('supabase-sdk')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = 'supabase-sdk';
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => {
        console.log('✓ Supabase SDK geladen');
        resolve();
      };
      script.onerror = () => {
        console.error('❌ Fehler beim Laden des Supabase SDK');
        reject();
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Konvertiert Data URL zu Blob
   */
  function dataURLtoBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  /**
   * Lädt ein Poster-Bild in Supabase Storage hoch
   * @param {string} imageDataUrl - Data URL des Bildes
   * @param {string} orderId - Bestellungs-ID
   * @param {number} itemIndex - Index des Items in der Bestellung
   * @returns {Promise<string>} - Öffentliche URL des hochgeladenen Bildes
   */
  async function uploadPosterImage(imageDataUrl, orderId, itemIndex) {
    if (!supabaseClient) {
      throw new Error('Supabase Client nicht initialisiert');
    }

    try {
      // Konvertiere Data URL zu Blob
      const blob = dataURLtoBlob(imageDataUrl);
      
      // Generiere eindeutigen Dateinamen
      const timestamp = Date.now();
      const fileName = `${orderId}_item-${itemIndex}_${timestamp}.png`;
      const filePath = `orders/${orderId}/${fileName}`;

      console.log(`📤 Lade Bild hoch: ${filePath}`);

      // Upload zu Supabase Storage
      const { data, error } = await supabaseClient.storage
        .from('poster-images')
        .upload(filePath, blob, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Fehler beim Bild-Upload:', error);
        throw error;
      }

      console.log('✓ Bild hochgeladen:', data.path);

      // Hole öffentliche URL
      const { data: urlData } = supabaseClient.storage
        .from('poster-images')
        .getPublicUrl(filePath);

      console.log('✓ Öffentliche URL:', urlData.publicUrl);
      return urlData.publicUrl;

    } catch (error) {
      console.error('❌ Fehler beim Hochladen des Bildes:', error);
      throw error;
    }
  }

  /**
   * Speichert eine Bestellung in Supabase
   * @param {Object} orderData - Bestelldaten von PayPal
   * @returns {Promise<Object>} - Gespeicherte Bestellung mit IDs
   */
  async function saveOrder(orderData) {
    if (!supabaseClient) {
      console.warn('⚠️ Supabase nicht verfügbar - Bestellung wird nicht gespeichert!');
      return null;
    }

    try {
      console.log('💾 Speichere Bestellung in Supabase...');

      // 1. Speichere Kunde
      const customerData = orderData.customerData;
      const { data: customer, error: customerError } = await supabaseClient
        .from('customers')
        .insert({
          vorname: customerData.vorname,
          nachname: customerData.nachname,
          email: customerData.email,
          telefon: customerData.telefon || null,
          strasse: customerData.strasse,
          hausnummer: customerData.hausnummer,
          plz: customerData.plz,
          ort: customerData.ort,
          land: customerData.land || 'Deutschland'
        })
        .select()
        .single();

      if (customerError) {
        console.error('❌ Fehler beim Speichern des Kunden:', customerError);
        throw customerError;
      }

      console.log('✓ Kunde gespeichert:', customer.id);

      // 2. Speichere Bestellung
      const { data: order, error: orderError } = await supabaseClient
        .from('orders')
        .insert({
          customer_id: customer.id,
          paypal_order_id: orderData.orderId,
          paypal_payer_id: orderData.payerId,
          payment_status: orderData.status || 'COMPLETED',
          payment_method: orderData.paymentMethod || 'paypal',
          total_amount: parseFloat(orderData.amount),
          currency: orderData.currency || 'EUR',
          item_count: orderData.cart.length,
          order_timestamp: orderData.timestamp,
          fulfillment_status: 'pending'
        })
        .select()
        .single();

      if (orderError) {
        console.error('❌ Fehler beim Speichern der Bestellung:', orderError);
        throw orderError;
      }

      console.log('✓ Bestellung gespeichert:', order.id);

      // 3. Lade Bilder hoch und speichere Order Items
      const orderItems = [];
      for (let i = 0; i < orderData.cart.length; i++) {
        const item = orderData.cart[i];
        
        try {
          // Lade Bild hoch
          const imageUrl = await uploadPosterImage(item.imageDataUrl, order.id, i);

          // Speichere Order Item
          const { data: orderItem, error: itemError } = await supabaseClient
            .from('order_items')
            .insert({
              order_id: order.id,
              size: item.size,
              price: parseFloat(item.price),
              orientation: item.orientation || 'portrait',
              image_url: imageUrl,
              pixel_resolution: item.pixelResolution || null,
              palette_size: item.paletteSize || null,
              dithering: item.dithering || null,
              brightness: item.brightness || null
            })
            .select()
            .single();

          if (itemError) {
            console.error(`❌ Fehler beim Speichern von Item ${i}:`, itemError);
            throw itemError;
          }

          console.log(`✓ Item ${i + 1}/${orderData.cart.length} gespeichert`);
          orderItems.push(orderItem);

        } catch (itemError) {
          console.error(`❌ Fehler bei Item ${i}:`, itemError);
          // Fahre mit nächstem Item fort (nicht abbrechen)
        }
      }

      console.log('✅ Bestellung komplett gespeichert!');

      return {
        customer,
        order,
        orderItems
      };

    } catch (error) {
      console.error('❌ Fehler beim Speichern der Bestellung:', error);
      throw error;
    }
  }

  /**
   * Holt eine Bestellung aus Supabase
   * @param {string} orderId - Order UUID
   * @returns {Promise<Object>} - Bestellung mit Items und Kunde
   */
  async function getOrder(orderId) {
    if (!supabaseClient) {
      throw new Error('Supabase Client nicht initialisiert');
    }

    try {
      // Hole Bestellung mit Kunde (via Join)
      const { data: order, error: orderError } = await supabaseClient
        .from('orders')
        .select(`
          *,
          customer:customers(*),
          items:order_items(*)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error('❌ Fehler beim Laden der Bestellung:', orderError);
        throw orderError;
      }

      return order;

    } catch (error) {
      console.error('❌ Fehler beim Laden der Bestellung:', error);
      throw error;
    }
  }

  /**
   * Holt alle Bestellungen (für Admin-Dashboard später)
   * @param {number} limit - Anzahl der Bestellungen
   * @param {number} offset - Offset für Pagination
   * @returns {Promise<Array>} - Array von Bestellungen
   */
  async function getAllOrders(limit = 50, offset = 0) {
    if (!supabaseClient) {
      throw new Error('Supabase Client nicht initialisiert');
    }

    try {
      const { data: orders, error } = await supabaseClient
        .from('orders')
        .select(`
          *,
          customer:customers(*),
          items:order_items(*)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('❌ Fehler beim Laden der Bestellungen:', error);
        throw error;
      }

      return orders;

    } catch (error) {
      console.error('❌ Fehler beim Laden der Bestellungen:', error);
      throw error;
    }
  }

  // Exportiere Funktionen global
  window.SupabaseClient = {
    init: initSupabaseClient,
    saveOrder,
    getOrder,
    getAllOrders,
    uploadPosterImage
  };

  // Auto-initialisiere beim Laden
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initSupabaseClient();
    });
  } else {
    initSupabaseClient();
  }

  console.log('✓ Supabase Client Modul geladen');
})();

