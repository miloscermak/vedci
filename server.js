// Node.js server s CORS proxy pro Resend API
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// API endpoint pro odesílání emailů
app.post('/send-email', async (req, res) => {
    try {
        const { emails, resendApiKey } = req.body;
        
        if (!emails || !Array.isArray(emails)) {
            return res.status(400).json({ error: 'Invalid emails array' });
        }

        if (!resendApiKey) {
            return res.status(400).json({ error: 'Resend API key is required' });
        }

        const results = [];

        // Odeslání emailů po jednom
        for (const emailData of emails) {
            try {
                console.log(`📤 Odesílám email na ${emailData.to[0]}`);
                
                const response = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${resendApiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(emailData),
                });

                const data = await response.json();
                console.log(`📨 Resend response (${response.status}):`, JSON.stringify(data, null, 2));

                if (response.ok) {
                    results.push({
                        success: true,
                        email: emailData.to[0],
                        id: data.id
                    });
                } else {
                    console.error(`❌ Resend API error for ${emailData.to[0]}:`, data);
                    results.push({
                        success: false,
                        email: emailData.to[0],
                        error: data.message || 'Unknown error'
                    });
                }

                // Malé zpoždění mezi emaily
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
                results.push({
                    success: false,
                    email: emailData.to[0],
                    error: error.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failedCount = results.filter(r => !r.success).length;

        res.json({
            success: true,
            sent: successCount,
            failed: failedCount,
            results: results
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server běží na http://localhost:${PORT}`);
    console.log(`📧 Newsletter ready na http://localhost:${PORT}/admin.html`);
});

// Zachycení chyb
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});