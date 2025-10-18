import { redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import { getShopify } from '~/shopify.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const shopify = await getShopify();
  return shopify.authenticate.admin(request);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const shopify = await getShopify();
  return shopify.authenticate.admin(request);
};
