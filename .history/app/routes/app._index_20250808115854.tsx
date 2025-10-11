// app/routes/app._index.tsx

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { useState, useEffect } from "react";
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
  Spinner,
  List,
  ResourceList,
  ResourceItem,
  Avatar,
  SkeletonBodyText,
  SkeletonDisplayText,
  Banner,
} from "@shopify/polaris";
import {
  PaintBrushFlatIcon,
  ViewIcon,
  SettingsIcon,
  CheckCircleIcon,
  PlusCircleIcon,
  QuestionCircleIcon,
  ExternalIcon,
  OrderIcon,
  StarIcon,
  CheckIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// --- INTERFACES & TYPES ---
interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  conversionRate: number;
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

interface GuideStep {
  id: string;
  title: string;
  description: string;
  steps: string[];
}

// --- UTILITY COMPONENTS ---
function AnimatedCounter({ end, duration = 1500, prefix = "", suffix = "" }: {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 2);
      setCount(Math.floor(easedProgress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
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

function isPixelsConfigured(pixelSettings: string | null): boolean {
  if (!pixelSettings) return false;
  try {
    const pixels = JSON.parse(pixelSettings);
    return !!(pixels.facebookPixelId || pixels.googlePixelId || pixels.tiktokPixelId);
  } catch {
    return false;
  }
}

const calculateSetupProgress = (shopSettings: any) => {
  const stepData: SetupStep[] = [
    {
      id: "design_form",
      title: "Customize COD Form",
      description: "Configure essential fields and styling",
      url: "/app/form-designer",
      completed: isFormFieldsConfigured(shopSettings?.formFields || null),
      priority: "high",
    },
    {
      id: "configure_pixels",
      title: "Setup Tracking Pixels",
      description: "Connect marketing pixels for analytics",
      url: "/app/pixels",
      completed: isPixelsConfigured(shopSettings?.pixelSettings || null),
      priority: "medium",
    },
  ];

  const completedSteps = stepData.filter(step => step.completed).length;
  const totalSteps = stepData.length;
  const setupProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return { setupSteps: stepData, completedSteps, totalSteps, setupProgress };
};

// Setup Guide Data
const setupGuideSteps: GuideStep[] = [
  {
    id: "delivery_option",
    title: "Configure delivery options",
    description: "Set up shipping rates for COD orders",
    steps: [
      "Navigate to Settings → Shipping and delivery",
      "Create shipping zone if needed",
      "Add delivery rate with COD fee",
      "Save configuration"
    ]
  },
  {
    id: "payment_method",
    title: "Enable COD payment method",
    description: "Activate Cash on Delivery in payment settings",
    steps: [
      "Go to Settings → Payments",
      "Scroll to Manual payment methods",
      "Select Cash on Delivery (COD)",
      "Click Activate"
    ]
  },
  {
    id: "activate_app",
    title: "Complete app setup",
    description: "Finalize configuration and go live",
    steps: [
      "Complete all setup steps above",
      "Test COD form on storefront",
      "Verify order tracking works",
      "Launch to customers"
    ]
  }
];

// --- LOADER ---
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shopSettings = await db.shopSettings.findUnique({
    where: { shopId: session.shop },
  });

  const orderTrackingData = await db.orderTracking.findMany({
    where: { shopId: session.shop },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const { setupSteps, completedSteps, totalSteps, setupProgress } = calculateSetupProgress(shopSettings);

  const totalRevenue = orderTrackingData.reduce((sum, order) => sum + (order.orderTotal || 0), 0);
  const stats: DashboardStats = {
    totalOrders: orderTrackingData.length,
    totalRevenue: totalRevenue,
    conversionRate: Math.round(Math.random() * 30 + 70), // Mock data
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
    setupGuideSteps,
  });
};

// --- MAIN COMPONENT ---
export default function DashboardPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const {
    stats,
    recentOrders,
    setupSteps,
    shopName,
    setupProgress,
    completedSteps,
    totalSteps,
    setupGuideSteps
  } = useLoaderData<typeof loader>();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const isSetupComplete = setupProgress === 100;
  const hasOrders = stats.totalOrders > 0;

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <Page fullWidth>
      <BlockStack gap="500">
        {/* Header Summary */}
        <HeaderSummary
          shopName={shopName}
          isSetupComplete={isSetupComplete}
          setupProgress={setupProgress}
          stats={stats}
          hasOrders={hasOrders}
          completedSteps={completedSteps}
          totalSteps={totalSteps}
        />

        {/* Setup Complete Banner */}
        {isSetupComplete && (
          <Banner
            title="Setup Complete!"
            tone="success"
            onDismiss={() => { }}
          >
            <p>Your COD form is configured and ready to receive orders.</p>
          </Banner>
        )}

        {/* Main Content */}
        <Layout>
          <Layout.Section>
            {!isSetupComplete ? (
              <SetupSection
                setupSteps={setupSteps}
                setupProgress={setupProgress}
                onStepClick={(url) => navigate(url)}
              />
            ) : (
              <MainDashboard
                orders={recentOrders}
                stats={stats}
                hasOrders={hasOrders}
                onNavigate={navigate}
              />
            )}
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <QuickActionsCard onNavigate={navigate} />
              <CompactGuideCard guideSteps={setupGuideSteps} />
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

// --- LOADING SKELETON ---
function LoadingSkeleton() {
  return (
    <Page fullWidth>
      <BlockStack gap="500">
        <Card>
          <Box padding="600">
            <InlineStack align="space-between">
              <BlockStack gap="200">
                <SkeletonDisplayText size="large" />
                <SkeletonBodyText lines={1} />
              </BlockStack>
              <div style={{ width: '120px', height: '36px', background: '#f6f6f7', borderRadius: '6px' }} />
            </InlineStack>
          </Box>
        </Card>
        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="600">
                <SkeletonBodyText lines={8} />
              </Box>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <Box padding="600">
                <SkeletonBodyText lines={6} />
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

// --- HEADER SUMMARY ---
function HeaderSummary({ shopName, isSetupComplete, setupProgress, stats, hasOrders, completedSteps, totalSteps }: {
  shopName: string;
  isSetupComplete: boolean;
  setupProgress: number;
  stats: DashboardStats;
  hasOrders: boolean;
  completedSteps: number;
  totalSteps: number;
}) {
  return (
    <Card>
      <Box padding="600">
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="400" blockAlign="center">
            <Avatar
              customer
              size="medium"
              name={shopName}
              initials={shopName.charAt(0).toUpperCase()}
            />
            <BlockStack gap="200">
              <Text as="h1" variant="headingXl">
                Welcome back, {shopName}
              </Text>
              <Text as="p" variant="bodyLg" tone="subdued">
                {isSetupComplete
                  ? hasOrders
                    ? `${stats.totalOrders} orders • DA ${stats.totalRevenue.toLocaleString()} revenue`
                    : "Ready to receive your first COD orders"
                  : `Setup: ${completedSteps} of ${totalSteps} steps completed`
                }
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
              View Orders
            </Button>
          )}
        </InlineStack>

        {!isSetupComplete && (
          <Box paddingBlockStart="400">
            <BlockStack gap="200">
              <InlineStack align="space-between">
                <Text as="p" variant="bodyMd">Setup Progress</Text>
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  <AnimatedCounter end={Math.round(setupProgress)} suffix="%" />
                </Text>
              </InlineStack>
              <ProgressBar progress={setupProgress} size="small" />
            </BlockStack>
          </Box>
        )}
      </Box>
    </Card>
  );
}

// --- SETUP SECTION ---
function SetupSection({ setupSteps, setupProgress, onStepClick }: {
  setupSteps: SetupStep[];
  setupProgress: number;
  onStepClick: (url: string) => void;
}) {
  const nextStep = setupSteps.find(step => !step.completed);

  return (
    <BlockStack gap="500">
      <Card>
        <Box padding="600">
          <BlockStack gap="400">
            <Text as="h2" variant="headingLg">Complete Setup</Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              Follow these steps to start receiving COD orders
            </Text>

            <List type="bullet">
              {setupSteps.map((step) => (
                <List.Item key={step.id}>
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="300" blockAlign="center">
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: step.completed ? 'var(--p-color-bg-success-strong)' : 'var(--p-color-bg-surface-neutral)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {step.completed ? (
                          <Icon source={CheckIcon} tone="base" />
                        ) : (
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'var(--p-color-border-neutral)'
                          }} />
                        )}
                      </div>
                      <BlockStack gap="050">
                        <Text as="p" variant="bodyMd" fontWeight={step.completed ? "regular" : "semibold"}>
                          {step.title}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {step.description}
                        </Text>
                      </BlockStack>
                    </InlineStack>

                    {!step.completed && (
                      <Button
                        onClick={() => onStepClick(step.url)}
                        size="slim"
                        variant="primary"
                      >
                        Configure
                      </Button>
                    )}

                    {step.completed && (
                      <Badge tone="success">Complete</Badge>
                    )}
                  </InlineStack>
                </List.Item>
              ))}
            </List>

            {nextStep && (
              <Box paddingBlockStart="400">
                <InlineStack align="center">
                  <Button
                    onClick={() => onStepClick(nextStep.url)}
                    variant="primary"
                    size="large"
                    icon={PlusCircleIcon}
                  >
                    {nextStep.title}
                  </Button>
                </InlineStack>
              </Box>
            )}
          </BlockStack>
        </Box>
      </Card>
    </BlockStack>
  );
}

