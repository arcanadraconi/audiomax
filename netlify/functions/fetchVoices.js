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
      userId: userIdHeader ? `${userIdHeader.substring(0, 4)}...` : 'missing',
      allHeaders: Object.keys(event.headers)
    });

    if (!authHeader || !userIdHeader) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing API credentials',
          details: {
            auth: !!authHeader,
            userId: !!userIdHeader,
            headers: Object.keys(event.headers)
          }
        })
      };
    }

    // Try both v1 and v2 endpoints
    const endpoints = [
      'https://api.play.ht/api/v2/voices',
      'https://play.ht/api/v1/getVoices'
    ];

    let successfulResponse = null;
    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        console.log(`Attempting request to ${endpoint}`);
        const response = await axios({
          method: 'GET',
          url: endpoint,
          headers: {
            'Authorization': authHeader,
            'X-User-ID': userIdHeader,
            'Content-Type': 'application/json'
          }
        });

        console.log(`Response from ${endpoint}:`, {
          status: response.status,
          dataType: typeof response.data,
          isArray: Array.isArray(response.data),
          length: Array.isArray(response.data) ? response.data.length : 
                 Array.isArray(response.data?.voices) ? response.data.voices.length : 'N/A'
        });

        // If we get here, the request was successful
        successfulResponse = response;
        break;
      } catch (error) {
        console.error(`Error with ${endpoint}:`, {
          status: error.response?.status,
          data: error.response?.data
        });
        lastError = error;
      }
    }

    if (successfulResponse) {
      // Format the response consistently
      const voices = Array.isArray(successfulResponse.data) ? 
        successfulResponse.data : 
        successfulResponse.data?.voices || [];

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ voices })
      };
    }

    // If we get here, both endpoints failed
    throw lastError;

  } catch (error) {
    console.error('Final error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    return {
      statusCode: error.response?.status || 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        details: {
          status: error.response?.status,
          data: error.response?.data
        }
      })
    };
  }
};
