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
  Box,
  ProgressBar,
  Avatar,
} from "@shopify/polaris";
import {
  PaintBrushFlatIcon,
  ViewIcon,
  SettingsIcon,
  CheckCircleIcon,
  PlusCircleIcon,
  QuestionCircleIcon,
  ExternalIcon,
  CalendarIcon,
  MarketsIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// --- INTERFACES & TYPES ---
interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
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

// --- HELPER FUNCTIONS ---
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
  if (!settings || !settings.generalSettings) return false;
  try {
    const generalSettings = JSON.parse(settings.generalSettings);
    return generalSettings.hasConfiguredVisibility === true;
  } catch (e) {
    return false;
  }
}

function isPixelsConfigured(pixelSettings: string | null): boolean {
  if (!pixelSettings) return false;
  try {
    const pixels = JSON.parse(pixelSettings);
    return !!(pixels.facebookPixelId || pixels.googlePixelId || pixels.tiktokPixelId);
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

const calculateSetupProgress = (shopSettings: any) => {
  const stepData: SetupStep[] = [
    {
      id: "design_form",
      title: "Customize Your COD Form",
      description: "Add essential fields like name, phone, and address",
      url: "/app/form-designer",
      completed: isFormFieldsConfigured(shopSettings?.formFields || null),
      priority: "high",
    },
    {
      id: "set_visibility",
      title: "Configure Form Visibility",
      description: "Control where your COD form appears",
      url: "/app/visibility",
      completed: isVisibilityConfigured(shopSettings),
      priority: "high",
    },
    {
      id: "configure_pixels",
      title: "Setup Tracking Pixels",
      description: "Add marketing pixels to track performance",
      url: "/app/pixels",
      completed: isPixelsConfigured(shopSettings?.pixelSettings || null),
      priority: "medium",
    },
    {
      id: "configure_shipping",
      title: "Setup Shipping Rates",
      description: "Configure delivery zones and costs",
      url: "/app/general",
      completed: isShippingConfigured(shopSettings?.shippingRates || null),
      priority: "medium",
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

  const shopSettings = await db.shopSettings.findUnique({
    where: { shopId: session.shop },
  });

  const orderTrackingData = await db.orderTracking.findMany({
    where: { shopId: session.shop },
    orderBy: { createdAt: 'desc' },
    take: 5, // Reduced for simplicity
  });

  const { setupSteps, completedSteps, totalSteps, setupProgress } = calculateSetupProgress(shopSettings);
  
  const totalRevenue = orderTrackingData.reduce((sum, order) => sum + (order.orderTotal || 0), 0);
  const stats: DashboardStats = {
    totalOrders: orderTrackingData.length,
    totalRevenue: totalRevenue,
    pendingOrders: orderTrackingData.length,
  };

  const recentOrders: RecentOrder[] = orderTrackingData.map((order) => ({
    id: order.id.toString(),
    orderNumber: `#COD${order.id.toString().padStart(4, '0')}`,
    customerName: order.customerEmail?.split('@')[0] || `Customer ${order.id}`,
    total: order.orderTotal || 0,
    status: 'pending',
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

  const isSetupComplete = setupProgress === 100;
  const hasOrders = stats.totalOrders > 0;

  const handleStepClick = (url: string) => {
    navigate(url);
  };

  return (
    <Page fullWidth>
      <BlockStack gap="600">
        {/* Simple Header */}
        <Card>
          <Box padding="600">
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="400" blockAlign="center">
                <Avatar customer name={shopName} />
                <BlockStack gap="200">
                  <Text as="h1" variant="headingXl" fontWeight="bold">
                    Welcome, {shopName}! 👋
                  </Text>
                  <Text as="p" tone="subdued">
                    {isSetupComplete 
                      ? hasOrders 
                        ? `${stats.pendingOrders} pending orders • DA ${stats.totalRevenue.toLocaleString()} total revenue`
                        : "Your COD form is ready to receive orders!"
                      : "Let's get your Cash on Delivery form set up"}
                  </Text>
                </BlockStack>
              </InlineStack>
              
              {hasOrders && (
                <Button 
                  url={`https://admin.shopify.com/store/${shopName}/orders`}
                  icon={ExternalIcon}
                  target="_blank"
                  variant="primary"
                >
                  View All Orders
                </Button>
              )}
            </InlineStack>
          </Box>
        </Card>

        {/* Main Content - Setup or Dashboard */}
        {!isSetupComplete ? (
          <SetupSection 
            setupProgress={setupProgress}
            completedSteps={completedSteps}
            totalSteps={totalSteps}
            setupSteps={setupSteps}
            onStepClick={handleStepClick}
          />
        ) : (
          <DashboardSection 
            orders={recentOrders}
            hasOrders={hasOrders}
            onNavigate={navigate}
          />
        )}
      </BlockStack>
    </Page>
  );
}

// --- SETUP SECTION (Centered) ---
function SetupSection({ setupProgress, completedSteps, totalSteps, setupSteps, onStepClick }: {
  setupProgress: number;
  completedSteps: number;
  totalSteps: number;
  setupSteps: SetupStep[];
  onStepClick: (url: string) => void;
}) {
  const nextStep = setupSteps.find(step => !step.completed);
  
  return (
    <Layout>
      <Layout.Section>
        <Card>
          <Box padding={{ xs: "600", md: "800" }}>
            <BlockStack gap="800" inlineAlign="center">
              {/* Progress Overview */}
              <Box maxWidth="500px" width="100%">
                <BlockStack gap="400" inlineAlign="center">
                  <Text as="h2" variant="headingLg" alignment="center">
                    Complete Your Setup
                  </Text>
                  <Text as="p" variant="bodyLg" tone="subdued" alignment="center">
                    {Math.round(setupProgress)}% complete • {completedSteps} of {totalSteps} steps done
                  </Text>
                  <ProgressBar progress={setupProgress} tone="success" size="large" />
                </BlockStack>
              </Box>

              {/* Setup Steps */}
              <Box maxWidth="600px" width="100%">
                <BlockStack gap="400">
                  {setupSteps.map((step, index) => (
                    <SetupStepCard 
                      key={step.id}
                      step={step}
                      stepNumber={index + 1}
                      isNext={step.id === nextStep?.id}
                      onClick={() => onStepClick(step.url)}
                    />
                  ))}
                </BlockStack>
              </Box>

              {/* CTA Button */}
              {nextStep && (
                <Button 
                  onClick={() => onStepClick(nextStep.url)}
                  variant="primary"
                  size="large"
                  icon={PlusCircleIcon}
                >
                  {nextStep.title}
                </Button>
              )}
            </BlockStack>
          </Box>
        </Card>
      </Layout.Section>
    </Layout>
  );
}

// --- SETUP STEP CARD ---
function SetupStepCard({ step, stepNumber, isNext, onClick }: {
  step: SetupStep;
  stepNumber: number;
  isNext: boolean;
  onClick: () => void;
}) {
  const priorityColors = {
    high: 'critical' as const,
    medium: 'warning' as const,
    low: 'info' as const,
  };

  return (
    <Card 
      background={step.completed ? "bg-surface-success" : isNext ? "bg-surface-info" : undefined}
    >
      <Box padding="500">
<div onClick={onClick} style={{ cursor: 'pointer', width: '100%' }} role="button" tabIndex={0}>          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="400" blockAlign="center">
              <Box 
                background={step.completed ? "bg-fill-success" : "bg-fill-info"}
                borderRadius="full"
                padding="200"
                minWidth="32px"
                minHeight="32px"
              >
                <InlineStack align="center" blockAlign="center">
                  <Icon 
                    source={step.completed ? CheckCircleIcon : stepNumber.toString() as any} 
                    tone={step.completed ? "success" : "info"}
                  />
                </InlineStack>
              </Box>
              <BlockStack gap="200">
                <InlineStack gap="300" blockAlign="center">
                  <Text as="p" variant="bodyLg" fontWeight="semibold">
                    {step.title}
                  </Text>
                  <Badge tone={priorityColors[step.priority]} size="small">
                    {step.priority}
                  </Badge>
                </InlineStack>
                <Text as="p" variant="bodyMd" tone="subdued">
                  {step.description}
                </Text>
              </BlockStack>
            </InlineStack>
            
            <Text as="p" variant="bodyMd" tone={step.completed ? "success" : "subdued"}>
              {step.completed ? "✓ Complete" : isNext ? "Next →" : "Pending"}
            </Text>
          </InlineStack>
        </div>
      </Box>
    </Card>
  );
}

// --- DASHBOARD SECTION (After setup) ---
function DashboardSection({ orders, hasOrders, onNavigate }: {
  orders: RecentOrder[];
  hasOrders: boolean;
  onNavigate: (url: string) => void;
}) {
  if (!hasOrders) {
    return (
      <Card>
        <Box padding="800">
          <EmptyState
            heading="Your COD form is ready!"
            action={{
              content: "Customize Form",
              icon: PaintBrushFlatIcon,
              onAction: () => onNavigate("/app/form-designer")
            }}
            secondaryAction={{
              content: "View Help",
              icon: QuestionCircleIcon,
              onAction: () => onNavigate("/app/help")
            }}
            image="https://cdn.shopify.com/s/files/1/0262/4074/files/empty-state.svg"
          >
            <Text as="p" variant="bodyLg" alignment="center">
              Great job! Your Cash on Delivery form is configured and ready to convert visitors into customers.
              Orders will appear here once customers start placing them.
            </Text>
          </EmptyState>
        </Box>
      </Card>
    );
  }

  return (
    <Layout>
      <Layout.Section>
        <RecentOrdersCard orders={orders} />
      </Layout.Section>
      <Layout.Section variant="oneThird">
        <QuickActionsCard onNavigate={onNavigate} />
      </Layout.Section>
    </Layout>
  );
}

// --- RECENT ORDERS CARD ---
function RecentOrdersCard({ orders }: { orders: RecentOrder[] }) {
  return (
    <Card>
      <Box padding="600">
        <BlockStack gap="500">
          <Text as="h2" variant="headingLg" fontWeight="semibold">
            Recent Orders
          </Text>
          <BlockStack gap="300">
            {orders.map((order) => (
              <Card key={order.id}>
                <Box padding="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="200">
                      <InlineStack gap="300" blockAlign="center">
                        <Text as="p" variant="bodyLg" fontWeight="semibold">
                          {order.orderNumber}
                        </Text>
                        <Badge tone="warning">Pending</Badge>
                      </InlineStack>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        {order.customerName} • {new Date(order.createdAt).toLocaleDateString()}
                      </Text>
                    </BlockStack>
                    <Text as="p" variant="headingMd" fontWeight="bold">
                      DA {order.total.toLocaleString()}
                    </Text>
                  </InlineStack>
                </Box>
              </Card>
            ))}
          </BlockStack>
        </BlockStack>
      </Box>
    </Card>
  );
}

// --- QUICK ACTIONS CARD ---
function QuickActionsCard({ onNavigate }: { onNavigate: (url: string) => void }) {
  const actions = [
    { title: "Customize Form", url: "/app/form-designer", icon: PaintBrushFlatIcon },
    { title: "Form Visibility", url: "/app/visibility", icon: ViewIcon },
    { title: "Tracking Pixels", url: "/app/pixels", icon: MarketsIcon },
    { title: "General Settings", url: "/app/general", icon: SettingsIcon },
  ];

  return (
    <Card>
      <Box padding="600">
        <BlockStack gap="500">
          <Text as="h3" variant="headingLg" fontWeight="semibold">
            Quick Actions
          </Text>
          <BlockStack gap="300">
            {actions.map((action) => (
              <Button
                key={action.url}
                onClick={() => onNavigate(action.url)}
                fullWidth
                icon={action.icon}
                size="large"
              >
                {action.title}
              </Button>
            ))}
          </BlockStack>
        </BlockStack>
      </Box>
    </Card>
  );
}