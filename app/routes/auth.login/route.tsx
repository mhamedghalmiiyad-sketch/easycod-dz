import { json, redirect, type LoaderFunctionArgs } from '@remix-run/node';
import { authenticate } from '~/shopify.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  
  // If already has shop parameter, start the OAuth flow
  if (url.searchParams.has('shop')) {
    throw redirect(`/auth?${url.searchParams.toString()}`);
  }

  // Return a login form or redirect to auth
  return json({ message: 'Please provide a shop parameter' });
};

export default function LoginPage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Easycod App Installation</h1>
      <p>Enter your Shopify store URL to get started:</p>
      <form method="post" action="/auth">
        <input
          type="text"
          name="shop"
          placeholder="mystore.myshopify.com"
          required
          style={{
            padding: '0.5rem',
            fontSize: '1rem',
            marginRight: '0.5rem',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '0.5rem 1rem',
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          Install App
        </button>
      </form>
    </div>
  );
}
