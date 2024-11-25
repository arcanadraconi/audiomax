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
    
    console.log('Forwarding request to:', `${RENDER_API_URL}/${path}`);
    console.log('Request body:', event.body);
    console.log('Request headers:', event.headers);

    // Check if render.com is accessible
    try {
      await fetch(RENDER_API_URL);
    } catch (error) {
      console.error('Render.com backend is not accessible:', error);
      return {
        statusCode: 503,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Backend service is currently unavailable. Please try again later.',
          error: 'BACKEND_UNAVAILABLE'
        })
      };
    }

    // Forward the request to render.com backend
    const response = await fetch(`${RENDER_API_URL}/${path}`, {
      method: event.httpMethod,
      headers: {
        'Content-Type': 'application/json',
        ...event.headers
      },
      body: event.body
    });

    const data = await response.json();
    console.log('Response from backend:', data);

    return {
      statusCode: response.status,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };
  } catch (error: any) {
    console.error('Auth function error:', error);
    
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
