#!/usr/bin/env node

/**
 * Build-Script für Vercel
 * Erstellt config.js mit Umgebungsvariablen
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.js');

// Hole Umgebungsvariablen
const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Erstelle neue config.js mit tatsächlichen Werten
const configContent = `// Konfiguration für Pixel-Poster
// Diese Datei wurde automatisch beim Build generiert

window.CONFIG = {
  // PayPal Client-ID
  PAYPAL_CLIENT_ID: '${paypalClientId}',
  
  // Supabase Konfiguration (für Phase 2)
  SUPABASE_URL: '${supabaseUrl}',
  SUPABASE_ANON_KEY: '${supabaseAnonKey}',
};
`;

// Schreibe die config.js
fs.writeFileSync(configPath, configContent, 'utf8');

console.log('✓ Build-Konfiguration erstellt');
console.log('  PayPal Client-ID:', paypalClientId ? 'gesetzt (' + paypalClientId.substring(0, 10) + '...)' : 'nicht gesetzt');
console.log('  Supabase URL:', supabaseUrl ? 'gesetzt' : 'nicht gesetzt');
console.log('  Supabase Anon Key:', supabaseAnonKey ? 'gesetzt' : 'nicht gesetzt');

