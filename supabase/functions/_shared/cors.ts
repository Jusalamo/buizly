// Shared CORS configuration for authenticated edge functions
// Restricts cross-origin requests to allowed domains only

const allowedOrigins = [
  // Production domains
  'https://buizly.lovable.app',
  'https://lovable.app',
  'https://lovable.dev',
  'https://buizly.vercel.app',
  // Preview domains (Lovable pattern)
  /^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.lovable\.app$/,
  /^https:\/\/preview--[a-z0-9-]+\.lovable\.app$/,
  /^https:\/\/id-preview--[a-z0-9-]+\.lovable\.app$/,
  // Development
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
];

export function getCorsHeaders(req: Request): { [key: string]: string } {
  const origin = req.headers.get('origin') || '';
  
  // Check if origin matches any allowed origin
  const isAllowed = allowedOrigins.some(allowed => {
    if (typeof allowed === 'string') {
      return origin === allowed;
    }
    // RegExp match for dynamic subdomains
    return allowed.test(origin);
  });
  
  // Use the request origin if allowed, otherwise use default
  const allowOrigin = isAllowed ? origin : 'https://buizly.lovable.app';
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

// For OPTIONS preflight requests
export function handleCorsPreflightRequest(req: Request): Response {
  return new Response(null, { headers: getCorsHeaders(req) });
}
