import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Redirect root requests to the main app dashboard
  return redirect("/app");
};

export default function Index() {
  // This component will never render due to the redirect in the loader
  return null;
}
