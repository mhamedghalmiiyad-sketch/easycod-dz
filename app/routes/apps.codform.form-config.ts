import type { LoaderFunction } from "@remix-run/node";

export const loader: LoaderFunction = async () => {
  // Later you’ll load this from DB or Shopify metafield
  const fields = [
    { id: "name", label: "Name", type: "text" },
    { id: "phone", label: "Phone", type: "tel" },
    { id: "address", label: "Address", type: "text" },
  ];

  return new Response(JSON.stringify({ fields }), {
    headers: { "Content-Type": "application/json" },
  });
};
