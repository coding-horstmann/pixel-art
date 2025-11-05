-- ============================================
-- SICHERE RLS POLICIES FÜR PIXEL-POSTER
-- ============================================
-- 
-- Diese Policies ersetzen die vorherigen offenen Policies
-- und schützen vor ungeschütztem Zugriff auf Bestellungen/Kundendaten
--
-- AUSFÜHRUNG:
-- 1. Gehe zu Supabase → SQL Editor
-- 2. Kopiere diesen gesamten Code
-- 3. Führe ihn aus (Run oder Ctrl+Enter)
-- ============================================

-- ============================================
-- 1. ALTE POLICIES ENTFERNEN
-- ============================================

-- Entferne alte Policies (falls vorhanden)
DROP POLICY IF EXISTS "Anyone can insert customers" ON customers;
DROP POLICY IF EXISTS "Anyone can insert orders" ON orders;
DROP POLICY IF EXISTS "Anyone can insert order_items" ON order_items;

-- ============================================
-- 2. RLS AKTIVIEREN (falls noch nicht aktiv)
-- ============================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. NEUE SICHERE POLICIES FÜR TABELLEN
-- ============================================

-- CUSTOMERS TABLE
-- INSERT: Erlauben (für Checkout - jeder kann neue Kunden anlegen)
CREATE POLICY "Allow insert customers for checkout"
  ON customers FOR INSERT
  WITH CHECK (true);

-- SELECT: Standard blockieren (nur Service Role kann lesen)
-- Keine Policy = Standard blockiert
-- Service Role (mit service_role key) kann immer alles lesen

-- UPDATE: Blockieren (keine Policy = blockiert)
-- DELETE: Blockieren (keine Policy = blockiert)

-- ORDERS TABLE
-- INSERT: Erlauben (für Checkout - jeder kann neue Bestellungen anlegen)
CREATE POLICY "Allow insert orders for checkout"
  ON orders FOR INSERT
  WITH CHECK (true);

-- SELECT: Standard blockieren (nur Service Role kann lesen)
-- UPDATE: Blockieren
-- DELETE: Blockieren

-- ORDER_ITEMS TABLE
-- INSERT: Erlauben (für Checkout - nur mit gültiger order_id)
-- Prüft dass die order_id tatsächlich existiert
CREATE POLICY "Allow insert order_items for checkout"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id
    )
  );

-- SELECT: Standard blockieren (nur Service Role kann lesen)
-- UPDATE: Blockieren
-- DELETE: Blockieren

-- ============================================
-- 4. STORAGE POLICIES (poster-images Bucket)
-- ============================================

-- Entferne alte Storage Policies (falls vorhanden)
DROP POLICY IF EXISTS "Allow public upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;

-- INSERT: Erlauben (für Checkout - Bilder müssen hochgeladen werden können)
-- Einschränkung: Nur in poster-images Bucket
CREATE POLICY "Allow upload to poster-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'poster-images');

-- SELECT: Erlauben (öffentliche Bilder müssen lesbar sein)
-- Einschränkung: Nur poster-images Bucket
CREATE POLICY "Allow public read poster-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'poster-images');

-- UPDATE: Blockieren (keine Policy = blockiert)
-- DELETE: Blockieren (nur Service Role kann löschen)

-- ============================================
-- 5. ZUSÄTZLICHE SICHERHEIT: VIEWS SCHÜTZEN
-- ============================================

-- Views haben automatisch RLS basierend auf den zugrundeliegenden Tabellen
-- Da die Tabellen blockiert sind, sind auch die Views blockiert
-- Service Role kann weiterhin alles lesen

-- ============================================
-- FERTIG! ✅
-- ============================================

-- TESTE DIE POLICIES:
-- 
-- 1. Test INSERT (sollte funktionieren):
--    INSERT INTO customers (vorname, nachname, email, strasse, hausnummer, plz, ort) 
--    VALUES ('Test', 'Kunde', 'test@example.com', 'Teststraße', '1', '12345', 'Teststadt');
--
-- 2. Test SELECT mit ANON_KEY (sollte FEHLER geben):
--    SELECT * FROM customers LIMIT 1;
--    Erwartet: "new row violates row-level security policy"
--
-- 3. Test SELECT mit SERVICE_ROLE_KEY (sollte funktionieren):
--    (Nur in serverseitigem Code möglich)

-- ============================================
-- HINWEISE FÜR ADMIN-DASHBOARD
-- ============================================
--
-- Für ein Admin-Dashboard später:
-- 1. Erstelle serverseitige API-Endpoints (Vercel Serverless Functions)
-- 2. Verwende SERVICE_ROLE_KEY in den Serverless Functions
-- 3. Implementiere Authentifizierung (z.B. mit Supabase Auth oder API Keys)
-- 4. Verwende diese Endpoints statt direkter Client-Zugriffe
--
-- Beispiel-Struktur:
--   /api/admin/orders (GET) - Liste aller Bestellungen
--   /api/admin/orders/[id] (GET) - Einzelne Bestellung
--   /api/admin/orders/[id] (PATCH) - Status aktualisieren
--
-- Diese Endpoints verwenden SERVICE_ROLE_KEY und können alles lesen/schreiben

