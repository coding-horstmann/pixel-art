# 🗄️ Supabase Setup für Pixel-Poster

Diese Anleitung hilft dir, Supabase für dein Pixel-Poster-Projekt einzurichten.

## 📋 Schritt 1: Supabase-Projekt erstellen

1. Gehe zu [supabase.com](https://supabase.com)
2. Logge dich ein (oder erstelle einen Account)
3. Klicke auf "New Project"
4. Wähle einen Namen: z.B. `pixel-poster`
5. Wähle eine Region (am besten nahe deiner Zielgruppe, z.B. `Frankfurt` für Deutschland)
6. Erstelle ein starkes Database Password (speichere es sicher!)
7. Klicke auf "Create new project"
8. **Warte ca. 2-3 Minuten** bis das Projekt fertig ist

---

## 🔑 Schritt 2: API-Keys kopieren

Sobald das Projekt bereit ist:

1. Gehe zu **Settings** (Zahnrad-Symbol links unten) → **API**
2. Du siehst dort:
   - **Project URL:** `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key:** (langer String)
   - **service_role key:** (langer String - unter "Show")

3. Kopiere diese 3 Werte - du brauchst sie gleich!

---

## 🏗️ Schritt 3: Datenbank-Tabellen erstellen

### So führst du die SQL-Befehle aus:

1. Gehe in Supabase zu **SQL Editor** (links in der Sidebar)
2. Klicke auf **New query**
3. Kopiere den folgenden SQL-Code und füge ihn ein
4. Klicke auf **Run** (oder drücke Ctrl+Enter / Cmd+Enter)

### SQL-Code zum Kopieren:

```sql
-- ============================================
-- PIXEL-POSTER DATENBANK-SCHEMA
-- ============================================

-- Tabelle für Kunden
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  vorname TEXT NOT NULL,
  nachname TEXT NOT NULL,
  email TEXT NOT NULL,
  telefon TEXT,
  strasse TEXT NOT NULL,
  hausnummer TEXT NOT NULL,
  plz TEXT NOT NULL,
  ort TEXT NOT NULL,
  land TEXT NOT NULL DEFAULT 'Deutschland',
  
  -- Index für schnelle E-Mail-Suche
  CONSTRAINT customers_email_check CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$')
);

-- Index auf Email für schnelle Suchen
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Tabelle für Bestellungen
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Kunde (Foreign Key)
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- PayPal-Daten
  paypal_order_id TEXT NOT NULL UNIQUE,
  paypal_payer_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'COMPLETED',
  payment_method TEXT NOT NULL, -- 'paypal' oder 'card'
  
  -- Bestelldetails
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  item_count INTEGER NOT NULL,
  
  -- Metadaten
  order_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Status
  fulfillment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'shipped', 'completed', 'cancelled'
  
  -- Zusätzliche Notizen (optional)
  notes TEXT
);

-- Index auf PayPal Order ID für schnelle Suchen
CREATE INDEX IF NOT EXISTS idx_orders_paypal_order_id ON orders(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Tabelle für Poster (einzelne Items in einer Bestellung)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Bestellung (Foreign Key)
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Poster-Details
  size TEXT NOT NULL, -- z.B. '21x29.7', '50x70'
  price DECIMAL(10,2) NOT NULL,
  orientation TEXT NOT NULL DEFAULT 'portrait', -- 'portrait' oder 'landscape'
  
  -- Bild-URL in Supabase Storage
  image_url TEXT NOT NULL,
  
  -- Pixelisierungs-Einstellungen (für Reproduzierbarkeit)
  pixel_resolution INTEGER,
  palette_size INTEGER,
  dithering TEXT,
  brightness INTEGER
);

-- Index auf Order ID
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- RLS aktivieren (Sicherheit!)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policy: Jeder kann Kunden anlegen (für Checkout)
CREATE POLICY "Anyone can insert customers" 
  ON customers FOR INSERT 
  WITH CHECK (true);

-- Policy: Jeder kann Bestellungen anlegen (für Checkout)
CREATE POLICY "Anyone can insert orders" 
  ON orders FOR INSERT 
  WITH CHECK (true);

-- Policy: Jeder kann Order Items anlegen (für Checkout)
CREATE POLICY "Anyone can insert order_items" 
  ON order_items FOR INSERT 
  WITH CHECK (true);

-- Policy: Nur Service Role kann alles lesen (für Admin-Dashboard später)
-- (Hinweis: Du kannst später eine Admin-Policy mit authenticated users hinzufügen)

-- ============================================
-- VIEWS (Optional - für einfache Abfragen)
-- ============================================

