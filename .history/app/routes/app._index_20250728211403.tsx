// app/routes/app._index.tsx

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
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

// --- INTERFACES & TYPES (As per requirements) ---
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

// --- HELPER FUNCTIONS FOR SETUP VALIDATION ---

function isFormFieldsConfigured(formFields: string | null): boolean {
  if (!formFields || formFields === "[]") return false;
  try {
    const fields = JSON.parse(formFields);
    const essentialFields = ['first-name', 'last-name', 'phone', 'address', 'city'];
    const fieldIds = fields.map((f: any) => f.id);
    return essentialFields.every(field => fieldIds.includes(field));
  } catch {
    return false;
  }
}

function isVisibilityConfigured(settings: any): boolean {
  if (!settings) return false;
  return (
    settings.visibilityMode &&
    settings.visibilityMode !== "disabled" && (
      settings.visibilityMode === "both_cart_product" ||
      settings.visibilityMode === "only_cart_page" ||
      settings.visibilityMode === "only_product_pages"
    )
  );
}

function isPixelsConfigured(pixelSettings: string | null): boolean {
  if (!pixelSettings) return false;
  try {
    const pixels = JSON.parse(pixelSettings);
    return !!(
      pixels.facebookPixelId ||
      pixels.googlePixelId ||
      pixels.tiktokPixelId
    );
  } catch {
    return false;
  }
}

function isShippingConfigured(shippingRates: string | null): boolean {
  if (!shippingRates || shippingRates === "[]") return false;
  try {
    const rates = JSON.parse(shippingRates);
    return Array.isArray(rates) && rates.length > 0;
  } catch {
    return false;
  }
}

// ✅ 3. Refactored progress calculation into a dedicated function
const calculateSetupProgress = (shopSettings: any) => {
  const stepData = [
    {
      id: "design_form",
      title: "Customize Your COD Form",
      description: "Add essential fields like name, phone, and address to your form.",
      url: "/app/form-designer",
      completed: isFormFieldsConfigured(shopSettings?.formFields || null),
      priority: "high" as const,
    },
    {
      id: "set_visibility",
      title: "Configure Form Visibility",
      description: "Control where your COD form appears to maximize conversions.",
      url: "/app/visibility",
      completed: isVisibilityConfigured(shopSettings),
      priority: "high" as const,
    },
    {
      id: "configure_pixels",
      title: "Setup Tracking Pixels",
      description: "Add your main marketing pixels to track performance.",
      url: "/app/pixels",
      completed: isPixelsConfigured(shopSettings?.pixelSettings || null),
      priority: "medium" as const,
    },
    {
      id: "configure_shipping",
      title: "Setup Shipping Rates",
      description: "Configure delivery zones and shipping costs for accurate pricing.",
      url: "/app/general",
      completed: isShippingConfigured(shopSettings?.shippingRates || null),
      priority: "medium" as const,
    },
  ];

  const completedSteps = stepData.filter(step => step.completed).length;
  const totalSteps = stepData.length;
  const setupProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return { setupSteps: stepData, completedSteps, totalSteps, setupProgress };
};


