import { Handler } from '@netlify/functions';

const RENDER_API_URL = 'https://audiomax.onrender.com/api/auth';

export const handler: Handler = async (event) => {
  // Enable CORS
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Expose-Headers': 'Set-Cookie',
    'Content-Type': 'application/json'
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
      console.log('[Auth Function] Request body:', {
        ...parsedBody,
        password: parsedBody.password ? '[REDACTED]' : undefined
      });
    } catch (error) {
      console.error('[Auth Function] Error parsing request body:', error);
      return {
        statusCode: 400,
        headers,
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
          headers,
          body: JSON.stringify({
            message: 'Email and password are required for registration'
          })
        };
      }
    }

    // Forward all headers from the original request
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Add Authorization header if present
    if (event.headers.authorization) {
      requestHeaders.Authorization = event.headers.authorization;
    }

    // Make direct request to render.com backend
    const fullUrl = `${RENDER_API_URL}/${path}`;
    console.log('[Auth Function] Making request to:', fullUrl);
    console.log('[Auth Function] Request headers:', requestHeaders);
    console.log('[Auth Function] Request method:', event.httpMethod);

    const response = await fetch(fullUrl, {
      method: event.httpMethod,
      headers: requestHeaders,
      body: event.body
    });

    let responseData;
    const responseText = await response.text();
    console.log('[Auth Function] Raw response:', responseText);
    console.log('[Auth Function] Response status:', response.status);

    // Convert Headers to plain object
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    console.log('[Auth Function] Response headers:', responseHeaders);

    try {
      responseData = JSON.parse(responseText);
    } catch (error) {
      console.error('[Auth Function] Error parsing response:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          message: 'Invalid response from authentication server',
          rawResponse: responseText
        })
      };
    }

    console.log('[Auth Function] Backend response:', {
      status: response.status,
      data: {
        ...responseData,
        token: responseData.token ? '[REDACTED]' : undefined
      }
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
        const verifyData = await verifyResponse.json();
        console.log('[Auth Function] User verified in database:', verifyData);
      } else {
        const verifyError = await verifyResponse.text();
        console.warn('[Auth Function] User verification failed:', verifyError);
      }
    }

    // Forward response headers
    const finalHeaders = { ...headers };

    // Forward any Set-Cookie headers
    const setCookieHeader = response.headers.get('Set-Cookie');
    if (setCookieHeader) {
      finalHeaders['Set-Cookie'] = setCookieHeader;
    }

    return {
      statusCode: response.status,
      headers: finalHeaders,
      body: JSON.stringify(responseData)
    };
  } catch (error: any) {
    console.error('[Auth Function] Error:', {
      message: error.message,
      stack: error.stack
    });

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Internal server error in auth function',
        error: error?.message || 'Unknown error'
      })
    };
  }
};
