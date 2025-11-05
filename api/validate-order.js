/**
 * Preis-Validierung für Bestellungen
 * Verhindert Preis-Manipulation durch Client-seitige Änderungen
 */

// Preisliste - muss identisch mit app.js sein
const PRICE_LIST = {
  '21x29.7': 20.65,
  '29.7x42': 33.73,
  '42x59.4': 37.80,
  '50x70': 33.70,
  '59.4x84.1': 50.63,
  '84.1x118.9': 50.63,
};

// Gültige Größen
const VALID_SIZES = Object.keys(PRICE_LIST);

/**
 * Validiert Preise einer Bestellung
 * @param {Array} cart - Array von Cart-Items mit { size, price, ... }
 * @returns {{ valid: boolean, expectedTotal: number, receivedTotal: number, errors: Array<string> }}
 */
function validatePrices(cart) {
  if (!Array.isArray(cart) || cart.length === 0) {
    return {
      valid: false,
      expectedTotal: 0,
      receivedTotal: 0,
      errors: ['Warenkorb ist leer oder ungültig']
    };
  }

  if (cart.length > 20) {
    return {
      valid: false,
      expectedTotal: 0,
      receivedTotal: 0,
      errors: ['Zu viele Artikel im Warenkorb (max. 20)']
    };
  }

  const errors = [];
  let expectedTotal = 0;
  let receivedTotal = 0;

  cart.forEach((item, index) => {
    // Prüfe ob Größe vorhanden und gültig ist
    if (!item.size || typeof item.size !== 'string') {
      errors.push(`Artikel ${index + 1}: Größe fehlt oder ist ungültig`);
      return;
    }

    if (!VALID_SIZES.includes(item.size)) {
      errors.push(`Artikel ${index + 1}: Ungültige Größe "${item.size}"`);
      return;
    }

    // Prüfe ob Preis vorhanden und eine Zahl ist
    if (typeof item.price !== 'number' || isNaN(item.price) || item.price <= 0) {
      errors.push(`Artikel ${index + 1}: Preis fehlt oder ist ungültig`);
      return;
    }

    // Berechne erwarteten Preis für diese Größe
    const expectedPrice = PRICE_LIST[item.size];
    expectedTotal += expectedPrice;
    receivedTotal += item.price;

    // Prüfe ob Preis genau dem erwarteten Preis entspricht (mit Toleranz für Fließkomma-Rundung)
    const priceDiff = Math.abs(item.price - expectedPrice);
    if (priceDiff > 0.01) { // Toleranz von 1 Cent für Rundungsfehler
      errors.push(`Artikel ${index + 1}: Preis stimmt nicht überein. Erwartet: €${expectedPrice.toFixed(2)}, Erhalten: €${item.price.toFixed(2)}`);
    }
  });

  // Prüfe Gesamtsumme (mit Toleranz)
  const totalDiff = Math.abs(receivedTotal - expectedTotal);
  if (totalDiff > 0.01 && errors.length === 0) {
    errors.push(`Gesamtsumme stimmt nicht überein. Erwartet: €${expectedTotal.toFixed(2)}, Erhalten: €${receivedTotal.toFixed(2)}`);
  }

  return {
    valid: errors.length === 0,
    expectedTotal: Math.round(expectedTotal * 100) / 100, // Runden auf 2 Dezimalstellen
    receivedTotal: Math.round(receivedTotal * 100) / 100,
    errors
  };
}

/**
 * Gibt die Preisliste zurück (für externe Nutzung)
 * @returns {Object} Preisliste
 */
function getPriceList() {
  return { ...PRICE_LIST };
}

/**
 * Gibt den Preis für eine bestimmte Größe zurück
 * @param {string} size - Größen-ID
 * @returns {number|null} Preis oder null wenn ungültig
 */
function getPriceForSize(size) {
  return PRICE_LIST[size] || null;
}

module.exports = {
  validatePrices,
  getPriceList,
  getPriceForSize,
  VALID_SIZES
};

