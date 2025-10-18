import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import { login } from '~/shopify.server';

/**
 * Login route handler
 * This route MUST use shopify.login() not shopify.authenticate.admin()
 */
export const loader = async (args: LoaderFunctionArgs) => {
  const { request } = args;
  const url = new URL(request.url);
  
  // If shop parameter exists in URL, initiate login flow
  if (url.searchParams.has('shop')) {
    return login(args);
  }

  // Otherwise show the login form
  return json({ ok: true });
};

export const action = async (args: ActionFunctionArgs) => {
  const { request } = args;
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const formData = await request.formData();
  const shop = formData.get('shop') as string;

  if (!shop) {
    return json({ error: 'Shop parameter is required' }, { status: 400 });
  }

  // Create new URL with shop parameter and call login
  const url = new URL(request.url);
  url.searchParams.set('shop', shop);
  
  // Create new args object with the modified request
  const modifiedArgs = {
    ...args,
    request: new Request(url.toString(), request)
  };
  
  return login(modifiedArgs);
};

export default function LoginPage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Easycod - COD App Installation</h1>
      <p>Enter your Shopify store URL to install the app:</p>
      <form method="post">
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            name="shop"
            placeholder="mystore.myshopify.com"
            required
            pattern=".*\.myshopify\.com"
            title="Please enter a valid Shopify store URL (e.g., mystore.myshopify.com)"
            style={{
              padding: '0.75rem',
              fontSize: '1rem',
              width: '100%',
              boxSizing: 'border-box',
              border: '1px solid #ccc',
              borderRadius: '4px',
              marginBottom: '1rem',
            }}
          />
        </div>
        <button
          type="submit"
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            cursor: 'pointer',
            backgroundColor: '#000',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            width: '100%',
          }}
        >
          Install App
        </button>
      </form>
    </div>
  );
}