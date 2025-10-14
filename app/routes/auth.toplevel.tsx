import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    throw new Response("Missing shop parameter", { status: 400 });
  }

  // Redirect to the main auth route without the embedded parameter
  // This will break out of the iframe and allow cookies to be set
  return redirect(`/auth?shop=${encodeURIComponent(shop)}`);
};

// This route renders a simple HTML page that redirects the top-level window
export default function TopLevelAuth() {
  return (
    <html>
      <head>
        <title>Redirecting...</title>
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Get the shop parameter from the URL
              const urlParams = new URLSearchParams(window.location.search);
              const shop = urlParams.get('shop');
              
              if (shop) {
                // Redirect the top-level window to the auth route
                window.top.location.href = '/auth?shop=' + encodeURIComponent(shop);
              } else {
                window.top.location.href = '/auth';
              }
            `,
          }}
        />
        <p>Redirecting to authentication...</p>
      </body>
    </html>
  );
}