// --- LOADER ---
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // ✅ 1. Fix the loader to use the correct session property (session.shop)
  const shopSettings = await db.shopSettings.findUnique({
    where: { shopId: session.shop },
  });

  const orderTrackingData = await db.orderTracking.findMany({
    where: { shopId: session.shop },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const { setupSteps, completedSteps, totalSteps, setupProgress } = calculateSetupProgress(shopSettings);

  const totalRevenue = orderTrackingData.reduce((sum, order) => sum + (order.orderTotal || 0), 0);
  const stats: DashboardStats = {
    totalOrders: orderTrackingData.length,
    totalRevenue: totalRevenue,
    averageOrderValue: orderTrackingData.length > 0 ? totalRevenue / orderTrackingData.length : 0,
    revenueChange: 0,
    ordersChange: 0,
    conversionRate: 0,
    topProduct: "",
    pendingOrders: orderTrackingData.filter(o => o.status === 'pending').length,
  };

  const recentOrders: RecentOrder[] = orderTrackingData.map((order) => ({
    id: order.id.toString(),
    orderNumber: `#COD${order.id.toString().padStart(4, '0')}`,
    customerName: order.customerEmail?.split('@')[0] || `Customer ${order.id}`,
    total: order.orderTotal || 0,
    status: (order.status as RecentOrder['status']) || 'pending',
    createdAt: order.createdAt.toISOString(),
  }));

  const shopName = session.shop.split('.')[0];

  return json({
    stats,
    recentOrders,
    setupSteps,
    shopName,
    setupProgress,
    completedSteps,
    totalSteps,
  });
};

// --- MAIN COMPONENT ---
export default function DashboardPage() {
  const navigate = useNavigate();
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

  const handleContinueSetup = () => {
    const nextStep = setupSteps.find(step => !step.completed);
    if (nextStep) {
      navigate(nextStep.url);
    } else {
      navigate("/app/form-designer");
    }
  };

  const handleNavigation = (url: string) => {
    try {
      navigate(url);
    } catch (error) {
      console.error("Navigation error:", error);
      // Fallback for safety, though typically not needed with Remix's navigate
      window.location.href = url;
    }
  };

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
          onContinueSetup={handleContinueSetup}
        />

        {hasOrders ? (
          <MainDashboardLayout
            orders={recentOrders}
            shopName={shopName}
            onNavigate={handleNavigation}
          />
        ) : (
          <OnboardingView steps={setupSteps} onNavigate={handleNavigation} />
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
  onContinueSetup
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
                    onAction: onContinueSetup
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

function MainDashboardLayout({ orders, shopName, onNavigate }: { orders: RecentOrder[], shopName: string, onNavigate: (url: string) => void }) {
  return (
    <Layout>
      <Layout.Section>
        <RecentOrdersFeed orders={orders} shopName={shopName} />
      </Layout.Section>
      <Layout.Section variant="oneThird">
        <EnhancedSidebar onNavigate={onNavigate} />
      </Layout.Section>
    </Layout>
  );
}

function OnboardingView({ steps, onNavigate }: { steps: SetupStep[], onNavigate: (url: string) => void }) {
  const firstIncompleteStep = steps.find(step => !step.completed);
  const primaryUrl = firstIncompleteStep?.url || "/app/form-designer";

  return (
    <Layout>
      <Layout.Section>
        <Card>
          <Box padding={{ xs: "400", sm: "800" }}>
            <EmptyState
              heading="Ready to boost your sales with COD?"
              action={{
                content: "Create Your First Form",
                icon: PaintBrushFlatIcon,
                onAction: () => onNavigate(primaryUrl)
              }}
              secondaryAction={{
                content: "Watch Tutorial",
                icon: QuestionCircleIcon,
                onAction: () => onNavigate("/app/help")
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
        <SetupChecklist steps={steps} onNavigate={onNavigate} />
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
              {orders.map((order) => ( <OrderCard key={order.id} order={order} /> ))}
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

function SetupChecklist({ steps, onNavigate }: { steps: SetupStep[], onNavigate: (url: string) => void }) {
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
                      onAction={() => onNavigate(step.url)}
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

// ✅ 2. Fix navigation to use onAction handlers for internal routes
const EnhancedSidebar = ({ onNavigate }: { onNavigate: (url: string) => void }) => {
  return (
    <BlockStack gap="600">
      <Card>
        <Box padding="600">
          <BlockStack gap="500">
            <Text as="h3" variant="headingLg" fontWeight="semibold">Quick Actions</Text>
            <BlockStack gap="300">
              <Button onAction={() => onNavigate("/app/form-designer")} fullWidth icon={PaintBrushFlatIcon} variant="primary" size="large">Customize Form</Button>
              <Button onAction={() => onNavigate("/app/visibility")} fullWidth icon={ViewIcon} size="large">Configure Visibility</Button>
              <Button onAction={() => onNavigate("/app/pixels")} fullWidth icon={MarketsIcon} size="large">Setup Tracking Pixels</Button>
              <Button onAction={() => onNavigate("/app/general")} fullWidth icon={SettingsIcon} size="large">General Settings</Button>
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
              <Button onAction={() => onNavigate("/app/help")} fullWidth icon={QuestionCircleIcon} variant="secondary" size="large">Browse Help Center</Button>
              <Button url="mailto:support@easycod.dz" fullWidth icon={EmailIcon} size="large">Contact Support</Button>
            </BlockStack>
          </BlockStack>
        </Box>
      </Card>
    </BlockStack>
  );
};
