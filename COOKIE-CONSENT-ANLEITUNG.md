# 🍪 Cookie-Consent-Banner Anleitung

## Übersicht

Die Pixel-Poster Website verfügt über ein DSGVO-konformes Cookie-Consent-Banner mit granularer Kontrolle über verschiedene Cookie-Kategorien.

## Features

✅ **DSGVO-konform** - Erfüllt alle rechtlichen Anforderungen  
✅ **Granulare Kontrolle** - 3 Cookie-Kategorien (Notwendig, Analyse, Marketing)  
✅ **Persistente Speicherung** - Einstellungen werden in localStorage gespeichert  
✅ **Footer-Link** - "Cookie-Einstellungen" zum späteren Ändern  
✅ **Versionierung** - Automatische Re-Consent bei Updates  
✅ **Lazy Loading** - Tracking-Skripte werden nur bei Zustimmung geladen  
✅ **Responsive Design** - Funktioniert auf allen Geräten  
✅ **Pixel-Art-Stil** - Passt perfekt zum Design der Website

## Cookie-Kategorien

### 1. Notwendige Cookies (Immer aktiv)
Diese Cookies können nicht deaktiviert werden:
- **Supabase Session** - Speichert Sitzungsdaten
- **reCAPTCHA** - Schutz vor Spam und Bot-Angriffen
- **PayPal Integration** - Ermöglicht sichere Zahlungen
- **Brevo (Sendinblue)** - E-Mail-Versand für Bestellbestätigungen

### 2. Analyse-Cookies (Optional)
Helfen zu verstehen, wie Besucher mit der Website interagieren:
- **Google Analytics** - Website-Analyse und Besucherstatistiken
- **Google Search Console** - SEO und Suchleistung

### 3. Marketing-Cookies (Optional)
Für personalisierte Werbung und Marketing-Kampagnen:
- **Google Ads** - Werbeanzeigen und Conversion-Tracking
- **Facebook Ads** - Facebook/Instagram Werbung
- **Pinterest Ads** - Pinterest Werbeanzeigen

## Konfiguration der Tracking-IDs

### Schritt 1: Umgebungsvariablen setzen

In **Vercel Dashboard**:

1. Gehe zu deinem Projekt → **Settings** → **Environment Variables**
2. Füge folgende Variablen hinzu (nur die, die du benötigst):

| Variable | Beispiel | Beschreibung |
|----------|----------|--------------|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` | Google Analytics 4 Measurement ID |
| `NEXT_PUBLIC_GOOGLE_ADS_ID` | `AW-XXXXXXXXX` | Google Ads Conversion ID |
| `NEXT_PUBLIC_FB_PIXEL_ID` | `123456789012345` | Facebook Pixel ID (15 Ziffern) |
| `NEXT_PUBLIC_PINTEREST_TAG_ID` | `1234567890123` | Pinterest Tag ID (13 Ziffern) |

**Wichtig:** Alle Analytics/Marketing-Variablen sind **optional**. Wenn eine ID nicht gesetzt ist, wird das entsprechende Tracking einfach nicht geladen.

### Schritt 2: Tracking-IDs erhalten

#### Google Analytics 4
1. Gehe zu [Google Analytics](https://analytics.google.com)
2. Erstelle eine neue Property (GA4)
3. Gehe zu **Admin** → **Data Streams** → Wähle deinen Stream
4. Kopiere die **Measurement ID** (Format: `G-XXXXXXXXXX`)

#### Google Ads
1. Gehe zu [Google Ads](https://ads.google.com)
2. Klicke auf **Tools** → **Conversions**
3. Erstelle eine neue Conversion-Aktion
4. Kopiere die **Conversion ID** (Format: `AW-XXXXXXXXX`)

#### Facebook Pixel
1. Gehe zum [Facebook Events Manager](https://business.facebook.com/events_manager)
2. Erstelle ein neues Pixel oder wähle ein bestehendes
3. Kopiere die **Pixel ID** (15-stellige Nummer)

#### Pinterest Tag
1. Gehe zu [Pinterest Ads Manager](https://ads.pinterest.com)
2. Navigiere zu **Conversions** → **Install Tag**
3. Kopiere die **Tag ID** (13-stellige Nummer)

### Schritt 3: Deployment

Nach dem Setzen der Umgebungsvariablen:

1. **Re-Deploy** dein Vercel-Projekt (oder pushe ein Update zu GitHub)
2. Das Build-Script (`build.js`) wird automatisch die IDs in `config.js` einsetzen
3. Das Cookie-Consent-System lädt die Tracking-Skripte nur bei Zustimmung

## Wie es funktioniert

### Beim ersten Besuch

1. **Banner erscheint** nach 1 Sekunde automatisch am unteren Bildschirmrand
2. Nutzer hat 3 Optionen:
   - **Alle akzeptieren** - Alle Cookies werden aktiviert
   - **Nur Notwendige** - Nur erforderliche Cookies aktiv
   - **Einstellungen** - Öffnet Modal für granulare Auswahl

### In den Einstellungen

- Nutzer sieht alle 4 Kategorien mit Beschreibungen
- Jede optionale Kategorie hat einen **Toggle-Switch**
- Liste aller Cookies in jeder Kategorie mit Status (Aktiv/Inaktiv)
- **Erforderliche** Kategorie kann nicht deaktiviert werden
- Buttons:
  - **Nur Notwendige** - Deaktiviert alle optionalen Cookies
  - **Auswahl speichern** - Speichert individuelle Auswahl
  - **Alle akzeptieren** - Aktiviert alle Cookies

### Später ändern

- Im **Footer** gibt es einen Link "Cookie-Einstellungen"
- Klick öffnet das Modal erneut
- Nutzer kann Einstellungen jederzeit anpassen

### Technische Details

- **Storage:** `localStorage` unter Schlüssel `pixelPosterCookieConsent`
- **Versionierung:** Consent-Version `1.0` (bei Updates wird erneute Zustimmung angefordert)
- **Lazy Loading:** Tracking-Skripte werden nur geladen, wenn:
  1. Consent vorhanden ist
  2. Entsprechende Kategorie aktiv ist
  3. Tracking-ID in `window.CONFIG` vorhanden ist

## Datenschutz-Hinweis ergänzen

Füge in `datenschutz.html` folgenden Abschnitt hinzu:

```html
<h2>5. Cookies und Tracking</h2>
<p>
    Unsere Website verwendet Cookies, um die Funktionalität zu gewährleisten und (mit Ihrer Zustimmung) 
    um das Nutzererlebnis zu verbessern und anonymisierte Statistiken zu erheben.
