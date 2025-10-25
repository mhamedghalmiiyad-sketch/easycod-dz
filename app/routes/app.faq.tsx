import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Divider,
} from "@shopify/polaris";
import { useTranslation } from "react-i18next";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({});
};

export default function FAQ() {
  const { t } = useTranslation("common");

  return (
    <Page
      title={t("faq.title", "Frequently Asked Questions")}
      backAction={{ content: t("common.back", "Back"), url: "/app" }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">
                  {t("faq.q1", "How do I set up the COD form?")}
                </Text>
                <Text variant="bodyMd" as="p">
                  {t(
                    "faq.a1",
                    "Navigate to the Form Designer from the main menu, customize your form fields, and save your changes. The form will automatically appear on your checkout page."
                  )}
                </Text>
              </BlockStack>

              <Divider />

              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">
                  {t("faq.q2", "Can I customize the form fields?")}
                </Text>
                <Text variant="bodyMd" as="p">
                  {t(
                    "faq.a2",
                    "Yes! You can add, remove, and customize form fields in the Form Designer. You can also change labels, placeholders, and make fields required or optional."
                  )}
                </Text>
              </BlockStack>

              <Divider />

              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">
                  {t("faq.q3", "How do I integrate with Google Sheets?")}
                </Text>
                <Text variant="bodyMd" as="p">
                  {t(
                    "faq.a3",
                    "Go to Settings > Integrations > Google Sheets. Follow the authentication flow to connect your Google account, then select which sheet you want to sync your orders to."
                  )}
                </Text>
              </BlockStack>

              <Divider />

              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">
                  {t("faq.q4", "What payment methods are supported?")}
                </Text>
                <Text variant="bodyMd" as="p">
                  {t(
                    "faq.a4",
                    "This app is specifically designed for Cash on Delivery (COD) orders. Customers will pay when they receive their order."
                  )}
                </Text>
              </BlockStack>

              <Divider />

              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">
                  {t("faq.q5", "How can I track abandoned carts?")}
                </Text>
                <Text variant="bodyMd" as="p">
                  {t(
                    "faq.a5",
                    "The app automatically tracks when customers start filling out the form but don't complete their order. You can view these in your dashboard and reach out to them via WhatsApp or email."
                  )}
                </Text>
              </BlockStack>

              <Divider />

              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">
                  {t("faq.q6", "Can I add custom validation rules?")}
                </Text>
                <Text variant="bodyMd" as="p">
                  {t(
                    "faq.a6",
                    "Yes, you can configure validation rules in the Settings > Protection section. You can set rules for phone numbers, addresses, and other fields."
                  )}
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

