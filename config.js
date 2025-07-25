// Supabase konfigurace
// DŮLEŽITÉ: Nahraďte hodnoty níže vašimi skutečnými údaji z Supabase projektu

const SUPABASE_CONFIG = {
    url: 'https://qcwuieppccnozzcsjlxy.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjd3VpZXBwY2Nub3p6Y3NqbHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzODYyMjAsImV4cCI6MjA2NDk2MjIyMH0.rU2_ECyGH5Hfcd0FZQwRIa2l8iXJ9eMiO3DiiiZBUMQ'
};

// Příklad správných hodnot:
// url: 'https://abcdefghijklmnop.supabase.co'
// anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

// Resend konfigurace pro newsletter
const RESEND_CONFIG = {
    apiKey: 're_C38cinM2_CwwKaM8tdhMEpZUn7BKBknKc', // Zde vložte váš Resend API klíč
    fromEmail: 'newsletter@vedcizjistili.cz', // Ověřená doména!
    fromName: 'Vědci zjistili'
};

// Export pro použití v jiných souborech
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.RESEND_CONFIG = RESEND_CONFIG;