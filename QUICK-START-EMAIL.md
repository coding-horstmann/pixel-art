# ⚡ Quick Start: E-Mail-Versand aktivieren

Diese Anleitung zeigt dir die **schnellsten Schritte**, um den E-Mail-Versand für dein Pixel-Poster Projekt zu aktivieren.

---

## ⏱️ Zeitaufwand: ~15 Minuten

---

## 📝 Checkliste

### ✅ Schritt 1: Brevo Account (5 Min)

1. Gehe zu [brevo.com](https://www.brevo.com)
2. Klicke "Sign up for free"
3. Verifiziere deine E-Mail

**Fertig!** ✓

---

### ✅ Schritt 2: API-Key erstellen (2 Min)

1. Logge dich ein bei [app.brevo.com](https://app.brevo.com)
2. Klicke oben rechts auf deinen Namen → **SMTP & API**
3. Tab **API Keys** → **Generate a new API key**
4. Name: "Pixel-Poster Production"
5. **Kopiere den Key** (beginnt mit `xkeysib-...`)

**Fertig!** ✓

---

### ✅ Schritt 3: Sender-E-Mail verifizieren (3 Min)

1. Gehe zu **Senders & IP** → **Senders**
2. Klicke **Add a sender**
3. Trage ein:
   - **E-Mail:** `deine-email@domain.de`
   - **Name:** `Pixel-Poster`
4. Klicke **Create**
5. **Öffne dein E-Mail-Postfach** und klicke auf den Bestätigungslink

**Fertig!** ✓

---

### ✅ Schritt 4: Umgebungsvariablen in Vercel (5 Min)

1. Öffne [vercel.com](https://vercel.com)
2. Wähle dein **Pixel-Poster Projekt**
3. Gehe zu **Settings** → **Environment Variables**
4. Füge hinzu:

```
BREVO_API_KEY = xkeysib-abc123... (dein API-Key)
SHOP_EMAIL = deine-email@domain.de
SHOP_NAME = Pixel-Poster
```

5. Wähle alle 3 Environments: **Production, Preview, Development**
6. Klicke **Save**

**Fertig!** ✓

---

### ✅ Schritt 5: Neu deployen (1 Min)

1. Gehe zu **Deployments**
2. Klicke beim letzten Deployment auf **⋯** → **Redeploy**
3. Warte bis Deployment abgeschlossen ist (grüner Haken)

**Fertig!** ✓

---

## 🧪 Test durchführen

1. Öffne deine Website
2. Erstelle ein Test-Poster
3. Füge zum Warenkorb hinzu
4. Gehe zum Checkout
5. **Wichtig:** Nutze PayPal Sandbox für Tests!
6. Schließe Zahlung ab

**Nach 10-30 Sekunden:**
- ✅ Kunde erhält E-Mail mit Bestellbestätigung + Poster-Anhang
- ✅ Du erhältst E-Mail mit Bestelldetails + Poster-Anhang

---

## ❌ Problem? Fehlersuche

### E-Mails kommen nicht an?

**1. Prüfe Vercel Logs:**
- Deployments → Functions → `api/send-order-confirmation`
- Siehst du Fehler?

**2. Prüfe Brevo Logs:**
- [app.brevo.com](https://app.brevo.com) → Email → Logs
- Wurden E-Mails versendet?

**3. Häufige Fehler:**

| Problem | Lösung |
|---------|--------|
| `BREVO_API_KEY not configured` | API-Key in Vercel setzen & neu deployen |
| `Sender not verified` | E-Mail in Brevo verifizieren |
| E-Mails im Spam | Normal bei ersten E-Mails, Domain-Verifizierung hilft |
| `Failed to send email` | API-Key prüfen, Brevo-Logs checken |

---

## 🎉 Fertig!

Dein automatischer E-Mail-Versand ist jetzt aktiv!

**Was passiert jetzt bei jeder Bestellung:**
1. ✅ PayPal-Zahlung wird abgewickelt
2. ✅ Bestellung wird in Supabase gespeichert
3. ✅ **Kunde erhält Bestellbestätigung mit Postern**
4. ✅ **Du erhältst Bestellbenachrichtigung mit Postern**

---

## 📖 Weiterführende Dokumentation

- **Detaillierte Anleitung:** [BREVO-SETUP.md](./BREVO-SETUP.md)
- **E-Mail-Templates anpassen:** Siehe `/api/send-order-confirmation.js`
- **Brevo Dashboard:** [app.brevo.com](https://app.brevo.com)

---

## 💡 Tipps

### Domain-Verifizierung (empfohlen!)

Um zu verhindern, dass E-Mails im Spam landen:

1. Gehe zu Brevo → **Senders & IP** → **Domains**
2. Füge deine Domain hinzu (z.B. `pixel-poster.de`)
3. Füge die DNS-Einträge hinzu (SPF, DKIM)
4. Warte 24-48h auf Verifizierung

**Ergebnis:** Deutlich bessere Zustellrate!

### Kostenlos bleiben

Der **kostenlose Brevo-Plan** bietet:
- ✅ 300 E-Mails/Tag
- ✅ 9.000 E-Mails/Monat

Das reicht für:
- **150 Bestellungen/Tag** (2 E-Mails pro Bestellung)
- **4.500 Bestellungen/Monat**

> 💡 Erst bei mehr Bestellungen musst du upgraden!

---

**Viel Erfolg! 🚀**