-- View: Vollständige Bestellungen mit Kundendaten
CREATE OR REPLACE VIEW orders_with_customer AS
SELECT 
  o.id as order_id,
  o.created_at,
  o.paypal_order_id,
  o.payment_status,
  o.payment_method,
  o.total_amount,
  o.currency,
  o.item_count,
  o.fulfillment_status,
  c.vorname,
  c.nachname,
  c.email,
  c.telefon,
  c.strasse,
  c.hausnummer,
  c.plz,
  c.ort,
  c.land
FROM orders o
INNER JOIN customers c ON o.customer_id = c.id;

-- View: Bestellungen mit allen Items
CREATE OR REPLACE VIEW order_details AS
SELECT 
  o.id as order_id,
  o.created_at as order_date,
  o.paypal_order_id,
  o.total_amount,
  o.fulfillment_status,
  c.vorname || ' ' || c.nachname as customer_name,
  c.email as customer_email,
  c.strasse || ' ' || c.hausnummer || ', ' || c.plz || ' ' || c.ort as customer_address,
  oi.id as item_id,
  oi.size,
  oi.price,
  oi.orientation,
  oi.image_url,
  oi.pixel_resolution,
  oi.palette_size,
  oi.dithering
FROM orders o
INNER JOIN customers c ON o.customer_id = c.id
INNER JOIN order_items oi ON o.order_id = oi.order_id
ORDER BY o.created_at DESC;

-- ============================================
-- FERTIG! 🎉
-- ============================================

-- Teste die Tabellen mit:
SELECT * FROM customers LIMIT 1;
SELECT * FROM orders LIMIT 1;
SELECT * FROM order_items LIMIT 1;
```

**Wichtig:** Nach dem Ausführen solltest du **keine Fehlermeldungen** sehen. Falls doch, kopiere den Fehler und sag mir Bescheid!

---

## 🗂️ Schritt 4: Storage Bucket erstellen

Jetzt erstellen wir einen Bucket für die Poster-Bilder:

1. Gehe zu **Storage** (links in der Sidebar)
2. Klicke auf **Create a new bucket**
3. **Name:** `poster-images`
4. **Public bucket:** ✅ **AKTIVIERT** (damit Bilder öffentlich abrufbar sind)
5. Klicke auf **Create bucket**

### Storage Policy setzen (WICHTIG!)

Damit deine App Bilder hochladen kann:

1. Klicke auf den `poster-images` Bucket
2. Gehe zu **Policies**
3. Klicke auf **New Policy**
4. Wähle **Custom policy**
5. **Policy name:** `Allow public upload`
6. **Allowed operation:** INSERT
7. **Policy definition:**

```sql
-- Erlaube jedem das Hochladen von Bildern
CREATE POLICY "Allow public upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'poster-images');
```

8. Klicke auf **Review** → **Save policy**

9. Erstelle eine zweite Policy für **SELECT** (damit Bilder gelesen werden können):

**Policy name:** `Allow public read`
**Allowed operation:** SELECT

```sql
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'poster-images');
```

---

## 🔐 Schritt 5: Umgebungsvariablen in Vercel setzen

Jetzt verbindest du Supabase mit deinem Vercel-Projekt:

1. Gehe zu [vercel.com](https://vercel.com) → Dein Projekt
2. **Settings** → **Environment Variables**
3. Füge folgende Variablen hinzu:

| Variable Name | Wert | Von wo? |
|--------------|------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJh...` | Supabase → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJh...` | Supabase → Settings → API → service_role (unter "Show") |

4. Klicke auf **Save**

**Wichtig:** Der `SUPABASE_SERVICE_ROLE_KEY` ist sehr mächtig! Er sollte **NIE** im Frontend-Code verwendet werden. Wir nutzen ihn später nur in Serverless Functions (falls nötig).

---

## ✅ Schritt 6: Überprüfung

### Teste ob alles funktioniert:

1. Gehe zu Supabase → **Table Editor**
2. Du solltest jetzt sehen:
   - `customers`
   - `orders`
   - `order_items`

3. Gehe zu **Storage**
4. Du solltest den Bucket `poster-images` sehen

### Wenn du alles siehst: **PERFEKT!** 🎉

---

## 📝 Nächste Schritte

Jetzt wo Supabase eingerichtet ist, integriere ich den JavaScript-Code:

1. ✅ Supabase Client einrichten (`supabase-client.js`)
2. ✅ Code zum Speichern von Bestellungen nach erfolgreicher PayPal-Zahlung
3. ✅ Code zum Hochladen von Poster-Bildern in Storage
4. ✅ Testen!

**Bereit für die Code-Integration? Sag Bescheid wenn Supabase fertig eingerichtet ist!** 🚀

---

## 🆘 Probleme?

Falls etwas nicht klappt:
- Überprüfe ob alle SQL-Befehle erfolgreich ausgeführt wurden
- Stelle sicher dass der Storage Bucket `poster-images` existiert
- Überprüfe ob die Policies gesetzt sind (Storage → poster-images → Policies)
- Kontaktiere mich mit dem Fehler!

