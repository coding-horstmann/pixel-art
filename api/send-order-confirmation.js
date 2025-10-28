/**
 * Vercel Serverless Function: E-Mail-Versand bei Bestellung
 * Sendet Bestellbestätigung an Kunde und Shop-Betreiber via Brevo
 */

export default async function handler(req, res) {
  // Nur POST-Anfragen erlauben
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      orderData,
      customerData,
      cart,
      orderImages, // Array von Base64-encoded Bildern
      recaptchaToken // Google reCAPTCHA v3 Token
    } = req.body;

    // Validierung
    if (!orderData || !customerData || !cart || cart.length === 0) {
      return res.status(400).json({ error: 'Fehlende Bestelldaten' });
    }

    // reCAPTCHA v3 Verifizierung (Bot-Schutz)
    if (recaptchaToken) {
      const isHuman = await verifyRecaptcha(recaptchaToken);
      if (!isHuman) {
        console.warn('⚠️ reCAPTCHA-Verifizierung fehlgeschlagen - möglicher Bot-Angriff');
        console.warn('Token:', recaptchaToken.substring(0, 20) + '...');
        return res.status(403).json({ 
          error: 'Sicherheitsüberprüfung fehlgeschlagen. Bitte versuche es erneut.',
          code: 'RECAPTCHA_FAILED'
        });
      }
      console.log('✅ reCAPTCHA-Verifizierung erfolgreich - Bestellung ist legitim');
    } else {
      console.warn('⚠️ Kein reCAPTCHA-Token erhalten - möglicher Bot oder veralteter Client');
      // Optional: Bestellung trotzdem durchführen (fail-open) oder blockieren (fail-closed)
      // Für bessere UX: fail-open (erlauben), aber warnen
    }

    // Brevo API-Key aus Umgebungsvariablen
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const SHOP_EMAIL = process.env.SHOP_EMAIL || 'shop@pixel-poster.de';
    const SHOP_NAME = process.env.SHOP_NAME || 'Pixel-Poster';

    if (!BREVO_API_KEY) {
      console.error('❌ BREVO_API_KEY nicht konfiguriert');
      return res.status(500).json({ error: 'E-Mail-Service nicht konfiguriert' });
    }

    // Brevo API-Aufruf vorbereiten
    const brevoApiUrl = 'https://api.brevo.com/v3/smtp/email';

    // 1. E-Mail an den Kunden
    const customerEmailResult = await sendCustomerEmail({
      brevoApiUrl,
      apiKey: BREVO_API_KEY,
      shopEmail: SHOP_EMAIL,
      shopName: SHOP_NAME,
      customerData,
      orderData,
      cart,
      orderImages
    });

    // 2. E-Mail an den Shop-Betreiber
    const shopEmailResult = await sendShopEmail({
      brevoApiUrl,
      apiKey: BREVO_API_KEY,
      shopEmail: SHOP_EMAIL,
      shopName: SHOP_NAME,
      customerData,
      orderData,
      cart,
      orderImages
    });

    // Erfolgsantwort
    return res.status(200).json({
      success: true,
      message: 'E-Mails erfolgreich versendet',
      customerEmail: customerEmailResult,
      shopEmail: shopEmailResult
    });

  } catch (error) {
    console.error('❌ Fehler beim E-Mail-Versand:', error);
    return res.status(500).json({
      error: 'E-Mail-Versand fehlgeschlagen',
      details: error.message
    });
  }
}

/**
 * Sendet Bestellbestätigung an den Kunden
 */
