const axios = require('axios');

exports.handler = async function(event, context) {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers
    };
  }

  try {
    // Get API credentials from headers
    const authHeader = event.headers['authorization'] || event.headers['Authorization'];
    const userIdHeader = event.headers['x-user-id'] || event.headers['X-User-ID'];

    console.log('Request headers received:', {
      auth: authHeader ? `${authHeader.substring(0, 15)}...` : 'missing',
      userId: userIdHeader ? `${userIdHeader.substring(0, 4)}...` : 'missing'
    });

    if (!authHeader || !userIdHeader) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing API credentials',
          details: {
            auth: !!authHeader,
            userId: !!userIdHeader
          }
        })
      };
    }

    // Make request to PlayHT API
    const response = await axios({
      method: 'GET',
      url: 'https://play.ht/api/v1/getVoices',
      headers: {
        'Authorization': authHeader,
        'X-User-ID': userIdHeader,
        'Content-Type': 'application/json'
      }
    });

    console.log('PlayHT API response:', {
      status: response.status,
      dataLength: response.data?.length || 0
    });

    // Return the voices data
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    return {
      statusCode: error.response?.status || 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        details: error.response?.data
      })
    };
  }
};