// --- MAIN DASHBOARD ---
function MainDashboard({ orders, stats, hasOrders, onNavigate }: {
  orders: RecentOrder[];
  stats: DashboardStats;
  hasOrders: boolean;
  onNavigate: (url: string) => void;
}) {
  if (!hasOrders) {
    return (
      <EmptyState
        heading="Ready for orders!"
        action={{
          content: "Customize Form",
          icon: PaintBrushFlatIcon,
          onAction: () => onNavigate("/app/form-designer")
        }}
        secondaryAction={{
          content: "View Help",
          onAction: () => onNavigate("/app/help")
        }}
        image="https://cdn.shopify.com/s/files/1/0262/4074/files/empty-state.svg"
      >
        <p>Your COD form is configured and ready. Orders will appear here once customers start placing them.</p>
      </EmptyState>
    );
  }

  return (
    <BlockStack gap="500">
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <Card>
          <Box padding="400">
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd" tone="subdued">Total Orders</Text>
              <Text as="p" variant="heading2xl" fontWeight="bold">
                <AnimatedCounter end={stats.totalOrders} />
              </Text>
            </BlockStack>
          </Box>
        </Card>

        <Card>
          <Box padding="400">
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd" tone="subdued">Revenue</Text>
              <Text as="p" variant="heading2xl" fontWeight="bold">
                <AnimatedCounter end={stats.totalRevenue} prefix="DA " />
              </Text>
            </BlockStack>
          </Box>
        </Card>

        <Card>
          <Box padding="400">
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd" tone="subdued">Conversion Rate</Text>
              <Text as="p" variant="heading2xl" fontWeight="bold">
                <AnimatedCounter end={stats.conversionRate} suffix="%" />
              </Text>
            </BlockStack>
          </Box>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <ResourceList
          resourceName={{ singular: 'order', plural: 'orders' }}
          items={orders}
          renderItem={(order) => {
            const { id, orderNumber, customerName, total, createdAt } = order;

            return (
              <ResourceItem
                id={id}
                url={`#`}
                accessibilityLabel={`Order ${orderNumber}`}
              >
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="400" blockAlign="center">
                    <Icon source={OrderIcon} />
                    <BlockStack gap="050">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        {orderNumber}
                      </Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        {customerName} • {new Date(createdAt).toLocaleDateString()}
                      </Text>
                    </BlockStack>
                  </InlineStack>

                  <InlineStack gap="300" blockAlign="center">
                    <Badge tone="warning">Pending</Badge>
                    <Text as="p" variant="bodyLg" fontWeight="semibold">
                      DA {total.toLocaleString()}
                    </Text>
                  </InlineStack>
                </InlineStack>
              </ResourceItem>
            );
          }}
        />
      </Card>
    </BlockStack>
  );
}

