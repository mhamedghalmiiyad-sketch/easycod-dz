// app/routes/app._index.tsx

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useFetcher } from "@remix-run/react";
import type { SerializeFrom } from "@remix-run/node";
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
  ResourceList,
  ResourceItem,
  SkeletonBodyText,
  SkeletonDisplayText,
  Banner,
  Collapsible,
} from "@shopify/polaris";
import {
  PaintBrushFlatIcon,
  ViewIcon,
  SettingsIcon,
  CheckCircleIcon,
  QuestionCircleIcon,
  ExternalIcon,
  OrderIcon,
  CheckIcon,
  XCircleIcon,
  ProductIcon,
  CartIcon,
  AppsIcon,
  ChatIcon,
  NoteIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import db from "../db.server";
// The static import for canvas-confetti is removed from here

// --- INTERFACES & TYPES ---
interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  conversionRate: number;
  topProduct: string;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  createdAt: string;
  shippingAddress: string;
  paymentMethod: string;
}

interface SetupStep {
  id: string;
  title: string;
  description:string;
  url: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

// --- UTILITY COMPONENTS ---
function AnimatedCounter({ end, duration = 1200, prefix = "", suffix = "" }: {
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
      const easedProgress = 1 - Math.pow(1 - progress, 3);
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
      description: "Configure essential fields and styling for cash on delivery orders",
      url: "/app/form-designer",
      completed: isFormFieldsConfigured(shopSettings?.formFields || null),
      priority: "high",
    },
    {
      id: "configure_pixels",
      title: "Setup Tracking Pixels",
      description: "Connect marketing pixels for analytics and conversion tracking",
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

// --- LOADER ---
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

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
    conversionRate: Math.round(Math.random() * 25 + 65), // Mock data
    topProduct: "COD Form Package", // Mock data
  };

  const recentOrders: RecentOrder[] = orderTrackingData.slice(0, 5).map((order, index) => ({
    id: order.id.toString(),
    orderNumber: `#COD${order.id.toString().padStart(4, '0')}`,
    customerName: order.customerEmail?.split('@')[0] || `Customer ${order.id}`,
    total: order.orderTotal || 0,
    status: 'pending',
    createdAt: order.createdAt.toISOString(),
    shippingAddress: `123 Mockingbird Lane, Apt ${index + 1}, Faketown, 12345`,
    paymentMethod: "Cash on Delivery (COD)",
  }));

  const shopName = session.shop.split('.')[0];
  const lastUpdated = new Date().toISOString();

  return json({
    stats,
    recentOrders,
    setupSteps,
    shopName,
    setupProgress,
    completedSteps,
    totalSteps,
    lastUpdated,
  });
};

// --- MAIN COMPONENT ---
export default function DashboardPage() {
  const navigate = useNavigate();
  const fetcher = useFetcher<typeof loader>();
  const initialData = useLoaderData<typeof loader>();

  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<SerializeFrom<typeof loader>>(initialData);

  const {
    stats,
    recentOrders,
    setupSteps,
    shopName,
    setupProgress,
    lastUpdated,
  } = dashboardData;

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetcher.load("/app");
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (fetcher.data) {
      setDashboardData(fetcher.data);
    }
  }, [fetcher.data]);

  // --- FIXED: CONFETTI ON COMPLETION ---
  // This effect dynamically imports and runs confetti only on the client-side.
  useEffect(() => {
    if (setupProgress === 100) {
      const runConfetti = async () => {
        const confettiModule = await import("canvas-confetti");
        const confetti = confettiModule.default;
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
      };
      runConfetti();
    }
  }, [setupProgress]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
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
        <AppHeader
          shopName={shopName}
          setupProgress={setupProgress}
          isSetupComplete={isSetupComplete}
          lastUpdated={lastUpdated}
        />

        {isSetupComplete && (
          <Banner
            title="Setup complete! You're ready to go."
            tone="success"
            onDismiss={() => {}}
          >
            <p>Your COD form is live and ready to receive orders. Congratulations!</p>
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            {!isSetupComplete ? (
              <SetupGuideSection
                setupSteps={setupSteps}
                onStepClick={(url) => navigate(url)}
              />
            ) : (
              <MainContentSection
                stats={stats}
                orders={recentOrders}
                hasOrders={hasOrders}
                onNavigate={navigate}
              />
            )}
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <QuickActionsCard onNavigate={navigate} />
              <HelpCard />
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
        <Card padding="500">
            <SkeletonDisplayText size="large" />
            <Box paddingBlockStart="200">
              <SkeletonBodyText lines={1} />
            </Box>
        </Card>
        <Layout>
          <Layout.Section>
            <Card padding="500">
              <SkeletonBodyText lines={8} />
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card padding="500">
                <SkeletonBodyText lines={4} />
              </Card>
              <Card padding="500">
                <SkeletonBodyText lines={4} />
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

// --- APP HEADER ---
function AppHeader({ shopName, setupProgress, isSetupComplete, lastUpdated }: {
  shopName: string;
  setupProgress: number;
  isSetupComplete: boolean;
  lastUpdated: string;
}) {
  return (
    <Card>
      <Box padding="500">
        <InlineStack align="space-between" blockAlign="center">
          <BlockStack gap="200">
            <Text as="h1" variant="headingLg">
              COD Forms • {shopName}
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Last updated: {new Date(lastUpdated).toLocaleTimeString()}
            </Text>
          </BlockStack>

          {!isSetupComplete && (
            <InlineStack gap="300" blockAlign="center">
              <Text as="p" variant="bodyMd" tone="subdued">
                Setup progress
              </Text>
              <div style={{ width: '120px' }}>
                <ProgressBar progress={setupProgress} size="small" />
              </div>
              <Text as="p" variant="bodyMd" fontWeight="semibold">
                <AnimatedCounter end={Math.round(setupProgress)} suffix="%" />
              </Text>
            </InlineStack>
          )}
        </InlineStack>
      </Box>
    </Card>
  );
}

// --- SETUP GUIDE SECTION ---
function SetupGuideSection({ setupSteps, onStepClick }: {
  setupSteps: SetupStep[];
  onStepClick: (url: string) => void;
}) {
  return (
    <Card>
      <Box padding="500">
        <BlockStack gap="500">
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">Complete your setup</Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              Follow these steps to start accepting cash on delivery orders.
            </Text>
          </BlockStack>

          <ResourceList
            resourceName={{ singular: 'step', plural: 'steps' }}
            items={setupSteps}
            renderItem={(step) => {
              return (
                <ResourceItem
                  id={step.id}
                  accessibilityLabel={`Setup step: ${step.title}`}
                  onClick={() => !step.completed && onStepClick(step.url)}
                  persistActions
                >
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="400" blockAlign="center" wrap={false}>
                      <Icon
                        source={step.completed ? CheckCircleIcon : SettingsIcon}
                        tone={step.completed ? "success" : "base"}
                      />
                      <BlockStack gap="100">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          {step.title}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {step.description}
                        </Text>
                      </BlockStack>
                    </InlineStack>
                    {step.completed ? (
                      <Badge tone="success">Complete</Badge>
                    ) : (
                      <Button onClick={() => onStepClick(step.url)}>
                        Start
                      </Button>
                    )}
                  </InlineStack>
                </ResourceItem>
              );
            }}
          />
        </BlockStack>
      </Box>
    </Card>
  );
}

// --- MAIN CONTENT SECTION ---
function MainContentSection({ stats, orders, hasOrders, onNavigate }: {
  stats: DashboardStats;
  orders: RecentOrder[];
  hasOrders: boolean;
  onNavigate: (url: string) => void;
}) {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  if (!hasOrders) {
    return (
      <Card>
        <EmptyState
          heading="Ready to receive orders"
          action={{
            content: "Customize form",
            icon: PaintBrushFlatIcon,
            onAction: () => onNavigate("/app/form-designer")
          }}
          image="https://cdn.shopify.com/s/files/1/0262/4074/files/empty-state.svg"
        >
          <p>Your COD form is configured. Orders will appear here once customers start placing them.</p>
        </EmptyState>
      </Card>
    );
  }

  return (
    <BlockStack gap="500">
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--p-space-400)'
      }}>
        <KPICard
          title="Total Orders"
          value={<AnimatedCounter end={stats.totalOrders} />}
          icon={OrderIcon}
          onClick={() => onNavigate("/app/analytics")}
        />
        <KPICard
          title="Conversion Rate"
          value={<AnimatedCounter end={stats.conversionRate} suffix="%" />}
          icon={CartIcon}
          onClick={() => onNavigate("/app/analytics")}
        />
        <KPICard
          title="Revenue"
          value={<AnimatedCounter end={stats.totalRevenue} prefix="DA " />}
          icon={ViewIcon}
          onClick={() => onNavigate("/app/analytics")}
        />
        <KPICard
          title="Top Product"
          value={stats.topProduct}
          icon={ProductIcon}
          onClick={() => onNavigate("/app/analytics")}
        />
      </div>

      <Card>
        <Box padding="500">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h3" variant="headingMd">Recent orders</Text>
            <Button
              variant="plain"
              onClick={() => onNavigate("/app/orders")}
            >
              View all
            </Button>
          </InlineStack>
        </Box>

        <ResourceList
          resourceName={{ singular: 'order', plural: 'orders' }}
          items={orders}
          renderItem={(order) => {
            const isExpanded = expandedOrder === order.id;
            return (
              <ResourceItem
                id={order.id}
                accessibilityLabel={`Order ${order.orderNumber}`}
                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
              >
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="400" blockAlign="center">
                    <Icon source={OrderIcon} />
                    <BlockStack gap="100">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        {order.orderNumber}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {order.customerName} • {new Date(order.createdAt).toLocaleDateString()}
                      </Text>
                    </BlockStack>
                  </InlineStack>

                  <InlineStack gap="300" blockAlign="center">
                    <Badge tone="attention">Pending</Badge>
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      DA {order.total.toLocaleString()}
                    </Text>
                  </InlineStack>
                </InlineStack>
                <Collapsible
                  open={isExpanded}
                  id={`order-details-${order.id}`}
                  transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
                >
                  <Box paddingBlockStart="400" paddingInlineStart="500">
                    <BlockStack gap="200">
                      <Text as="p" variant="bodyMd">
                        <span style={{fontWeight: 'bold'}}>Address:</span> {order.shippingAddress}
                      </Text>
                      <Text as="p" variant="bodyMd">
                        <span style={{fontWeight: 'bold'}}>Payment:</span> {order.paymentMethod}
                      </Text>
                    </BlockStack>
                  </Box>
                </Collapsible>
              </ResourceItem>
            );
          }}
        />
      </Card>
    </BlockStack>
  );
}

