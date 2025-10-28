# 🔒 reCAPTCHA v3 Setup-Anleitung

Diese Anleitung zeigt Ihnen, wie Sie Google reCAPTCHA v3 für Ihr Pixel-Poster-Projekt einrichten.

---

## 📋 Was Sie haben

Sie haben bereits bei Google reCAPTCHA v3 registriert und erhalten:
- ✅ **Site Key** (öffentlich, für Frontend)
- ✅ **Secret Key** (privat, nur für Backend/Server)

---

## 🚀 Schritt 1: Umgebungsvariablen in Vercel setzen

### So finden Sie die Umgebungsvariablen in Vercel:

1. Gehen Sie zu [vercel.com](https://vercel.com) und loggen Sie sich ein
2. Wählen Sie Ihr Projekt: **pixel-art**
3. Klicken Sie auf **Settings** (oben in der Navigation)
4. Wählen Sie **Environment Variables** in der linken Sidebar

### Fügen Sie folgende Variablen hinzu:

#### Variable 1: Site Key (Frontend)

| Feld | Wert |
|------|------|
| **Name** | `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` |
| **Value** | Ihr Site Key von Google (z.B. `6LcXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`) |
| **Environment** | ✅ Production<br>✅ Preview<br>✅ Development |

> **Wichtig:** Der Prefix `NEXT_PUBLIC_` ist erforderlich, damit die Variable im Frontend verfügbar ist!

#### Variable 2: Secret Key (Backend)

| Feld | Wert |
|------|------|
| **Name** | `RECAPTCHA_SECRET_KEY` |
| **Value** | Ihr Secret Key von Google (z.B. `6LcYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY`) |
| **Environment** | ✅ Production<br>✅ Preview<br>✅ Development |

> **⚠️ WICHTIG:** Teilen Sie den Secret Key NIEMALS öffentlich! Er darf nur im Server-Code verwendet werden.

### So sieht es in Vercel aus:

```
Environment Variables

┌────────────────────────────────────┬──────────────────────────────────┬─────────────────────┐
│ Name                               │ Value                            │ Environments        │
├────────────────────────────────────┼──────────────────────────────────┼─────────────────────┤
│ NEXT_PUBLIC_RECAPTCHA_SITE_KEY    │ 6LcXXXXXXXXXXXXXXXXXXXXXXXXXX...│ Production, Preview │
│ RECAPTCHA_SECRET_KEY              │ 6LcYYYYYYYYYYYYYYYYYYYYYYYYYY...│ Production, Preview │
└────────────────────────────────────┴──────────────────────────────────┴─────────────────────┘
```

---

## 🔄 Schritt 2: Neu deployen

Nach dem Hinzufügen der Umgebungsvariablen müssen Sie Ihr Projekt neu deployen:

### Option 1: Automatisch (via Git Push)

Wenn Sie Änderungen zu GitHub pushen, deployed Vercel automatisch:

```bash
git add .
git commit -m "reCAPTCHA v3 Integration"
git push
```

### Option 2: Manuell in Vercel

1. Gehen Sie zu Ihrem Projekt in Vercel
2. Klicken Sie auf **Deployments**
3. Klicken Sie auf die drei Punkte ⋮ beim neuesten Deployment
4. Wählen Sie **Redeploy**

---

## 🧪 Schritt 3: Testen

### So testen Sie die reCAPTCHA-Integration:

1. Öffnen Sie Ihre Live-Website: `pixel-art-kappa-peach.vercel.app`
2. Erstellen Sie ein Poster und gehen Sie zum Checkout
3. Öffnen Sie die **Browser-Entwicklertools** (F12)
4. Wechseln Sie zum **Console**-Tab
5. Klicken Sie auf "Jetzt kaufen"

### Was Sie in der Console sehen sollten:

```
🚀 Initialisiere reCAPTCHA...
✅ reCAPTCHA erfolgreich initialisiert
🔐 Generiere reCAPTCHA-Token für Checkout...
✅ reCAPTCHA-Token erfolgreich generiert
✅ reCAPTCHA-Token empfangen: 03AGdBq24...
```

### In Vercel Logs (Server-seitig):

1. Gehen Sie zu Vercel → Ihr Projekt → **Deployments**
2. Klicken Sie auf das aktuelle Deployment
3. Wählen Sie **Functions** → `send-order-confirmation`
4. Sehen Sie sich die Logs an:

```
🔍 Verifiziere reCAPTCHA-Token bei Google...
📊 reCAPTCHA-Ergebnis: { success: true, score: 0.9, action: 'checkout' }
✅ reCAPTCHA-Score: 0.9 (>= 0.5) - Mensch verifiziert
```

---

## 📊 Schritt 4: reCAPTCHA Admin Console überwachen

Google bietet ein Dashboard zur Überwachung Ihrer reCAPTCHA-Statistiken:

1. Gehen Sie zu [google.com/recaptcha/admin](https://www.google.com/recaptcha/admin)
2. Wählen Sie Ihr Projekt "pixel"
3. Sehen Sie sich die Statistiken an:
   - Anfragen pro Tag
   - Score-Verteilung (0.0 - 1.0)
   - Bot-Erkennungsrate
   - Verdächtige Aktivitäten

### Score-Interpretation:

| Score | Bedeutung | Aktion |
|-------|-----------|--------|
| 0.9 - 1.0 | Definitiv Mensch | ✅ Durchlassen |
| 0.5 - 0.8 | Wahrscheinlich Mensch | ✅ Durchlassen |
| 0.3 - 0.4 | Verdächtig | ⚠️ Durchlassen, aber flaggen |
| 0.0 - 0.2 | Wahrscheinlich Bot | ❌ Blockieren |

> In unserem Code ist der Standard-Schwellenwert **0.5**. Sie können diesen in `api/send-order-confirmation.js` anpassen.

---

## ⚙️ Schritt 5: Score-Schwellenwert anpassen (Optional)

Wenn Sie den Schwellenwert ändern möchten (z.B. strenger oder lockerer):

Öffnen Sie `api/send-order-confirmation.js` und finden Sie diese Zeile:

```javascript
const minScore = 0.5; // Empfohlener Schwellenwert (anpassbar)
```

**Empfehlungen:**

- **E-Commerce (wie Pixel-Poster):** `0.5` (Standard)
- **Sehr strenges Sicherheitsbedürfnis:** `0.7`
- **Lockerer (weniger False Positives):** `0.3`

Nach der Änderung:
```bash
git add api/send-order-confirmation.js
git commit -m "reCAPTCHA Schwellenwert angepasst"
git push
```

---

## 🔧 Troubleshooting

### Problem: "reCAPTCHA Site Key nicht konfiguriert"

**Lösung:**
- Prüfen Sie, ob die Umgebungsvariable `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` in Vercel gesetzt ist
- Achten Sie auf den Prefix `NEXT_PUBLIC_` (wichtig!)
- Deployen Sie neu

### Problem: "reCAPTCHA-Token konnte nicht generiert werden"

**Lösung:**
- Prüfen Sie die Browser-Console auf Fehler
- Stellen Sie sicher, dass Ihre Domain in den reCAPTCHA-Einstellungen bei Google eingetragen ist
- Domains sollten sein:
  - `pixel-art-kappa-peach.vercel.app`
  - `localhost` (für lokale Tests)

### Problem: Server-seitige Verifizierung schlägt fehl

**Lösung:**
- Prüfen Sie, ob `RECAPTCHA_SECRET_KEY` in Vercel gesetzt ist (OHNE `NEXT_PUBLIC_` Prefix)
- Prüfen Sie die Vercel Function Logs auf Fehlermeldungen
- Stellen Sie sicher, dass der Secret Key korrekt kopiert wurde (keine Leerzeichen)

### Problem: Score ist immer sehr niedrig (< 0.3)

**Mögliche Ursachen:**
- **Entwicklungsumgebung:** Im localhost/Test-Modus gibt reCAPTCHA oft niedrigere Scores
- **VPN/Proxy:** Nutzer mit VPN bekommen oft niedrigere Scores
- **Verdächtiges Verhalten:** Sehr schnelles Ausfüllen, viele Anfragen

**Lösung:**
- Testen Sie in Production-Umgebung
- Passen Sie den Schwellenwert an (siehe oben)
- Aktivieren Sie "fail-open" Modus (Standard in unserem Code)

---

## 📈 Best Practices

### 1. Score-basierte Aktionen

Statt hart zu blockieren, können Sie verschiedene Aktionen je nach Score durchführen:

```javascript
if (score >= 0.7) {
  // Hoher Score: Normal durchlassen
} else if (score >= 0.5) {
  // Mittlerer Score: Durchlassen, aber E-Mail an Admin
} else if (score >= 0.3) {
  // Niedriger Score: Durchlassen, aber manuell prüfen
} else {
  // Sehr niedrig: Blockieren
  return res.status(403).json({ error: 'Bot erkannt' });
}
```

### 2. Monitoring einrichten

Richten Sie Benachrichtigungen ein, wenn:
- Viele Anfragen mit niedrigem Score eingehen
- Plötzlicher Anstieg von Bot-Traffic
- Score-Verteilung sich ändert

### 3. Fail-Open vs. Fail-Closed

**Aktuell: Fail-Open (Standard)**
- Bei Fehler → Durchlassen
- Bessere UX, weniger False Positives

**Alternativ: Fail-Closed**
- Bei Fehler → Blockieren
- Höhere Sicherheit, aber schlechtere UX

---

## 📚 Weitere Ressourcen

- [Google reCAPTCHA v3 Dokumentation](https://developers.google.com/recaptcha/docs/v3)
- [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
- [Best Practices für reCAPTCHA v3](https://developers.google.com/recaptcha/docs/v3#interpreting_the_score)

---

## ✅ Checkliste

- [ ] Site Key und Secret Key von Google erhalten
- [ ] `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` in Vercel Umgebungsvariablen gesetzt
- [ ] `RECAPTCHA_SECRET_KEY` in Vercel Umgebungsvariablen gesetzt
- [ ] Neu deployed
- [ ] Frontend-Integration getestet (Browser Console)
- [ ] Backend-Integration getestet (Vercel Logs)
- [ ] reCAPTCHA Admin Console geprüft
- [ ] Score-Schwellenwert ggf. angepasst

---

**Bei Fragen oder Problemen, erstellen Sie ein GitHub Issue!** 🚀

