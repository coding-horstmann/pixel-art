# 📧 Brevo E-Mail Setup für Pixel-Poster

Diese Anleitung erklärt, wie du Brevo (ehemals Sendinblue) für automatische Bestellbestätigungs-E-Mails einrichtest.

---

## 📋 Was wird verschickt?

Nach jeder erfolgreichen Bestellung werden **2 E-Mails** automatisch versendet:

### 1. **Bestellbestätigung an den Kunden** 📨
- Enthält alle Bestelldetails (Bestellnummer, Artikel, Preis)
- Lieferadresse
- Nächste Schritte
- **Anhang:** Alle bestellten Pixel-Art Poster als PNG-Dateien

### 2. **Bestellbenachrichtigung an dich (Shop-Betreiber)** 🔔
- Alle Bestelldetails für die Produktion
- Kundendaten (Name, Adresse, E-Mail)
- PayPal-Transaktions-ID
- **Anhang:** Alle Poster-Bilder zum Drucken

---

## 🚀 Schritt 1: Brevo Account erstellen

1. Gehe zu [brevo.com](https://www.brevo.com)
2. Klicke auf **"Sign up for free"**
3. Wähle den **kostenlosen Plan** (300 E-Mails/Tag sind kostenlos!)
4. Verifiziere deine E-Mail-Adresse

> 💡 **Tipp:** Der kostenlose Plan reicht für bis zu 300 Bestellungen pro Tag!

---

## 🔑 Schritt 2: API-Key erstellen

1. **Logge dich ein** bei [app.brevo.com](https://app.brevo.com)
2. Klicke oben rechts auf deinen **Account-Namen**
3. Wähle **"SMTP & API"** im Menü
4. Gehe zum Tab **"API Keys"**
5. Klicke auf **"Generate a new API key"**
6. Gib einen Namen ein (z.B. "Pixel-Poster Production")
7. **Kopiere den API Key** (du kannst ihn später nicht mehr sehen!)

```
Beispiel API-Key:
xkeysib-abc123def456...
```

---

## ⚙️ Schritt 3: Sender-E-Mail verifizieren

Brevo muss wissen, von welcher E-Mail-Adresse die Bestellbestätigungen verschickt werden sollen.

### Option A: Einzelne E-Mail verifizieren (Schnell, empfohlen für Start)

1. Gehe zu **"Senders & IP"** → **"Senders"**
2. Klicke auf **"Add a sender"**
3. Trage deine E-Mail-Adresse ein (z.B. `shop@pixel-poster.de`)
4. Trage deinen Shop-Namen ein (z.B. "Pixel-Poster")
5. Klicke auf **"Create"**
6. **Bestätige die Verifizierungs-E-Mail**, die Brevo dir schickt

### Option B: Domain verifizieren (Professioneller, für Production empfohlen)

1. Gehe zu **"Senders & IP"** → **"Domains"**
2. Klicke auf **"Add a domain"**
3. Trage deine Domain ein (z.B. `pixel-poster.de`)
4. Füge die **DNS-Einträge** hinzu, die Brevo dir anzeigt:
   - SPF-Eintrag (TXT-Record)
   - DKIM-Eintrag (TXT-Record)
   - DMARC-Eintrag (optional)
5. Warte bis die Verifizierung abgeschlossen ist (kann bis zu 48h dauern)

> 💡 **Hinweis:** Ohne Domain-Verifizierung landen E-Mails eventuell im Spam-Ordner!

---

## 🔧 Schritt 4: Umgebungsvariablen in Vercel setzen

Jetzt musst du die Brevo-Konfiguration in Vercel als Umgebungsvariablen hinzufügen.

### 4.1 Gehe zu deinem Vercel-Projekt

1. Öffne [vercel.com](https://vercel.com)
2. Wähle dein **Pixel-Poster Projekt**
3. Gehe zu **Settings** → **Environment Variables**

### 4.2 Füge folgende Variablen hinzu

| Variable | Wert | Beschreibung |
|----------|------|--------------|
| `BREVO_API_KEY` | `xkeysib-abc123...` | Dein Brevo API Key |
| `SHOP_EMAIL` | `deine-email@domain.de` | E-Mail für Shop-Benachrichtigungen |
| `SHOP_NAME` | `Pixel-Poster` | Name deines Shops |

### 4.3 Environment auswählen

Wichtig: Wähle **alle 3 Environments**:
- ✅ Production
- ✅ Preview
- ✅ Development

### 4.4 Speichern & Neu deployen

1. Klicke auf **"Save"**
2. Gehe zu **Deployments**
3. Klicke bei deinem letzten Deployment auf **⋯** (Menü)
4. Wähle **"Redeploy"**
5. Warte bis Deployment abgeschlossen ist

---

## ✅ Schritt 5: Testen

### 5.1 Test-Bestellung durchführen

1. Öffne deine Live-Website
2. Erstelle ein Test-Poster
3. Füge es zum Warenkorb hinzu
4. Gehe zum Checkout
5. **Wichtig:** Nutze die **PayPal Sandbox** für Tests!
6. Schließe die Zahlung ab

### 5.2 E-Mails prüfen

Nach erfolgreicher Zahlung solltest du:

✅ **Als Kunde** eine Bestellbestätigung erhalten (mit Poster-Anhängen)  
✅ **Als Shop-Betreiber** eine Benachrichtigung erhalten (mit Poster-Anhängen)

### 5.3 Fehlersuche

**E-Mails kommen nicht an?**

1. **Prüfe Vercel Logs:**
   - Gehe zu **Deployments** → wähle dein Deployment
   - Klicke auf **Functions** → `api/send-order-confirmation`
   - Schaue dir die Logs an

2. **Prüfe Brevo Logs:**
   - Gehe zu [app.brevo.com](https://app.brevo.com)
   - Wähle **"Email"** → **"Logs"**
   - Siehst du die verschickten E-Mails?

3. **Häufige Probleme:**
   - ❌ API-Key falsch → Prüfe ob korrekt kopiert
   - ❌ Sender nicht verifiziert → Verifiziere E-Mail/Domain
   - ❌ E-Mails im Spam → Domain-Verifizierung hilft
   - ❌ Anhänge zu groß → Brevo Limit ist 10MB pro E-Mail

---

## 📊 Brevo Dashboard verstehen

### E-Mail-Statistiken

In deinem Brevo Dashboard siehst du:
- 📈 **Versendete E-Mails** (pro Tag/Monat)
- 📬 **Zustellrate** (sollte > 95% sein)
- 📭 **Bounces** (nicht zustellbar)
- 🚫 **Spam-Beschwerden**

### Limits des kostenlosen Plans

| Limit | Wert |
|-------|------|
| E-Mails pro Tag | 300 |
| E-Mails pro Monat | 9.000 |
| Anhänge | Ja (max 10MB) |
| API-Zugriff | Ja |

> 💡 Bei mehr als 300 Bestellungen/Tag musst du auf einen kostenpflichtigen Plan upgraden.

---

## 🎨 E-Mail-Templates anpassen

Die E-Mail-Templates sind direkt im Code (`/api/send-order-confirmation.js`) definiert.

### Kunden-E-Mail anpassen

Suche nach der Funktion `generateCustomerEmailHTML` und passe das HTML an:

```javascript
// Beispiel: Farben ändern
style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"
// Ersetze Hex-Farbcodes mit deinen Markenfarben
```

### Shop-E-Mail anpassen

Suche nach der Funktion `generateShopEmailHTML` und passe an.

**Nach Änderungen:**
1. Committe die Änderungen zu Git
2. Pushe zu GitHub
3. Vercel deployt automatisch

---

## 🔒 Sicherheit

### Wichtige Hinweise:

✅ **API-Key niemals im Code** → Nur in Umgebungsvariablen!  
✅ **Verwende HTTPS** → Vercel macht das automatisch  
✅ **Prüfe API-Limits** → Brevo blockiert bei Überschreitung  
✅ **Logs regelmäßig prüfen** → Fehler frühzeitig erkennen  

### API-Key rotieren (alle 6 Monate empfohlen)

1. Erstelle einen neuen API-Key in Brevo
2. Aktualisiere die Umgebungsvariable in Vercel
3. Deploye neu
4. Lösche den alten API-Key in Brevo

---

## 💰 Kosten-Übersicht

### Kostenloser Plan
- ✅ 300 E-Mails/Tag
- ✅ Unbegrenzte Kontakte
- ✅ API-Zugriff
- ✅ E-Mail-Support

### Starter Plan (ab €25/Monat)
- ✅ 20.000 E-Mails/Monat
- ✅ Keine täglichen Limits
- ✅ Erweiterte Statistiken
- ✅ Prioritäts-Support

> 💡 **Empfehlung:** Starte kostenlos, upgraden kannst du jederzeit!

---

## 🆘 Support & Hilfe

### Brevo Support
- 📧 E-Mail: support@brevo.com
- 💬 Live-Chat: [app.brevo.com](https://app.brevo.com) (unten rechts)
- 📖 Dokumentation: [developers.brevo.com](https://developers.brevo.com)

### Pixel-Poster Projekt
- 🐛 GitHub Issues: [github.com/coding-horstmann/pixel-art/issues](https://github.com/coding-horstmann/pixel-art/issues)
- 📖 README: [README.md](./README.md)

---

## ✅ Checkliste

Bevor du live gehst:

- [ ] Brevo Account erstellt
- [ ] API-Key generiert und in Vercel gesetzt
- [ ] Sender-E-Mail verifiziert (oder Domain)
- [ ] SHOP_EMAIL und SHOP_NAME in Vercel gesetzt
- [ ] Test-Bestellung durchgeführt
- [ ] Beide E-Mails (Kunde + Shop) erhalten
- [ ] E-Mail-Anhänge (Poster-Bilder) korrekt
- [ ] PayPal auf Live-Modus umgestellt
- [ ] Domain-Verifizierung abgeschlossen (empfohlen)

---

**Herzlichen Glückwunsch! 🎉**  
Dein automatischer E-Mail-Versand ist jetzt einsatzbereit!

