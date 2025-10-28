#!/usr/bin/env node

/**
 * Build-Script für Vercel
 * Ersetzt Platzhalter in config.js durch Umgebungsvariablen
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.js');

// Lese config.js
let configContent = fs.readFileSync(configPath, 'utf8');

// Ersetze Platzhalter durch Umgebungsvariablen
const replacements = {
  '##PAYPAL_CLIENT_ID##': process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'sandbox-test-id',
  '##SUPABASE_URL##': process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  '##SUPABASE_ANON_KEY##': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
};

Object.entries(replacements).forEach(([placeholder, value]) => {
  configContent = configContent.replace(placeholder, value);
});

// Schreibe die aktualisierte config.js
fs.writeFileSync(configPath, configContent, 'utf8');

console.log('✓ Build-Konfiguration erstellt');
console.log('  PayPal Client-ID:', replacements['##PAYPAL_CLIENT_ID##'] ? 'gesetzt' : 'nicht gesetzt');
console.log('  Supabase URL:', replacements['##SUPABASE_URL##'] ? 'gesetzt' : 'nicht gesetzt');

