import { redirect, type LoaderFunctionArgs } from '@remix-run/node';
import { authenticate } from '~/shopify.server';

/**
 * This route handles the OAuth callback from Shopify
 * After the user authorizes the app on Shopify, they get redirected here
 */
export const loader = async (args: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(args);

  // If we have a session, redirect to the app
  if (session) {
    return redirect('/app');
  }

  // Otherwise, something went wrong
  return redirect('/auth/login');
};
