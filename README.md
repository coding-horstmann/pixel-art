# 🎨 Pixel-Poster

Transform Your Photos Into Epic Pixel Art Posters!

Eine Web-Anwendung zum Erstellen von Pixel-Art-Postern aus eigenen Fotos. Nutzer können ihre Bilder hochladen, Pixelisierungseinstellungen anpassen und Poster in verschiedenen Größen bestellen.

🌐 **Live Demo:** [pixel-art-kappa-peach.vercel.app](https://pixel-art-kappa-peach.vercel.app)

---

## 📋 Features

- 🖼️ **Bild-Upload:** Drag & Drop oder Dateiauswahl (PNG/JPEG bis 50MB)
- 🎛️ **Anpassbare Einstellungen:**
  - Pixel-Auflösung (8-128px)
  - Farbpalette (4-64 Farben)
  - Dithering-Optionen (None, Floyd-Steinberg, Bayer)
  - Helligkeit
- 📐 **Druckbereich:** Interaktiver Crop-Editor mit 5:7 Poster-Format
- 🛒 **Warenkorb-System:** Mehrere Poster gleichzeitig bestellen
- 💳 **PayPal-Integration:** Sichere Zahlung via PayPal oder Kreditkarte
- 🗄️ **Supabase-Datenbank:** Automatische Speicherung von Bestellungen und Bildern
- 🔒 **Datenschutz:** Alle Bilder werden nur lokal im Browser verarbeitet
- 📱 **Responsive Design:** Funktioniert auf Desktop und Mobile

---

## 🚀 Deployment auf Vercel

### 1. Repository zu Vercel verbinden

1. Gehe zu [vercel.com](https://vercel.com) und logge dich ein
2. Klicke auf "Add New Project"
3. Importiere dein GitHub Repository: `https://github.com/coding-horstmann/pixel-art`
4. Vercel erkennt automatisch die Projekt-Konfiguration

### 2. Umgebungsvariablen konfigurieren

Bevor du deployst, musst du die folgenden Umgebungsvariablen in Vercel setzen:

#### **Für PayPal-Integration (Phase 1 - JETZT):**

1. Gehe zu deinem Vercel-Projekt → **Settings** → **Environment Variables**
2. Füge folgende Variable hinzu:

| Variable Name | Wert | Beschreibung |
|--------------|------|--------------|
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | `Deine-PayPal-Client-ID` | Client-ID aus dem PayPal Developer Dashboard |

**So erhältst du die PayPal Client-ID:**

1. Gehe zu [developer.paypal.com](https://developer.paypal.com)
2. Logge dich mit deinem PayPal Business Konto ein
3. Gehe zu **Dashboard** → **Apps & Credentials**
4. Erstelle eine neue App oder wähle eine bestehende aus
5. Kopiere die **Client-ID** (nicht den Secret!)
6. Für **Sandbox (Test):** Nutze die Sandbox Client-ID
7. Für **Production (Live):** Nutze die Live Client-ID

> ⚠️ **WICHTIG:** Verwende für Tests immer die Sandbox-Umgebung! Wechsle zur Live-Umgebung erst wenn alles funktioniert.

#### **Für Supabase-Integration (Phase 2 - SPÄTER):**

| Variable Name | Wert | Beschreibung |
|--------------|------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Deine Supabase Projekt-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `Dein-Anon-Key` | Supabase Anonymous Key |
| `SUPABASE_SERVICE_ROLE_KEY` | `Dein-Service-Role-Key` | Supabase Service Role Key (nur Server-seitig) |

### 3. Build-Einstellungen

Vercel sollte automatisch folgende Einstellungen erkennen:

- **Build Command:** `npm run build`
- **Output Directory:** `./` (root, da statische Website)
- **Install Command:** `npm install`

Falls nicht, kannst du diese manuell unter **Settings** → **Build & Development Settings** setzen.

### 4. Deploy

1. Klicke auf **Deploy**
2. Warte bis der Build abgeschlossen ist
3. Teste deine Anwendung mit der generierten URL

---

## 🏠 Lokale Entwicklung

### Voraussetzungen

- Node.js (v14 oder höher)
- Ein Code-Editor (z.B. VS Code)

### Installation

```bash
# Repository klonen
git clone https://github.com/coding-horstmann/pixel-art.git
cd pixel-art

# Dependencies installieren (nur für Build-Script)
npm install

# Build-Script ausführen (ersetzt Umgebungsvariablen)
npm run build
```

### Umgebungsvariablen für lokale Entwicklung

Erstelle eine `.env` Datei im Root-Verzeichnis:

```env
# PayPal (Sandbox für Tests)
NEXT_PUBLIC_PAYPAL_CLIENT_ID=deine-sandbox-client-id

# Supabase (optional, für Phase 2)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein-anon-key
SUPABASE_SERVICE_ROLE_KEY=dein-service-role-key
```

### Lokalen Server starten

Da es eine statische Website ist, kannst du einen beliebigen HTTP-Server verwenden:

```bash
# Option 1: Python
python -m http.server 8000

# Option 2: Node http-server
npx http-server -p 8000

# Option 3: VS Code Live Server Extension
```

Öffne dann `http://localhost:8000` im Browser.

---

## 📦 Projekt-Struktur

```
pixel-art/
├── index.html          # Haupt-HTML-Datei
├── app.js              # Haupt-App-Logik (Upload, Warenkorb, UI)
├── paypal.js           # PayPal-Integration
├── supabase-client.js  # Supabase-Integration (Bestellungen, Storage)
├── pixelate.js         # Pixelisierungs-Engine
├── config.js           # Konfiguration (Umgebungsvariablen)
├── build.js            # Build-Script (ersetzt Platzhalter)
├── styles.css          # Styles
├── package.json        # NPM-Konfiguration
├── supabase-setup.md   # Supabase Setup-Anleitung
├── env.template        # Template für Umgebungsvariablen
├── assets/             # Assets (Bilder, Icons)
│   └── payments/       # Zahlungs-Icons
├── agb.html           # AGB
├── datenschutz.html   # Datenschutzerklärung
├── widerruf.html      # Widerrufsbelehrung
└── README.md          # Diese Datei
```

---

## 🔧 Technologie-Stack

- **Frontend:** Vanilla JavaScript (ES6+)
- **Bildverarbeitung:** Canvas API, k-means Clustering
- **Zahlungsabwicklung:** PayPal JavaScript SDK
- **Datenbank:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage
- **E-Mail (geplant):** Brevo / Resend / SendGrid
- **Hosting:** Vercel

---

## 🛠️ Entwicklungs-Roadmap

### ✅ Phase 1: PayPal-Integration (ABGESCHLOSSEN)
- [x] PayPal SDK einbinden
- [x] Checkout-Flow implementieren
- [x] Warenkorb-System integrieren
- [x] Beide Zahlungsarten (PayPal + Kreditkarte) unterstützen

### ✅ Phase 2: Supabase-Integration (ABGESCHLOSSEN)
- [x] Datenbank-Schema erstellen
- [x] Bestelldaten speichern
- [x] Poster-Bilder in Supabase Storage hochladen
- [ ] Admin-Dashboard für Bestellverwaltung (optional)

### 📧 Phase 3: E-Mail-Versand (IN PLANUNG)
- [ ] Brevo/Resend API integrieren
- [ ] Bestellbestätigung an Kunden
- [ ] Bestellbenachrichtigung an Admin
- [ ] E-Mail-Templates erstellen

---

## 💡 PayPal-Integration Details

### Wie es funktioniert

1. **Kunde erstellt Poster** und fügt sie zum Warenkorb hinzu
2. **Checkout öffnen:** Kunde füllt Liefer- und Kontaktdaten aus
3. **"Jetzt kaufen" klicken:** PayPal-Buttons werden angezeigt
4. **Zahlungsmethode wählen:**
   - PayPal-Konto
   - Kreditkarte (via PayPal)
5. **Zahlung abschließen:** PayPal übernimmt die Zahlungsabwicklung
6. **Erfolg:** Bestellung wird gespeichert (Phase 2) und E-Mails versendet (Phase 3)

### Zahlungsarten

PayPal unterstützt automatisch:
- ✅ PayPal-Kontozahlung
- ✅ Kreditkarten (Visa, Mastercard, Amex)
- ✅ Debitkarten

Du musst **keine separate Kreditkarten-Integration** machen! PayPal übernimmt alles.

### Sandbox vs. Production

**Sandbox (Test-Modus):**
- Zum Testen ohne echtes Geld
- Nutze die Sandbox-Client-ID
- Erstelle Test-Konten im PayPal Developer Dashboard
- URL: `sandbox.paypal.com`

**Production (Live-Modus):**
- Für echte Zahlungen
- Nutze die Live-Client-ID
- PayPal Business Konto muss verifiziert sein
- URL: `paypal.com`

---

## 🗄️ Supabase-Integration Details

### Wie es funktioniert

Nach erfolgreicher PayPal-Zahlung werden automatisch:

1. **Kundendaten gespeichert** in der `customers` Tabelle
2. **Bestellung gespeichert** in der `orders` Tabelle (mit PayPal Order ID)
3. **Poster-Bilder hochgeladen** in Supabase Storage (`poster-images` Bucket)
4. **Order Items gespeichert** in der `order_items` Tabelle (mit Bild-URLs)

### Datenbank-Schema

**Tabelle: `customers`**
- Speichert Kundendaten (Name, E-Mail, Adresse)
- Verknüpft mit Bestellungen

**Tabelle: `orders`**
- Speichert Bestellungen mit PayPal-Daten
- Status-Tracking für Fulfillment
- Verknüpft mit Kunden und Order Items

**Tabelle: `order_items`**
- Einzelne Poster einer Bestellung
- Größe, Preis, Ausrichtung
- Link zum gespeicherten Bild in Storage

**Storage: `poster-images`**
- Öffentlicher Bucket für Poster-Bilder
- Organisiert nach Bestellungs-ID
- Format: `orders/{order-id}/item-{index}_{timestamp}.png`

### Datenbank Setup

Siehe `supabase-setup.md` für eine detaillierte Schritt-für-Schritt-Anleitung.

Kurzfassung:
1. Erstelle Supabase-Projekt
2. Führe SQL-Befehle aus `supabase-setup.md` aus
3. Erstelle `poster-images` Bucket (public)
4. Setze Umgebungsvariablen in Vercel

### Fehlerbehandlung

Die App ist robust gegen Supabase-Ausfälle:
- Zahlung funktioniert auch ohne Supabase
- Fehlermeldung wird geloggt, aber Checkout schlägt nicht fehl
- Bestellungen können manuell nachgetragen werden via PayPal-Dashboard

---

## 🔐 Sicherheit

- **Client-seitige Bildverarbeitung:** Bilder verlassen nie den Browser
- **Sichere Zahlungsabwicklung:** PayPal PCI-DSS konform
- **Umgebungsvariablen:** Sensible Daten niemals im Code
- **HTTPS:** Automatisch durch Vercel

---

## 📞 Support & Kontakt

Bei Fragen oder Problemen:

1. Erstelle ein [GitHub Issue](https://github.com/coding-horstmann/pixel-art/issues)
2. Kontaktiere den Support via E-Mail

---

## 📄 Lizenz

[Hier deine Lizenz eintragen]

---

## 🙏 Danksagungen

- PayPal für die JavaScript SDK
- Vercel für kostenloses Hosting
- Alle Open-Source-Libraries

---

**Viel Erfolg mit deinem Pixel-Poster-Projekt! 🎉**