// --- KPI CARD COMPONENT ---
function KPICard({ title, value, icon, onClick }: {
  title: string;
  value: React.ReactNode;
  icon: any;
  onClick?: () => void;
}) {
  const cardStyle = {
    cursor: onClick ? 'pointer' as const : 'default' as const,
  };

  return (
    <div style={cardStyle} onClick={onClick}>
      <Card>
        <Box padding="400">
          <InlineStack align="space-between" blockAlign="start">
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">{title}</Text>
              <Text as="p" variant="headingLg" fontWeight="semibold">
                {value}
              </Text>
            </BlockStack>
            <Icon source={icon} tone="subdued" />
          </InlineStack>
        </Box>
      </Card>
    </div>
  );
}

// --- QUICK ACTIONS CARD ---
function QuickActionsCard({ onNavigate }: { onNavigate: (url: string) => void }) {
  return (
    <Card>
      <Box padding="500">
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">Quick actions</Text>
          <BlockStack gap="200">
            <Button onClick={() => onNavigate("/app/form-designer")} icon={AppsIcon} fullWidth textAlign="left" variant="plain">
              Add Form
            </Button>
            <Button onClick={() => onNavigate("/app/responses")} icon={NoteIcon} fullWidth textAlign="left" variant="plain">
              View Responses
            </Button>
            <Button onClick={() => onNavigate("/app/settings")} icon={SettingsIcon} fullWidth textAlign="left" variant="plain">
              Edit Settings
            </Button>
            <Button onClick={() => onNavigate("/app/help")} icon={QuestionCircleIcon} fullWidth textAlign="left" variant="plain">
              Help Center
            </Button>
          </BlockStack>
        </BlockStack>
      </Box>
    </Card>
  );
}

// --- HELP CARD ---
function HelpCard() {
  return (
    <Card>
      <Box padding="500">
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">Getting started</Text>
          <BlockStack gap="300">
            <Text as="p" variant="bodySm" tone="subdued">
              Need help setting up your COD forms? Check out our resources.
            </Text>
            <BlockStack gap="200">
              <Button url="/app/help" icon={QuestionCircleIcon} fullWidth textAlign="left" variant="plain">
                Getting Started
              </Button>
              <Button url="/app/whats-new" icon={ViewIcon} fullWidth textAlign="left" variant="plain">
                What's New
              </Button>
              <Button url="mailto:support@codforms.com" icon={ChatIcon} fullWidth textAlign="left" variant="plain">
                Contact Support
              </Button>
            </BlockStack>
          </BlockStack>
        </BlockStack>
      </Box>
    </Card>
  );
}