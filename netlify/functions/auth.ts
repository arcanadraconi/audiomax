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
      console.log('Parsed request body:', parsedBody);
    } catch (error) {
      console.error('Error parsing request body:', error);
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

    // Check backend health before proceeding
    try {
      const healthCheck = await fetch('https://audiomax.onrender.com/health');
      const healthStatus = await healthCheck.json();
      console.log('Backend health status:', healthStatus);
    } catch (error) {
      console.error('Backend health check failed:', error);
    }

    console.log('Forwarding request to:', `${RENDER_API_URL}/${path}`);
    console.log('Request body:', parsedBody);
    console.log('Request headers:', event.headers);

    // Forward the request to backend
    const response = await fetch(`${RENDER_API_URL}/${path}`, {
      method: event.httpMethod,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: event.body
    });

    const responseData = await response.json();
    console.log('Backend response:', {
      status: response.status,
      data: responseData,
      contentType: response.headers.get('content-type')
    });

    if (!response.ok) {
      console.error('Backend error:', responseData);
      return {
        statusCode: response.status,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Backend error',
          error: responseData
        })
      };
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
    console.error('Auth function error:', {
      message: error.message,
      stack: error.stack,
      details: error
    });

    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Internal server error in auth function',
        error: error?.message || 'Unknown error',
        details: error?.toString()
      })
    };
  }
};