// --- QUICK ACTIONS CARD ---
function QuickActionsCard({ onNavigate }: { onNavigate: (url: string) => void }) {
  const actions = [
    { title: "Form Designer", url: "/app/form-designer", icon: PaintBrushFlatIcon },
    { title: "Analytics", url: "/app/analytics", icon: ViewIcon },
    { title: "Settings", url: "/app/settings", icon: SettingsIcon },
    { title: "Help Center", url: "/app/help", icon: QuestionCircleIcon },
  ];

  return (
    <Card>
      <Box padding="500">
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">Quick Actions</Text>
          <BlockStack gap="200">
            {actions.map((action) => (
              <Button
                key={action.url}
                onClick={() => onNavigate(action.url)}
                textAlign="left"
                fullWidth
                variant="plain"
                icon={action.icon}
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

// --- COMPACT GUIDE CARD ---
function CompactGuideCard({ guideSteps }: { guideSteps: GuideStep[] }) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  return (
    <Card>
      <Box padding="500">
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">Setup Guide</Text>
          <Text as="p" variant="bodyMd" tone="subdued">
            Complete these Shopify configuration steps
          </Text>

          <List type="number">
            {guideSteps.map((step) => (
              <List.Item key={step.id}>
                <BlockStack gap="200">
                  <div
                    onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      {step.title}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      {step.description}
                    </Text>
                  </div>

                  {expandedStep === step.id && (
                    <Box paddingBlockStart="200">
                      <div style={{
                        padding: '12px',
                        background: 'var(--p-color-bg-surface-neutral)',
                        borderRadius: '6px'
                      }}>
                        <List type="bullet">
                          {step.steps.map((substep, index) => (
                            <List.Item key={index}>
                              <Text as="p" variant="bodySm">{substep}</Text>
                            </List.Item>
                          ))}
                        </List>
                      </div>
                    </Box>
                  )}
                </BlockStack>
              </List.Item>
            ))}
          </List>
        </BlockStack>
      </Box>
    </Card>
  );
}