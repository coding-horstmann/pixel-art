// Konfiguration für Pixel-Poster
// WICHTIG: Diese Werte werden automatisch durch Vercel Umgebungsvariablen ersetzt
// Für lokale Entwicklung: Trage hier deine Test-Werte ein

window.CONFIG = {
  // PayPal Client-ID
  // In Vercel: Umgebungsvariable NEXT_PUBLIC_PAYPAL_CLIENT_ID setzen
  // Der Platzhalter ##PAYPAL_CLIENT_ID## wird beim Deploy automatisch ersetzt
  PAYPAL_CLIENT_ID: '##PAYPAL_CLIENT_ID##',
  
  // Supabase Konfiguration (für Phase 2)
  SUPABASE_URL: '##SUPABASE_URL##',
  SUPABASE_ANON_KEY: '##SUPABASE_ANON_KEY##',
};

