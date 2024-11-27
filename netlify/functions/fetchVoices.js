const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  try {
    const response = await fetch('https://api.play.ht/api/v2/voices', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.PLAYHT_SECRET_KEY}`,
        'X-User-ID': process.env.PLAYHT_USER_ID
      }
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Voice API Error Response:', text);
      return {
        statusCode: response.status,
        body: text
      };
    }

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.error('Voice library fetch error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch voices' })
    };
  }
};
