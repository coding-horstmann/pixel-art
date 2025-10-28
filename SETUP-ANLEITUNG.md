# 🚀 Setup-Anleitung: Supabase-Integration für Pixel-Poster

## ✅ Was wurde gemacht?

Ich habe die **Supabase-Integration** für dein Pixel-Poster-Projekt fertig implementiert! 🎉

### Neue Dateien:

1. **`supabase-client.js`** - Supabase Client mit allen Funktionen:
   - Bestellungen speichern
   - Bilder in Storage hochladen
   - Kundendaten speichern

2. **`supabase-setup.md`** - Schritt-für-Schritt-Anleitung:
   - SQL-Befehle für Datenbank-Tabellen
   - Storage Bucket Setup
   - Umgebungsvariablen konfigurieren

3. **`SETUP-ANLEITUNG.md`** - Diese Datei (Zusammenfassung)

### Geänderte Dateien:

- **`paypal.js`** - Nach erfolgreicher Zahlung wird jetzt automatisch `saveOrder()` aufgerufen
- **`index.html`** - Lädt jetzt `supabase-client.js`
- **`README.md`** - Dokumentation aktualisiert

---

## 📋 Was du JETZT machen musst:

### Schritt 1: Supabase einrichten (ca. 10-15 Min.)

Folge der Anleitung in **`supabase-setup.md`**:

1. ✅ Supabase-Projekt erstellen
2. ✅ API-Keys kopieren
3. ✅ SQL-Befehle ausführen (Tabellen erstellen)
4. ✅ Storage Bucket `poster-images` erstellen
5. ✅ Storage Policies setzen

**Wichtig:** Mach dir Notizen von den 3 Keys:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

### Schritt 2: Vercel Umgebungsvariablen setzen

Gehe zu [vercel.com](https://vercel.com) → Dein Projekt → **Settings** → **Environment Variables**

Füge hinzu:

| Variable | Wert |
|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dein Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Dein Service Role Key |

*Die PayPal-Variable sollte bereits gesetzt sein.*

---

### Schritt 3: Deployment

#### Option A: Automatisches Deployment (empfohlen)

1. Committe und pushe die Änderungen zu GitHub:

```bash
git add .
git commit -m "✨ Supabase-Integration hinzugefügt"
git push
```

2. Vercel deployed automatisch!
3. Warte ca. 1-2 Minuten
4. Öffne deine Live-URL

#### Option B: Manuelles Deployment über Vercel

1. Gehe zu [vercel.com](https://vercel.com) → Dein Projekt
2. Klicke auf **Deployments** → **Redeploy**

---

### Schritt 4: Testen

1. Öffne deine Live-Website
2. Erstelle ein Pixel-Art-Poster
3. Füge es zum Warenkorb hinzu
4. Gehe zu Checkout
5. Fülle das Formular aus
6. **Wichtig:** Nutze PayPal **Sandbox** zum Testen! (nicht echtes Geld)
7. Schließe die Zahlung ab

#### Was passiert jetzt?

- ✅ Zahlung wird via PayPal abgewickelt
- ✅ Kundendaten werden in Supabase gespeichert
- ✅ Bestellung wird in Supabase gespeichert
- ✅ Poster-Bilder werden in Storage hochgeladen

#### Überprüfung in Supabase:

1. Gehe zu [app.supabase.com](https://app.supabase.com) → Dein Projekt
2. **Table Editor:**
   - Schau in `customers` → Du siehst den Kunden
   - Schau in `orders` → Du siehst die Bestellung
   - Schau in `order_items` → Du siehst die Poster
3. **Storage:**
   - Öffne `poster-images` Bucket
   - Du siehst die hochgeladenen Bilder unter `orders/{order-id}/`

---

## 🐛 Troubleshooting

### Problem: "Supabase nicht konfiguriert"

**Lösung:**
- Überprüfe ob Umgebungsvariablen in Vercel gesetzt sind
- Triggere ein neues Deployment (damit die Variablen übernommen werden)

### Problem: "Fehler beim Speichern in Supabase"

**Lösung:**
- Öffne Browser Console (F12)
- Schau nach Fehlermeldungen
- Häufigste Ursachen:
  - SQL-Tabellen nicht erstellt
  - Storage Bucket nicht erstellt oder falsche Policies
  - Falsche API-Keys

### Problem: "Bilder können nicht hochgeladen werden"

**Lösung:**
- Überprüfe ob `poster-images` Bucket existiert
- Überprüfe ob Bucket **public** ist
- Überprüfe ob Storage Policies gesetzt sind (siehe `supabase-setup.md`)

### Problem: Zahlung funktioniert, aber Daten werden nicht gespeichert

**Das ist OK!** Die App ist robust:
- Zahlung geht immer durch (wichtig!)
- Supabase ist optional
- Fehlermeldung wird in Console geloggt
- Du kannst Bestellungen manuell via PayPal-Dashboard nachschauen

---

## 📊 Datenbank-Übersicht

Nach einer Testbestellung solltest du in Supabase sehen:

### Tabelle: `customers`
```
id | created_at | vorname | nachname | email | telefon | strasse | hausnummer | plz | ort | land
```

### Tabelle: `orders`
```
id | created_at | customer_id | paypal_order_id | payment_status | total_amount | ...
```

### Tabelle: `order_items`
```
id | created_at | order_id | size | price | orientation | image_url | ...
```

### Storage: `poster-images`
```
orders/
  └── {order-id}/
      ├── {order-id}_item-0_1234567890.png
      └── {order-id}_item-1_1234567891.png
```

---

## 🎯 Nächste Schritte (Phase 3 - E-Mail)

Wenn alles funktioniert, können wir als nächstes **E-Mail-Versand** einrichten:

1. **Bestellbestätigung an Kunden** (mit Bestelldetails und Bildern)
2. **Benachrichtigung an dich** (Admin) über neue Bestellung

**Empfehlung:** Brevo (ehemals Sendinblue)
- Kostenlos bis 300 E-Mails/Tag
- Einfache API
- Template-Editor

Sag Bescheid wenn du bereit für Phase 3 bist!

---

## ✅ Checkliste

Hake ab wenn erledigt:

- [ ] Supabase-Projekt erstellt
- [ ] SQL-Befehle ausgeführt (3 Tabellen vorhanden)
- [ ] Storage Bucket `poster-images` erstellt (public)
- [ ] Storage Policies gesetzt
- [ ] Umgebungsvariablen in Vercel gesetzt
- [ ] Code zu GitHub gepusht
- [ ] Vercel Deployment abgeschlossen
- [ ] Test-Bestellung durchgeführt
- [ ] Daten in Supabase sichtbar
- [ ] Bilder in Storage sichtbar

---

## 🆘 Brauchst du Hilfe?

Falls etwas nicht klappt:

1. Schau in die Browser Console (F12) → Tab "Console"
2. Schau in die Supabase Logs (Supabase → Settings → Logs)
3. Sende mir die Fehlermeldung

---

**Viel Erfolg! Du schaffst das! 💪🎉**

Falls du Fragen hast oder etwas nicht funktioniert, melde dich einfach!

