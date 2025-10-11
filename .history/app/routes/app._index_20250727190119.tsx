// app/routes/app._index.tsx

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  EmptyState,
  InlineStack,
  Icon,
  Badge,
  Button,
  Divider,
  Box,
  ProgressBar,
  Banner,
  Avatar,
} from "@shopify/polaris";
import {
  MarketsIcon,
  PaintBrushFlatIcon,
  ViewIcon,
  SettingsIcon,
  CheckCircleIcon,
  PlusCircleIcon,
  QuestionCircleIcon,
  ExternalIcon,
  CalendarIcon,
  EmailIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// --- INTERFACES ---
interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  revenueChange: number;
  ordersChange?: number;
  conversionRate?: number;
  topProduct?: string;
  pendingOrders?: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  createdAt: string;
}

interface SetupStep {
  id: string;
  title: string;
  description: string;
  url: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

// Helper function to check if form fields are properly configured
function isFormFieldsConfigured(formFields: string | null): boolean {
  if (!formFields || formFields === "[]") return false;
  try {
    const fields = JSON.parse(formFields);
    return Array.isArray(fields) && fields.length > 0;
  } catch {
    return false;
  }
}

// Helper function to check if visibility is configured (not default)
function isVisibilityConfigured(settings: any): boolean {
  return (
    settings?.visibilityMode !== "both_cart_product" ||
    settings?.hideAddToCart ||
    settings?.hideBuyNow ||
    settings?.disableOnHome ||
    settings?.disableOnCollections ||
    settings?.enableSpecificProducts ||
    settings?.disableSpecificProducts ||
    settings?.enableSpecificCountries ||
    (settings?.minimumAmount && settings.minimumAmount !== "") ||
    (settings?.maximumAmount && settings.maximumAmount !== "")
  );
}

// Helper function to check if pixels are configured
function isPixelsConfigured(pixelSettings: string | null): boolean {
  if (!pixelSettings) return false;
  try {
    const pixels = JSON.parse(pixelSettings);
    return (
      pixels.facebookPixelId ||
      pixels.googlePixelId ||
      pixels.tiktokPixelId ||
      pixels.pinterestPixelId ||
      pixels.snapchatPixelId ||
      pixels.taboolaPixelId ||
      pixels.sharechatPixelId ||
      pixels.kwaiPixelId
    );
  } catch {
    return false;
  }
}

// Helper function to check if shipping is configured
function isShippingConfigured(shippingRates: string | null): boolean {
  if (!shippingRates || shippingRates === "[]") return false;
  try {
    const rates = JSON.parse(shippingRates);
    return Array.isArray(rates) && rates.length > 0;
  } catch {
    return false;
  }
}

// --- LOADER ---
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // Get shop settings to determine setup completion
  const shopSettings = await db.shopSettings.findUnique({
    where: { shopId: session.shop },
  });