</p>

<h3>5.1 Notwendige Cookies</h3>
<p>
    Diese Cookies sind für den Betrieb der Website erforderlich und können nicht deaktiviert werden:
</p>
<ul>
    <li><strong>Supabase Session:</strong> Speichert Ihre Sitzungsdaten (Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO)</li>
    <li><strong>reCAPTCHA:</strong> Schutz vor Spam (Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO)</li>
    <li><strong>PayPal Integration:</strong> Sichere Zahlungsabwicklung (Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO)</li>
    <li><strong>Brevo (Sendinblue):</strong> E-Mail-Versand für Bestellbestätigungen (Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO)</li>
</ul>

<h3>5.2 Analyse-Cookies</h3>
<p>
    Mit Ihrer Einwilligung verwenden wir Google Analytics zur Analyse des Nutzerverhaltens 
    (Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO). IP-Adressen werden anonymisiert.
</p>

<h3>5.3 Marketing-Cookies</h3>
<p>
    Mit Ihrer Einwilligung nutzen wir Cookies von Google Ads, Facebook und Pinterest für 
    personalisierte Werbung (Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO).
</p>

<h3>5.4 Ihre Rechte</h3>
<p>
    Sie können Ihre Cookie-Einstellungen jederzeit über den Link "Cookie-Einstellungen" 
    im Footer anpassen oder widerrufen.
</p>
```

## Lokale Entwicklung

Für lokale Tests kannst du die IDs direkt in `config.js` eintragen:

```javascript
window.CONFIG = {
  // ... andere Konfiguration ...
  
  // Test-IDs (werden beim Build überschrieben)
  GA_MEASUREMENT_ID: 'G-XXXXXXXXXX',
  GOOGLE_ADS_ID: 'AW-XXXXXXXXX',
  FB_PIXEL_ID: '123456789012345',
  PINTEREST_TAG_ID: '1234567890123',
};
```

**Wichtig:** Diese Änderungen werden beim nächsten `npm run build` überschrieben!

## Fehlerbehandlung

Das Cookie-Consent-System ist robust gegen fehlende Konfiguration:

- ✅ Wenn eine Tracking-ID fehlt, wird das entsprechende Skript einfach nicht geladen
- ✅ Keine Fehlermeldungen im Browser
- ✅ Nur Console-Logs zur Information: `"Google Analytics ID nicht konfiguriert"`

## Anpassungen

### Weitere Tracking-Dienste hinzufügen

1. **In `cookie-consent.js`:**
   - Füge Cookie zur entsprechenden Kategorie in `COOKIE_CONFIG` hinzu
   - Erstelle Lade-Funktion (z.B. `loadMyService()`)
   - Rufe Funktion in `loadScripts()` auf

2. **In `config.js` und `build.js`:**
   - Füge neue ID-Variable hinzu
   - Erweitere Build-Script um neue Umgebungsvariable

3. **In `env.template`:**
   - Dokumentiere neue Umgebungsvariable

### Consent-Version aktualisieren

Wenn du das Cookie-Banner änderst und erneute Zustimmung benötigst:

```javascript
// In cookie-consent.js, Zeile 42
const CONSENT_VERSION = '1.1'; // Von 1.0 auf 1.1
```

Beim nächsten Besuch müssen alle Nutzer erneut zustimmen.

## Testing

### Lokales Testen

1. Öffne Website im Browser
2. Öffne **DevTools** → **Application** → **Local Storage**
3. Prüfe Eintrag `pixelPosterCookieConsent`
4. Lösche Eintrag, um Banner erneut zu sehen

### Verschiedene Szenarien testen

- **Alle akzeptieren:** Prüfe in Network-Tab, ob Tracking-Skripte geladen werden
- **Nur Notwendige:** Prüfe, dass keine Tracking-Skripte geladen werden
- **Individuelle Auswahl:** Aktiviere nur Analytics, prüfe dass nur GA lädt

## Support

Bei Fragen oder Problemen:
- Prüfe Browser-Konsole auf Fehlermeldungen
- Stelle sicher, dass Tracking-IDs korrekt formatiert sind
- Verifiziere, dass Umgebungsvariablen in Vercel gesetzt sind

---

**Stand:** Januar 2025  
**Version:** 1.0

