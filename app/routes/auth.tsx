import { redirect, type LoaderFunctionArgs } from '@remix-run/node';
import { getShopify } from '~/shopify.server';

/**
 * This route handles the OAuth callback from Shopify
 * After the user authorizes the app on Shopify, they get redirected here
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const shopify = await getShopify();
  const { admin } = await shopify.authenticate.admin(request);

  // If we have an admin session, redirect to the app
  if (admin) {
    return redirect('/app');
  }

  // Otherwise, something went wrong
  return redirect('/auth/login');
};
