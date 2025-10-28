# 🔄 Datenfluss: Pixel-Poster mit Supabase

## Kompletter Bestell-Ablauf

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. KUNDE: Erstellt Pixel-Art-Poster                                 │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. BROWSER: Pixelisierung (app.js + pixelate.js)                   │
│    • Bild hochladen                                                 │
│    • Pixel-Settings anpassen                                        │
│    • Crop-Bereich wählen                                            │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. WARENKORB: "In den Warenkorb" oder "Direkt kaufen"              │
│    • Poster-Vorschau als Data URL gespeichert                      │
│    • Größe + Preis + Settings gespeichert                          │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. CHECKOUT-MODAL: Kunde füllt Formular aus                        │
│    • Name, E-Mail, Adresse                                          │
│    • Zahlungsmethode wählen (PayPal / Kreditkarte)                 │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. PAYPAL: Zahlung (paypal.js)                                     │
│    • createOrder() → PayPal Order ID                                │
│    • Kunde zahlt via PayPal-Popup                                   │
│    • onApprove() → Zahlung erfolgreich                              │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. SUPABASE: Daten speichern (supabase-client.js)                  │
│                                                                      │
│    ┌─────────────────────────────────────────────────────────────┐ │
│    │ 6.1 Kunde speichern → customers Tabelle                     │ │
│    └─────────────────────────────────────────────────────────────┘ │
│                            │                                         │
│    ┌─────────────────────────────────────────────────────────────┐ │
│    │ 6.2 Bestellung speichern → orders Tabelle                   │ │
│    │     • Verknüpfung mit customer_id                           │ │
│    │     • PayPal Order ID                                        │ │
│    └─────────────────────────────────────────────────────────────┘ │
│                            │                                         │
│    ┌─────────────────────────────────────────────────────────────┐ │
│    │ 6.3 Für jedes Poster im Warenkorb:                          │ │
│    │     a) Bild hochladen → Storage (poster-images)             │ │
│    │     b) Order Item speichern → order_items Tabelle           │ │
│    │        • Verknüpfung mit order_id                           │ │
│    │        • URL zum Bild in Storage                            │ │
│    └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. SUCCESS: Feedback an Kunde                                       │
│    • Toast-Nachricht: "Zahlung erfolgreich!"                       │
│    • Warenkorb leeren                                               │
│    • Modal schließen                                                │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 8. PHASE 3 (SPÄTER): E-Mail-Versand via Brevo                      │
│    • Bestellbestätigung an Kunde                                    │
│    • Benachrichtigung an Admin                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Supabase Datenbank-Struktur

```
┌─────────────────────────────────────────────────────────────────┐
│ CUSTOMERS                                                        │
├─────────────────────────────────────────────────────────────────┤
│ id (UUID) [PRIMARY KEY]                                         │
│ created_at                                                      │
│ vorname, nachname, email                                        │
│ telefon                                                         │
│ strasse, hausnummer, plz, ort, land                            │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ 1:N
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ ORDERS                                                          │
├─────────────────────────────────────────────────────────────────┤
│ id (UUID) [PRIMARY KEY]                                         │
│ customer_id [FOREIGN KEY → customers]                           │
│ created_at                                                      │
│ paypal_order_id (UNIQUE)                                        │
│ paypal_payer_id                                                 │
│ payment_status, payment_method                                  │
│ total_amount, currency, item_count                              │
│ order_timestamp                                                 │
│ fulfillment_status (pending, processing, shipped, completed)    │
│ notes                                                           │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ 1:N
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ ORDER_ITEMS                                                     │
├─────────────────────────────────────────────────────────────────┤
│ id (UUID) [PRIMARY KEY]                                         │
│ order_id [FOREIGN KEY → orders]                                 │
│ created_at                                                      │
│ size, price, orientation                                        │
│ image_url → verweist auf Storage                                │
│ pixel_resolution, palette_size, dithering, brightness           │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ verweist auf
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ STORAGE: poster-images (PUBLIC BUCKET)                          │
├─────────────────────────────────────────────────────────────────┤
│ orders/                                                         │
│   └── {order-id}/                                               │
│       ├── {order-id}_item-0_timestamp.png                       │
│       ├── {order-id}_item-1_timestamp.png                       │
│       └── ...                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Code-Ablauf im Detail

### 1. PayPal-Zahlung erfolgreich (`paypal.js`)

```javascript
onApprove: async (data, actions) => {
  // Zahlung abschließen
  const order = await actions.order.capture();
  
  // Daten sammeln
  const orderData = {
    orderId: order.id,
    payerId: order.payer.payer_id,
    customerData: getCustomerData(),
    cart: window.pixelPosterCart
  };
  
  // ⭐ SUPABASE: Bestellung speichern
  await window.SupabaseClient.saveOrder(orderData);
}
```

### 2. Supabase speichert Daten (`supabase-client.js`)

```javascript
async function saveOrder(orderData) {
  // 1. Kunde speichern
  const customer = await supabase
    .from('customers')
    .insert({ ... })
    .select()
    .single();
  
  // 2. Bestellung speichern
  const order = await supabase
    .from('orders')
    .insert({
      customer_id: customer.id,
      paypal_order_id: orderData.orderId,
      ...
    })
    .select()
    .single();
  
  // 3. Für jedes Poster:
  for (let item of orderData.cart) {
    // a) Bild hochladen
    const imageUrl = await uploadPosterImage(
      item.imageDataUrl,
      order.id,
      index
    );
    
    // b) Order Item speichern
    await supabase
      .from('order_items')
      .insert({
        order_id: order.id,
        image_url: imageUrl,
        ...
      });
  }
}
```

### 3. Bild-Upload zu Storage

```javascript
async function uploadPosterImage(dataUrl, orderId, index) {
  // Data URL → Blob konvertieren
  const blob = dataURLtoBlob(dataUrl);
  
  // Dateiname generieren
  const fileName = `orders/${orderId}/item-${index}_${Date.now()}.png`;
  
  // Upload zu Supabase Storage
  await supabase.storage
    .from('poster-images')
    .upload(fileName, blob);
  
  // Öffentliche URL zurückgeben
  const { publicUrl } = supabase.storage
    .from('poster-images')
    .getPublicUrl(fileName);
  
  return publicUrl;
}
```

---

## 🔐 Sicherheit & Fehlerbehandlung

### Robustheit

```
┌─────────────────────────────────────────┐
│ Zahlung erfolgreich?                    │
└─────────────────────────────────────────┘
            │
            ├─────── JA ──────┐
            │                 │
            ▼                 ▼
