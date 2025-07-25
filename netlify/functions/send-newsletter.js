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
    const { emails } = JSON.parse(event.body);

    if (!emails || !Array.isArray(emails)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields or invalid emails array' }),
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

    let sent = 0;
    let failed = 0;
    const errors = [];

    // Odesílání emailů jeden po druhém
    for (const email of emails) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(email),
        });

        if (response.ok) {
          sent++;
        } else {
          failed++;
          const errorData = await response.json().catch(() => ({}));
          errors.push(`${email.to[0]}: ${errorData.message || 'Unknown error'}`);
        }
      } catch (emailError) {
        failed++;
        errors.push(`${email.to[0]}: ${emailError.message}`);
      }

      // Malá pauza mezi emaily
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        sent: sent,
        failed: failed,
        errors: errors,
      }),
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};