  // Get actual order data from OrderTracking table
  const orderTrackingData = await db.orderTracking.findMany({
    where: { shopId: session.shop },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // Calculate real setup completion status
  const setupSteps = [
    {
      id: "design_form",
      title: "Customize Your COD Form",
      description: "Design your form with custom fields, colors, and branding to match your store.",
      url: "/app/form-designer",
      completed: isFormFieldsConfigured(shopSettings?.formFields || null),
      priority: "high" as const,
    },
    {
      id: "set_visibility",
      title: "Configure Form Visibility",
      description: "Control when and where your COD form appears to maximize conversions.",
      url: "/app/visibility",
      completed: isVisibilityConfigured(shopSettings),
      priority: "high" as const,
    },
    {
      id: "configure_pixels",
      title: "Setup Tracking Pixels",
      description: "Add Facebook, Google, and TikTok pixels to track your marketing performance.",
      url: "/app/pixels",
      completed: isPixelsConfigured(shopSettings?.pixelSettings || null),
      priority: "medium" as const,
    },
    {
      id: "configure_shipping",
      title: "Setup Shipping Rates",
      description: "Configure delivery zones and shipping costs for accurate order pricing.",
      url: "/app/general", // Point to general settings where shipping might be configured
      completed: isShippingConfigured(shopSettings?.shippingRates || null),
      priority: "medium" as const,
    },
  ];

  // Calculate stats from actual data
  const totalRevenue = orderTrackingData.reduce((sum, order) => sum + (order.orderTotal || 0), 0);
  const stats: DashboardStats = {
    totalOrders: orderTrackingData.length,
    totalRevenue: totalRevenue,
    averageOrderValue: orderTrackingData.length > 0 ? totalRevenue / orderTrackingData.length : 0,
    revenueChange: 0, // Could calculate week-over-week change
    ordersChange: 0,
    conversionRate: 0,
    topProduct: "",
    pendingOrders: orderTrackingData.length, // Assuming all tracked orders are pending initially
  };

  // Convert tracking data to recent orders format
  const recentOrders: RecentOrder[] = orderTrackingData.map((order, index) => ({
    id: order.id.toString(),
    orderNumber: `#COD${order.id.toString().padStart(4, '0')}`,
    customerName: order.customerEmail?.split('@')[0] || `Customer ${order.id}`,
    total: order.orderTotal || 0,
    status: 'pending' as const,
    createdAt: order.createdAt.toISOString(),
  }));

  const shopName = session.shop.split('.')[0];
  const completedSteps = setupSteps.filter(step => step.completed).length;
  const totalSteps = setupSteps.length;
  const setupProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return json({
    stats,
    recentOrders,
    setupSteps,
    shopName,
    setupProgress,
    completedSteps,
    totalSteps,
    hasShopSettings: !!shopSettings,
  });
};

// --- MAIN COMPONENT ---
export default function DashboardPage() {
  const {
    stats,
    recentOrders,
    setupSteps,
    shopName,
    setupProgress,
    completedSteps,
    totalSteps
  } = useLoaderData<typeof loader>();

  const hasOrders = stats.totalOrders > 0;
  const needsSetup = setupProgress < 100;
  const nextIncompleteStep = setupSteps.find(step => !step.completed);

  return (
    <Page fullWidth>
      <BlockStack gap="600">
        <WelcomeHeader
          shopName={shopName}
          stats={stats}
          hasOrders={hasOrders}
          needsSetup={needsSetup}
          setupProgress={setupProgress}
          completedSteps={completedSteps}
          totalSteps={totalSteps}
          nextStepUrl={nextIncompleteStep?.url}
        />

        {hasOrders ? (
          <MainDashboardLayout
            orders={recentOrders}
            shopName={shopName}
          />
        ) : (
          <OnboardingView steps={setupSteps} />
        )}
      </BlockStack>
    </Page>
  );
}

// --- UI SUB-COMPONENTS ---

function WelcomeHeader({ 
  shopName, 
  stats, 
  hasOrders, 
  needsSetup, 
  setupProgress, 
  completedSteps, 
  totalSteps,
  nextStepUrl 
}: any) {
  return (
    <Layout>
      <Layout.Section>
        <Card>
          <Box padding="600">
            <BlockStack gap="500">
              <InlineStack align="space-between" blockAlign="start" wrap={false}>
                <BlockStack gap="300">
                  <InlineStack gap="300" blockAlign="center">
                    <Avatar customer name={shopName} />
                    <BlockStack gap="100">
                      <Text as="h1" variant="headingXl" fontWeight="bold">
                        Welcome back, {shopName}! 👋
                      </Text>
                      <Text as="p" tone="subdued" variant="bodyLg">
                        {hasOrders
                          ? `You have ${stats.pendingOrders} pending orders and DA ${stats.totalRevenue.toLocaleString()} in total revenue.`
                          : "Ready to start your Cash on Delivery journey? Let's get your first form set up!"}
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </BlockStack>

                {needsSetup && (
                  <Box minWidth="280px">
                    <Card background="bg-surface-success" padding="400">
                      <BlockStack gap="300">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text as="p" variant="bodyMd" fontWeight="semibold">Setup Progress</Text>
                          <Text as="p" variant="bodyMd" fontWeight="bold">{completedSteps}/{totalSteps}</Text>
                        </InlineStack>
                        <ProgressBar progress={setupProgress} tone="success" size="large" />
                        <Text as="p" variant="bodySm" tone="subdued">
                          {Math.round(setupProgress)}% complete
                        </Text>
                      </BlockStack>
                    </Card>
                  </Box>
                )}
              </InlineStack>

              {needsSetup && (
                <Banner
                  title="Complete your setup to maximize conversions"
                  tone="info"
                  action={{
                    content: "Continue Setup",
                    url: nextStepUrl || "/app/form-designer"
                  }}
                >
                  <Text as="p">You're {Math.round(setupProgress)}% done! Complete the remaining steps to unlock the full potential of your COD forms.</Text>
                </Banner>
              )}
            </BlockStack>
          </Box>
        </Card>
      </Layout.Section>
    </Layout>
  );
}

function MainDashboardLayout({ orders, shopName }: { orders: RecentOrder[], shopName: string }) {
  return (
    <Layout>
      <Layout.Section>
        <RecentOrdersFeed orders={orders} shopName={shopName} />
      </Layout.Section>
      <Layout.Section variant="oneThird">
        <EnhancedSidebar shopName={shopName} />
      </Layout.Section>
    </Layout>
  );
}

function OnboardingView({ steps }: { steps: SetupStep[] }) {
  const firstIncompleteStep = steps.find(step => !step.completed);
  
  return (
    <Layout>
      <Layout.Section>
        <Card>
          <Box padding={{ xs: "400", sm: "800" }}>
            <EmptyState
              heading="Ready to boost your sales with COD?"
              action={{
                content: "Create Your First Form",
                url: firstIncompleteStep?.url || "/app/form-designer",
                icon: PaintBrushFlatIcon,
              }}
              secondaryAction={{
                content: "Watch Tutorial",
                url: "/app/help", // You can create this route later
                icon: QuestionCircleIcon,
              }}
              image="https://cdn.shopify.com/s/files/1/0262/4074/files/empty-state.svg"
            >
              <Text as="p" variant="bodyLg" alignment="center">
                Create beautiful Cash on Delivery forms that convert visitors into customers.
                Your performance dashboard will come alive once you receive your first order!
              </Text>
            </EmptyState>
          </Box>
        </Card>
      </Layout.Section>
      <Layout.Section variant="oneThird">
        <SetupChecklist steps={steps} />
      </Layout.Section>
    </Layout>
  );
}

function RecentOrdersFeed({ orders, shopName }: { orders: RecentOrder[], shopName: string }) {
  return (
    <Card>
      <Box padding="600">
        <BlockStack gap="500">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h2" variant="headingLg" fontWeight="semibold">Recent Orders</Text>
            <Button
              url={`https://admin.shopify.com/store/${shopName}/orders`}
              variant="plain"
              icon={ExternalIcon}
              target="_blank"
            >
              View All Orders
            </Button>
          </InlineStack>

          {orders.length > 0 ? (
            <BlockStack gap="300">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </BlockStack>
          ) : (
            <Box padding="800">
              <Text as="p" tone="subdued" alignment="center" variant="bodyLg">
                Your most recent COD orders will appear here.
              </Text>
            </Box>
          )}
        </BlockStack>
      </Box>
    </Card>
  );
}

function OrderCard({ order }: { order: RecentOrder }) {
  const statusConfig = {
    pending: { tone: 'warning' as const, label: 'Pending' },
    confirmed: { tone: 'info' as const, label: 'Confirmed' },
    shipped: { tone: 'success' as const, label: 'Shipped' },
    delivered: { tone: 'success' as const, label: 'Delivered' },
  };

  const timeAgo = new Date(order.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <Card>
      <Box padding="400">
        <InlineStack align="space-between" blockAlign="center" wrap={false}>
          <BlockStack gap="300">
            <InlineStack gap="400" blockAlign="center">
              <Text as="p" variant="bodyLg" fontWeight="semibold">{order.orderNumber}</Text>
              <Badge tone={statusConfig[order.status].tone} size="large">{statusConfig[order.status].label}</Badge>
            </InlineStack>
            <InlineStack gap="500" blockAlign="center">
              <Text as="p" variant="bodyMd" tone="subdued">{order.customerName}</Text>
              <InlineStack gap="200" blockAlign="center">
                <Icon source={CalendarIcon} tone="subdued" />
                <Text as="p" variant="bodyMd" tone="subdued">{timeAgo}</Text>
              </InlineStack>
            </InlineStack>
          </BlockStack>
          <Text as="p" variant="headingMd" fontWeight="bold">DA {order.total.toLocaleString()}</Text>
        </InlineStack>
      </Box>
    </Card>
  );
}

function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sortedSteps = [...steps].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  const priorityConfig = {
    high: { tone: 'critical' as const },
    medium: { tone: 'warning' as const },
    low: { tone: 'info' as const },
  };

  return (
    <Card>
      <Box padding="600">
        <BlockStack gap="500">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h2" variant="headingLg" fontWeight="semibold">Setup Checklist</Text>
            <Badge tone="info" size="large">{`${steps.filter(s => s.completed).length}/${steps.length} Complete`}</Badge>
          </InlineStack>
          <BlockStack gap="400">
            {sortedSteps.map((step) => (
              <Card key={step.id} background={step.completed ? "bg-surface-success" : undefined}>
                <Box padding="500">
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="start" wrap={false}>
                      <InlineStack gap="300" blockAlign="center">
                        <Icon source={step.completed ? CheckCircleIcon : PlusCircleIcon} tone={step.completed ? "success" : "base"} />
                        <BlockStack gap="150">
                          <Text as="p" variant="bodyLg" fontWeight="semibold">{step.title}</Text>
                          <Text as="p" variant="bodyMd" tone="subdued">{step.description}</Text>
                        </BlockStack>
                      </InlineStack>
                      <Badge tone={priorityConfig[step.priority].tone} size="small">{step.priority}</Badge>
                    </InlineStack>
                    <Button
                      url={step.url}
                      variant={step.completed ? "tertiary" : "primary"}
                      fullWidth
                      size="large"
                    >
                      {step.completed ? "Review Settings" : "Get Started"}
                    </Button>
                  </BlockStack>
                </Box>
              </Card>
            ))}
          </BlockStack>
        </BlockStack>
      </Box>
    </Card>
  );
}

function EnhancedSidebar({ shopName }: { shopName: string }) {
  return (
    <BlockStack gap="600">
      <Card>
        <Box padding="600">
          <BlockStack gap="500">
            <Text as="h3" variant="headingLg" fontWeight="semibold">Quick Actions</Text>
            <BlockStack gap="300">
              <Button url="/app/form-designer" fullWidth icon={PaintBrushFlatIcon} variant="primary" size="large">Customize Form</Button>
              <Button url="/app/visibility" fullWidth icon={ViewIcon} size="large">Configure Visibility</Button>
              <Button url="/app/pixels" fullWidth icon={MarketsIcon} size="large">Setup Tracking Pixels</Button>
              <Button url="/app/general" fullWidth icon={SettingsIcon} size="large">General Settings</Button>
            </BlockStack>
          </BlockStack>
        </Box>
      </Card>

      <Card>
        <Box padding="600">
          <BlockStack gap="500">
            <InlineStack gap="300" blockAlign="center">
              <Icon source={QuestionCircleIcon} tone="info" />
              <Text as="h3" variant="headingLg" fontWeight="semibold">Need Help?</Text>
            </InlineStack>
            <Text as="p" variant="bodyMd" tone="subdued">
              Our support team is here to help you maximize your COD conversions and grow your business.
            </Text>
            <BlockStack gap="300">
              <Button url="/app/help" fullWidth icon={QuestionCircleIcon} variant="secondary" size="large">Browse Help Center</Button>
              <Button url="mailto:support@easycod.dz" fullWidth icon={EmailIcon} size="large">Contact Support</Button>
            </BlockStack>
            <Divider />
            <InlineStack align="center">
              <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                Average response time: <Text as="span" fontWeight="semibold">2 hours</Text>
              </Text>
            </InlineStack>
          </BlockStack>
        </Box>
      </Card>
    </BlockStack>
  );
}