async function sendCustomerEmail({
  brevoApiUrl,
  apiKey,
  shopEmail,
  shopName,
  customerData,
  orderData,
  cart,
  orderImages
}) {
  const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);

  // HTML-Template für Kunde
  const htmlContent = generateCustomerEmailHTML({
    customerData,
    orderData,
    cart,
    totalAmount,
    shopName,
    shopEmail
  });

  // Vorbereitung der Anhänge (Bilder)
  const attachments = orderImages.map((imageData, index) => {
    // Entferne "data:image/png;base64," Prefix
    const base64Content = imageData.replace(/^data:image\/\w+;base64,/, '');
    
    return {
      name: `poster-${index + 1}.png`,
      content: base64Content
    };
  });

  // Brevo API Request
  const requestBody = {
    sender: {
      name: shopName,
      email: shopEmail
    },
    to: [
      {
        email: customerData.email,
        name: `${customerData.vorname} ${customerData.nachname}`
      }
    ],
    subject: `Bestellbestätigung - Deine Pixel-Poster sind in Produktion! 🎨`,
    htmlContent: htmlContent,
    attachment: attachments
  };

  const response = await fetch(brevoApiUrl, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Brevo API Fehler (Kunde): ${JSON.stringify(errorData)}`);
  }

  const result = await response.json();
  console.log('✅ Kunden-E-Mail versendet:', result);
  return result;
}

/**
 * Sendet Bestellbenachrichtigung an Shop-Betreiber
 */
async function sendShopEmail({
  brevoApiUrl,
  apiKey,
  shopEmail,
  shopName,
  customerData,
  orderData,
  cart,
  orderImages
}) {
  const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);

  // HTML-Template für Shop
  const htmlContent = generateShopEmailHTML({
    customerData,
    orderData,
    cart,
    totalAmount
  });

  // Vorbereitung der Anhänge (Bilder)
  const attachments = orderImages.map((imageData, index) => {
    const base64Content = imageData.replace(/^data:image\/\w+;base64,/, '');
    
    return {
      name: `poster-${index + 1}.png`,
      content: base64Content
    };
  });

  // Brevo API Request
  const requestBody = {
    sender: {
      name: shopName,
      email: shopEmail
    },
    to: [
      {
        email: shopEmail,
        name: shopName
      }
    ],
    subject: `🔔 Neue Bestellung #${orderData.orderId.substring(0, 8)} - ${cart.length} Poster`,
    htmlContent: htmlContent,
    attachment: attachments
  };

  const response = await fetch(brevoApiUrl, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Brevo API Fehler (Shop): ${JSON.stringify(errorData)}`);
  }

  const result = await response.json();
  console.log('✅ Shop-E-Mail versendet:', result);
  return result;
}

/**
 * Generiert HTML für Kunden-E-Mail
 */
function generateCustomerEmailHTML({ customerData, orderData, cart, totalAmount, shopName, shopEmail }) {
  const itemsHTML = cart.map((item, index) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">Poster ${index + 1}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.size}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.orientation === 'portrait' ? 'Hochformat' : 'Querformat'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">€${item.price.toFixed(2)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bestellbestätigung</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">🎨 ${shopName}</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">Deine Bestellung ist eingegangen!</p>
            </td>
          </tr>

          <!-- Begrüßung -->
          <tr>
            <td style="padding: 40px 30px 20px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #333; font-size: 24px;">Hallo ${customerData.vorname}! 👋</h2>
              <p style="margin: 0 0 15px 0; color: #555; font-size: 16px; line-height: 1.6;">
                Vielen Dank für deine Bestellung! Wir haben deine Pixel-Art Poster erhalten und machen uns sofort an die Produktion.
              </p>
              <p style="margin: 0 0 15px 0; color: #555; font-size: 16px; line-height: 1.6;">
                Deine individuell erstellten Poster findest du als Anhang dieser E-Mail. 
              </p>
            </td>
          </tr>

          <!-- Bestelldetails -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <div style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">📦 Bestellnummer</h3>
                <p style="margin: 0; font-family: monospace; font-size: 14px; color: #667eea; font-weight: bold;">
                  ${orderData.orderId}
                </p>
              </div>

              <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">🛒 Deine Artikel</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #eee; border-radius: 6px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f8f9fa;">
                    <th style="padding: 12px; text-align: left; font-size: 14px; color: #666; font-weight: 600;">Artikel</th>
                    <th style="padding: 12px; text-align: left; font-size: 14px; color: #666; font-weight: 600;">Größe</th>
                    <th style="padding: 12px; text-align: left; font-size: 14px; color: #666; font-weight: 600;">Format</th>
                    <th style="padding: 12px; text-align: right; font-size: 14px; color: #666; font-weight: 600;">Preis</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHTML}
                  <tr>
                    <td colspan="3" style="padding: 15px 12px; font-weight: bold; font-size: 16px; border-top: 2px solid #667eea;">Gesamtsumme</td>
                    <td style="padding: 15px 12px; font-weight: bold; font-size: 16px; text-align: right; color: #667eea; border-top: 2px solid #667eea;">€${totalAmount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Lieferadresse -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">🚚 Lieferadresse</h3>
              <div style="background-color: #f8f9fa; border-radius: 6px; padding: 20px;">
                <p style="margin: 0; color: #555; font-size: 15px; line-height: 1.8;">
                  <strong>${customerData.vorname} ${customerData.nachname}</strong><br>
                  ${customerData.strasse} ${customerData.hausnummer}<br>
                  ${customerData.plz} ${customerData.ort}<br>
                  ${customerData.land}
                </p>
              </div>
            </td>
          </tr>

          <!-- Nächste Schritte -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <div style="background-color: #eff6ff; border-left: 4px solid #667eea; border-radius: 6px; padding: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">⏱️ Wie geht es weiter?</h3>
                <p style="margin: 0; color: #555; font-size: 14px; line-height: 1.6;">
                  1. Wir drucken deine Poster in hochwertiger Qualität<br>
                  2. Versand erfolgt innerhalb von <strong>5 Werktagen</strong><br>
                  3. Du erhältst eine Versandbestätigung mit Tracking-Nummer
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #eee;">
              <p style="margin: 0 0 10px 0; color: #888; font-size: 14px;">
                Bei Fragen erreichst du uns jederzeit unter <a href="mailto:${shopEmail}" style="color: #667eea; text-decoration: none;">${shopEmail}</a>
              </p>
              <p style="margin: 0; color: #aaa; font-size: 12px;">
                © ${new Date().getFullYear()} ${shopName} - Transform Your Photos Into Epic Pixel Art!
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Generiert HTML für Shop-E-Mail
 */
function generateShopEmailHTML({ customerData, orderData, cart, totalAmount }) {
  const itemsHTML = cart.map((item, index) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">Poster ${index + 1}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.size}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.orientation === 'portrait' ? 'Hochformat' : 'Querformat'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">€${item.price.toFixed(2)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Neue Bestellung</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">🔔 Neue Bestellung!</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">Eine neue Pixel-Poster Bestellung ist eingegangen</p>
            </td>
          </tr>

          <!-- Bestellübersicht -->
          <tr>
            <td style="padding: 30px;">
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 6px; padding: 15px; margin-bottom: 25px;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  <strong>Action erforderlich:</strong> Bitte Poster drucken und versenden!
                </p>
              </div>

              <h2 style="margin: 0 0 20px 0; color: #333; font-size: 20px;">📦 Bestelldetails</h2>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px; width: 150px;"><strong>Bestellnummer:</strong></td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px; font-family: monospace;">${orderData.orderId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>PayPal Order ID:</strong></td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px; font-family: monospace;">${orderData.payerId || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Zahlungsmethode:</strong></td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px;">${orderData.paymentMethod === 'paypal' ? 'PayPal' : 'Kreditkarte/Lastschrift'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Bestellzeitpunkt:</strong></td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px;">${new Date(orderData.timestamp).toLocaleString('de-DE')}</td>
                </tr>
              </table>

              <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">🛒 Bestellte Artikel</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #eee; border-radius: 6px; overflow: hidden; margin-bottom: 25px;">
                <thead>
                  <tr style="background-color: #f8f9fa;">
                    <th style="padding: 12px; text-align: left; font-size: 14px; color: #666; font-weight: 600;">Artikel</th>
                    <th style="padding: 12px; text-align: left; font-size: 14px; color: #666; font-weight: 600;">Größe</th>
                    <th style="padding: 12px; text-align: left; font-size: 14px; color: #666; font-weight: 600;">Format</th>
                    <th style="padding: 12px; text-align: right; font-size: 14px; color: #666; font-weight: 600;">Preis</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHTML}
                  <tr>
                    <td colspan="3" style="padding: 15px 12px; font-weight: bold; font-size: 16px; border-top: 2px solid #f5576c;">Gesamtsumme</td>
                    <td style="padding: 15px 12px; font-weight: bold; font-size: 16px; text-align: right; color: #f5576c; border-top: 2px solid #f5576c;">€${totalAmount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">👤 Kundendaten</h3>
              <div style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 5px 0; color: #666; font-size: 14px; width: 120px;"><strong>Name:</strong></td>
                    <td style="padding: 5px 0; color: #333; font-size: 14px;">${customerData.vorname} ${customerData.nachname}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #666; font-size: 14px;"><strong>E-Mail:</strong></td>
                    <td style="padding: 5px 0; color: #333; font-size: 14px;"><a href="mailto:${customerData.email}" style="color: #667eea; text-decoration: none;">${customerData.email}</a></td>
                  </tr>
                  ${customerData.telefon ? `
                  <tr>
                    <td style="padding: 5px 0; color: #666; font-size: 14px;"><strong>Telefon:</strong></td>
                    <td style="padding: 5px 0; color: #333; font-size: 14px;">${customerData.telefon}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 5px 0; color: #666; font-size: 14px;"><strong>Adresse:</strong></td>
                    <td style="padding: 5px 0; color: #333; font-size: 14px;">
                      ${customerData.strasse} ${customerData.hausnummer}<br>
                      ${customerData.plz} ${customerData.ort}<br>
                      ${customerData.land}
                    </td>
                  </tr>
                </table>
              </div>

              <div style="background-color: #d1ecf1; border-left: 4px solid #0c5460; border-radius: 6px; padding: 15px;">
                <p style="margin: 0; color: #0c5460; font-size: 14px;">
                  <strong>💡 Hinweis:</strong> Die zu druckenden Poster-Bilder findest du als Anhang dieser E-Mail.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
              <p style="margin: 0; color: #888; font-size: 12px;">
                Automatisch generierte E-Mail vom Pixel-Poster System
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Verifiziert reCAPTCHA v3 Token serverseitig
 * @param {string} token - Das reCAPTCHA-Token vom Client
 * @returns {Promise<boolean>} true wenn menschlich, false wenn Bot
 */
async function verifyRecaptcha(token) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  
  if (!secretKey) {
    console.error('❌ RECAPTCHA_SECRET_KEY nicht in Umgebungsvariablen konfiguriert');
    // Fail-open: Ohne Secret Key können wir nicht verifizieren, also durchlassen
    return true;
  }

  // Prüfe ob Secret Key ein Platzhalter ist
  if (secretKey.includes('##') || secretKey === '') {
    console.warn('⚠️ RECAPTCHA_SECRET_KEY ist Platzhalter - Verifizierung übersprungen');
    return true;
  }

  try {
    console.log('🔍 Verifiziere reCAPTCHA-Token bei Google...');
    
    // Google reCAPTCHA Verify API
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `secret=${secretKey}&response=${token}`
    });

    if (!response.ok) {
      console.error('❌ reCAPTCHA API-Anfrage fehlgeschlagen:', response.status);
      return true; // Fail-open bei API-Fehler
    }

    const data = await response.json();
    
    console.log('📊 reCAPTCHA-Ergebnis:', {
      success: data.success,
      score: data.score,
      action: data.action,
      hostname: data.hostname,
      challenge_ts: data.challenge_ts
    });

    // reCAPTCHA v3 gibt einen Score von 0.0 (Bot) bis 1.0 (Mensch)
    if (!data.success) {
      console.warn('❌ reCAPTCHA-Verifizierung fehlgeschlagen:', data['error-codes']);
      return false;
    }

    // Score-basierte Entscheidung
    const score = data.score;
    const minScore = 0.5; // Empfohlener Schwellenwert (anpassbar)

    if (score >= minScore) {
      console.log(`✅ reCAPTCHA-Score: ${score} (>= ${minScore}) - Mensch verifiziert`);
      return true;
    } else if (score >= 0.3) {
      // Grauzone: Score zwischen 0.3 und 0.5
      console.warn(`⚠️ reCAPTCHA-Score: ${score} - Verdächtig niedrig, aber durchgelassen`);
      console.warn('💡 Tipp: Manuelle Prüfung der Bestellung empfohlen');
      return true; // Optional: return false für strikte Kontrolle
    } else {
      // Sehr niedriger Score: Wahrscheinlich Bot
      console.error(`❌ reCAPTCHA-Score: ${score} - Sehr niedrig! Wahrscheinlich Bot`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Fehler bei reCAPTCHA-Verifizierung:', error);
    // Fail-open: Bei Fehler durchlassen (bessere UX)
    // Fail-closed wäre: return false
    return true;
  }
}