┌──────────────────┐  ┌─────────────────────────┐
│ Supabase OK?     │  │ Supabase speichern      │
└──────────────────┘  └─────────────────────────┘
            │                 │
            ├─── JA ──────────┤
            │                 │
            │                 ▼
            │         ✅ Perfekt!
            │
            └─── NEIN ────────┐
                              │
                              ▼
                    ⚠️ Warnung loggen
                    ✅ Kunde bekommt Zahlung bestätigt
                    📊 Bestellung ist in PayPal-Dashboard
```

### Row Level Security (RLS)

Supabase-Tabellen sind geschützt:

```sql
-- Jeder kann INSERT (für Checkout)
CREATE POLICY "Anyone can insert"
  ON customers FOR INSERT
  WITH CHECK (true);

-- Nur Service Role kann SELECT/UPDATE/DELETE
-- (Für Admin-Dashboard später)
```

---

## 📊 Beispiel-Daten

Nach einer Testbestellung:

### `customers` Tabelle

| id | vorname | nachname | email | strasse | plz | ort |
|----|---------|----------|-------|---------|-----|-----|
| `abc-123` | Max | Mustermann | max@example.com | Musterstr. 1 | 12345 | Berlin |

### `orders` Tabelle

| id | customer_id | paypal_order_id | total_amount | item_count | fulfillment_status |
|----|-------------|-----------------|--------------|------------|--------------------|
| `def-456` | `abc-123` | `7HE12345...` | 33.70 | 1 | pending |

### `order_items` Tabelle

| id | order_id | size | price | image_url |
|----|----------|------|-------|-----------|
| `ghi-789` | `def-456` | 50x70 | 33.70 | `https://xxx.supabase.co/storage/.../item-0.png` |

### Storage: `poster-images`

```
orders/
  └── def-456/
      └── def-456_item-0_1234567890.png (das Pixel-Art-Poster)
```

---

## 🎯 Phase 3 Vorschau: E-Mail-Versand

```
┌─────────────────────────────────────────────────────────────────┐
│ Nach Supabase-Speicherung                                       │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ E-Mail Service (Brevo / Resend)                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ E-Mail 1: An Kunde                                         │ │
│  │  • Betreff: "Bestellbestätigung #12345"                   │ │
│  │  • Inhalt: Bestelldetails, Poster-Vorschau, Tracking      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ E-Mail 2: An Admin (dich)                                  │ │
│  │  • Betreff: "Neue Bestellung: #12345"                     │ │
│  │  • Inhalt: Kundendaten, Poster-Links, Versandadresse      │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Bereit für Phase 3?** Sag Bescheid wenn Supabase läuft! 🚀

