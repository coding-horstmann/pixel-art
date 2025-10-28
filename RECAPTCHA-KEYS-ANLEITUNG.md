# 🔑 Was Sie mit Ihren reCAPTCHA-Keys machen müssen

Sie haben von Google zwei Keys erhalten. Hier ist, was Sie damit machen müssen:

---

## 📝 Ihre Keys

Von Google haben Sie erhalten:

1. **Site Key** (beginnt mit `6Lc...`)
   - Dieser ist ÖFFENTLICH
   - Wird im Frontend (Browser) verwendet
   
2. **Secret Key** (beginnt mit `6Lc...`)
   - Dieser ist PRIVAT
   - Wird nur im Backend (Server) verwendet
   - ⚠️ NIEMALS öffentlich teilen!

---

## 🚀 Wo Sie die Keys eintragen müssen

### ✅ In Vercel (WICHTIG - Hier MÜSSEN Sie die Keys eintragen!)

1. Gehen Sie zu [vercel.com](https://vercel.com)
2. Loggen Sie sich ein
3. Wählen Sie Ihr Projekt: **pixel-art**
4. Klicken Sie auf **Settings** (oben)
5. Klicken Sie auf **Environment Variables** (links)
6. Fügen Sie 2 neue Variablen hinzu:

#### Variable 1: Site Key

Klicken Sie auf **Add New**

```
Name:  NEXT_PUBLIC_RECAPTCHA_SITE_KEY
Value: [Ihr Site Key von Google einfügen]
       (z.B. 6LcABCDEFGHIJKLMNOPQRSTUVWXYZ...)

Environments: ✅ Production
              ✅ Preview  
              ✅ Development
```

Klicken Sie auf **Save**

#### Variable 2: Secret Key

Klicken Sie auf **Add New**

```
Name:  RECAPTCHA_SECRET_KEY
Value: [Ihr Secret Key von Google einfügen]
       (z.B. 6LcZYXWVUTSRQPONMLKJIHGFEDCBA...)

Environments: ✅ Production
              ✅ Preview
              ✅ Development
```

Klicken Sie auf **Save**

---

## 🔄 Nach dem Speichern

Nach dem Hinzufügen der Keys müssen Sie **NEU DEPLOYEN**:

### Option 1: Automatisch (empfohlen)

Vercel deployed automatisch, weil ich gerade zu GitHub gepusht habe. 
Warten Sie einfach 1-2 Minuten.

### Option 2: Manuell

Falls automatisches Deployment nicht startet:

1. Gehen Sie zu Ihrem Vercel-Projekt
2. Klicken Sie auf **Deployments**
3. Klicken Sie auf die drei Punkte ⋮ beim neuesten Deployment
4. Wählen Sie **Redeploy**

---

## ✅ Fertig!

Nach dem Deployment ist reCAPTCHA v3 aktiv und schützt Ihr Checkout-Formular vor Bots!

### So testen Sie, ob es funktioniert:

1. Öffnen Sie Ihre Website: `pixel-art-kappa-peach.vercel.app`
2. Drücken Sie F12 (Entwicklertools öffnen)
3. Gehen Sie zum **Console**-Tab
4. Erstellen Sie ein Poster und gehen Sie zum Checkout
5. Klicken Sie auf "Jetzt kaufen"

Sie sollten sehen:

```
✅ reCAPTCHA erfolgreich initialisiert
🔐 Generiere reCAPTCHA-Token für Checkout...
✅ reCAPTCHA-Token erfolgreich generiert
```

---

## 📚 Weitere Hilfe

Alle Details finden Sie in:
- **RECAPTCHA-SETUP.md** (vollständige Anleitung)

---

**Das war's! 🎉**

