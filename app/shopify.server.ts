import '@shopify/shopify-app-remix/adapters/node';
import { shopifyApp } from '@shopify/shopify-app-remix/server';
import { PrismaSessionStorage } from '@shopify/shopify-app-session-storage-prisma';
import { restResources } from '@shopify/shopify-api/rest/admin/2024-07';
import prisma from '~/db.server';

// Shopify app configuration with proper authentication setup

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY || '',
  apiSecretKey: process.env.SHOPIFY_API_SECRET || '',
  scopes: process.env.SCOPES?.split(',') || [],
  appUrl: process.env.SHOPIFY_APP_URL || 'http://localhost:3000',
  isEmbeddedApp: true,
  sessionStorage: new PrismaSessionStorage(prisma),
  restResources,
});

export default shopify;

// Export all the necessary functions that the Shopify library provides
export const authenticate = shopify.authenticate;
export const login = shopify.login;
export const unauthenticated = shopify.unauthenticated;
export const registerWebhooks = shopify.registerWebhooks;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;

// Helper function to get the shopify instance
export const getShopify = async () => shopify;