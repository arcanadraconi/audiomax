import { Handler } from '@netlify/functions';

const RENDER_API_URL = 'https://audiomax.onrender.com/api/auth';

export const handler: Handler = async (event) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  try {
    // Get the path segment after /auth/
    const path = event.path.replace('/.netlify/functions/auth/', '');

    // Parse and validate request body
    let parsedBody;
    try {
      parsedBody = event.body ? JSON.parse(event.body) : {};
      console.log('[Auth Function] Request body:', parsedBody);
    } catch (error) {
      console.error('[Auth Function] Error parsing request body:', error);
      return {
        statusCode: 400,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Invalid request body format'
        })
      };
    }

    // Validate required fields for registration
    if (path === 'register') {
      if (!parsedBody.email || !parsedBody.password) {
        return {
          statusCode: 400,
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: 'Email and password are required for registration'
          })
        };
      }
    }

    // Make direct request to render.com backend
    const fullUrl = `${RENDER_API_URL}/${path}`;
    console.log('[Auth Function] Making request to:', fullUrl);

    const response = await fetch(fullUrl, {
      method: event.httpMethod,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: event.body
    });

    const responseData = await response.json();
    console.log('[Auth Function] Backend response:', {
      status: response.status,
      data: responseData
    });

    // Check if we got a user ID in the response
    if (responseData.user && responseData.user.id) {
      console.log('[Auth Function] User ID:', responseData.user.id);
      
      // Verify the user was created
      const verifyResponse = await fetch(`${RENDER_API_URL}/verify/${responseData.user.id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${responseData.token}`
        }
      });
      
      if (verifyResponse.ok) {
        console.log('[Auth Function] User verified in database');
      } else {
        console.warn('[Auth Function] User verification failed');
      }
    }

    return {
      statusCode: response.status,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(responseData)
    };
  } catch (error: any) {
    console.error('[Auth Function] Error:', {
      message: error.message,
      stack: error.stack
    });

    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Internal server error in auth function',
        error: error?.message || 'Unknown error'
      })
    };
  }
};
