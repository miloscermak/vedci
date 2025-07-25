exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Test funkce funguje!',
      method: event.httpMethod,
      hasApiKey: !!process.env.RESEND_API_KEY,
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    }),
  };
};