import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Redirect to the favicon in the public directory
  return redirect("/favicon.ico");
};
