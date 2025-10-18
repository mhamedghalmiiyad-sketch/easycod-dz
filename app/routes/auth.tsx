import { redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import { authenticate } from '~/shopify.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return redirect('/app');
};

export const action = async ({ request }: ActionFunctionArgs) => {
  return await authenticate.admin(request);
};
