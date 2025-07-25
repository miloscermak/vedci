// Import fetch pro Node.js
const fetch = (() => {
  try {
    return require('node-fetch');
  } catch (e) {
    // Fallback pro novější Node.js verze
    return globalThis.fetch;
  }
})();

exports.handler = async (event, context) => {
  console.log('Function called with method:', event.httpMethod);
  console.log('Environment variables check:', !!process.env.RESEND_API_KEY);
  
  // Povolení CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Odpověď na preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { to, subject, html, text } = JSON.parse(event.body);

    if (!to || !subject || !html) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // API klíč z environment variables (bezpečné)
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error - missing API key' }),
      };
    }

    // Volání Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Vědci zjistili <newsletter@vedcizjistili.cz>',
        to: [to],
        subject: subject,
        html: html,
        text: text || html.replace(/<[^>]*>/g, ''), // Fallback text
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', result);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: result.message || 'Email sending failed' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, id: result.id }),
    };

  } catch (error) {
    console.error('Function error:', error);
    console.error('Error stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        hasApiKey: !!process.env.RESEND_API_KEY
      }),
    };
  }
};