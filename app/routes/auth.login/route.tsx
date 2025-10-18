import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import { getShopify } from '~/shopify.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  
  // If already has shop parameter, start the OAuth flow
  if (url.searchParams.has('shop')) {
    return redirect(`/auth?shop=${url.searchParams.get('shop')}`);
  }

  return json({ message: 'Enter your store URL' });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const formData = await request.formData();
  const shop = formData.get('shop') as string;

  if (!shop) {
    return json({ error: 'Shop parameter is required' }, { status: 400 });
  }

  return redirect(`/auth?shop=${shop}`);
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
          }}
        >
          Install App
        </button>
      </form>
    </div>
  );
}
