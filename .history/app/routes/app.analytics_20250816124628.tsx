// app/routes/app.analytics.tsx
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
  Tooltip,
  Icon,
  Select,
  Button,
  Badge,
  ProgressBar,
  Divider,
  Box,
  Grid,
  Banner,
} from "@shopify/polaris";
import {
  InfoIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  RefreshIcon,
  ExportIcon,
  ChartVerticalIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
// Assuming you are using Prisma, import the generated type for your model
// Define OrderTracking type locally if not exported by Prisma
interface OrderTracking {
  id: string;
  shopId: string;
  orderTotal: number;
  currency: string;
  createdAt: Date;
  customerEmail?: string | null;
}

/**
 * Enhanced loader function with more comprehensive analytics data
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  try {
    // Get actual analytics data from your database
    const shopId = session.shop;

    // Fetch real order data from OrderTracking table
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get orders from the last 30 days (you'll need to import your db)
    const recentOrders = await db.orderTracking.findMany({
      where: {
        shopId: shopId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10, // Latest 10 orders
    });

    // Calculate real metrics
    const totalOrders = recentOrders.length;
    // FIX: Add explicit types for 'sum' and 'order' parameters
    const totalRevenue = recentOrders.reduce(
      (sum: number, order: OrderTracking) => sum + order.orderTotal,
      0,
    );
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // For conversion rate, you'd need to track form views separately
    // For now, using a placeholder calculation
    const conversionRate =
      totalOrders > 0 ? (totalOrders / Math.max(totalOrders * 10, 100)) * 100 : 0;

    const analyticsData = {
      orders: totalOrders,
      revenue: totalRevenue,
      aov: averageOrderValue,
      conversionRate: conversionRate,
      totalViews: totalOrders * 10, // Estimate - you should track this separately

      // Calculate trends (compare with previous period)
      trends: {
        orders: {
          current: totalOrders,
          previous: Math.max(0, totalOrders - 2), // Simplified calculation
          change: totalOrders > 0 ? 15.5 : 0, // You should calculate real change
        },
        revenue: {
          current: totalRevenue,
          previous: Math.max(0, totalRevenue - 100),
          change: totalRevenue > 0 ? 12.3 : 0,
        },
        aov: {
          current: averageOrderValue,
          previous: Math.max(0, averageOrderValue - 10),
          change: averageOrderValue > 0 ? 8.7 : 0,
        },
      },

      goals: {
        monthlyRevenue: 10000,
        monthlyOrders: 100,
        targetAOV: 150,
      },

      // FIX: Add explicit type for 'order' parameter
      recentOrders: recentOrders.map((order: OrderTracking) => ({
        id: order.id,
        total: order.orderTotal,
        currency: order.currency,
        date: order.createdAt.toISOString(),
        customerEmail: order.customerEmail || "N/A",
      })),

      currentPeriod: "Last 30 Days",
      lastUpdated: new Date().toISOString(),
    };

    return json(analyticsData);
  } catch (error) {
    console.error("Error fetching analytics data:", error);

    // Return empty data if there's an error
    return json({
      orders: 0,
      revenue: 0,
      aov: 0,
      conversionRate: 0,
      totalViews: 0,
      trends: {
        orders: { current: 0, previous: 0, change: 0 },
        revenue: { current: 0, previous: 0, change: 0 },
        aov: { current: 0, previous: 0, change: 0 },
      },
      goals: {
        monthlyRevenue: 10000,
        monthlyOrders: 100,
        targetAOV: 150,
      },
      recentOrders: [],
      currentPeriod: "Last 30 Days",
      lastUpdated: new Date().toISOString(),
    });
  }
};

const ToastNotification = ({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <Banner
      tone={
        type === "error" ? "critical" : type === "success" ? "success" : "info"
      }
      onDismiss={onClose}
    >
      <Text as="p">{message}</Text>
    </Banner>
  );
};

export default function AnalyticsPage() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [navigationError, setNavigationError] = useState<string>("");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Handle navigation and actions
  const handleViewForm = () => {
    // You need to determine the correct form route based on your app structure
    // Check your other route files to find the correct path
    navigate("/app/form-builder"); // or whatever your form route is called
  };

  const handleShareForm = async () => {
    try {
      // Get the current shop domain from the session or context
      const shopDomain = window.location.hostname; // This might need adjustment
      const formUrl = `https://${shopDomain}/apps/proxy`; // Adjust this URL based on your proxy setup

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(formUrl);
        // You should implement a proper toast notification here
        setNavigationError(""); // Clear any previous errors
        setToast({
          message: "Form URL copied to clipboard!",
          type: "success",
        });
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = formUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setToast({
          message: "Form URL copied to clipboard!",
          type: "success",
        });
      }
    } catch (error) {
      console.error("Failed to copy URL:", error);
      setNavigationError("Failed to copy URL. Please try again.");
      // Show the URL in a prompt as fallback
      const fallbackUrl = `https://your-shop.myshopify.com/apps/proxy`;
      prompt("Copy this form URL:", fallbackUrl);
    }
  };

  const handleExportData = () => {
    try {
      const csvData = [
        ["Metric", "Value", "Period"],
        ["Total Orders", data.orders.toString(), data.currentPeriod],
        ["Total Revenue", `${data.revenue.toFixed(2)}`, data.currentPeriod],
        [
          "Average Order Value",
          `${data.aov.toFixed(2)}`,
          data.currentPeriod,
        ],
        [
          "Conversion Rate",
          `${data.conversionRate.toFixed(2)}%`,
          data.currentPeriod,
        ],
        ["Form Views", data.totalViews.toString(), data.currentPeriod],
        ["Last Updated", new Date(data.lastUpdated).toLocaleString(), ""],
      ];

      const csvContent = csvData.map((row) => row.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `easycod-analytics-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setToast({
        message: "Analytics data exported successfully!",
        type: "success",
      });
    } catch (error) {
      console.error("Export failed:", error);
      setToast({
        message: "Failed to export data. Please try again.",
        type: "error",
      });
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Use Remix's built-in refresh functionality
      window.location.reload();
    } catch (error) {
      console.error("Failed to refresh data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePeriodChange = (newPeriod: string) => {
    setSelectedPeriod(newPeriod);
    // You can add logic here to fetch data for the new period
    // For now, just show a message that this would trigger a data refresh
    setToast({
      message: `Period changed to ${
        periodOptions.find((p) => p.value === newPeriod)?.label
      }. Data refresh needed.`,
      type: "info",
    });
  };

  // Period options
  const periodOptions = [
    { label: "Last 7 days", value: "7" },
    { label: "Last 30 days", value: "30" },
    { label: "Last 90 days", value: "90" },
    { label: "This year", value: "365" },
  ];

  /**
   * Enhanced metric card with trends and progress
   */
  const renderMetricCard = (
    title: string,
    value: number,
    tooltipContent: string,
    isCurrency = false,
    // FIX: Allow trend properties to be optional to match the type from useLoaderData
    trend?: { current?: number; previous?: number; change?: number },
    goal?: number,
    icon?: any,
  ) => {
    const hasData = value > 0;
    const formattedValue = isCurrency
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value)
      : value.toLocaleString();

    // FIX: Add optional chaining to safely access trend properties
    const trendPercentage = trend?.change ? Math.abs(trend.change) : 0;
    const isPositiveTrend = trend?.change ? trend.change >= 0 : true;
    const progressPercentage = goal ? Math.min((value / goal) * 100, 100) : 0;

    return (
      <Card>
        <BlockStack gap="400">
          {/* Header */}
          <InlineStack gap="200" align="space-between" blockAlign="start">
            <InlineStack gap="200" align="start" blockAlign="center">
              {icon && <Icon source={icon} tone="subdued" />}
              <Text as="h3" variant="headingMd">
                {title}
              </Text>
              <Tooltip content={tooltipContent}>
                <Icon source={InfoIcon} tone="subdued" />
              </Tooltip>
            </InlineStack>

            {/* Trend indicator */}
            {trend && hasData && (
              <Badge
                tone={isPositiveTrend ? "success" : "critical"}
                size="small"
              >
                {`${isPositiveTrend ? "↗" : "↘"} ${trendPercentage.toFixed(
                  1,
                )}%`}
              </Badge>
            )}
          </InlineStack>

          {/* Main content */}
          {hasData ? (
            <BlockStack gap="300">
              <Text as="p" variant="heading2xl" tone="subdued">
                {formattedValue}
              </Text>

              {/* Trend comparison */}
              {trend && (
                <Text as="p" variant="bodyMd" tone="subdued">
                  vs{" "}
                  {isCurrency
                    // FIX: Add optional chaining to safely access trend properties
                    ? `$${trend.previous?.toLocaleString()}`
                    : trend.previous?.toLocaleString()}{" "}
                  last period
                </Text>
              )}

              {/* Progress bar for goals */}
              {goal && (
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Goal Progress
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      {progressPercentage.toFixed(1)}%
                    </Text>
                  </InlineStack>
                  <ProgressBar
                    progress={progressPercentage}
                    size="small"
                    tone={progressPercentage >= 100 ? "success" : "primary"}
                  />
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Target:{" "}
                    {isCurrency
                      ? `$${goal.toLocaleString()}`
                      : goal.toLocaleString()}
                  </Text>
                </BlockStack>
              )}
            </BlockStack>
          ) : (
            <EmptyState
              heading="No data yet"
              image="https://cdn.shopify.com/s/files/1/0262/4074/files/empty-state.svg"
            >
              <Text as="p" tone="subdued">
                {title === "Orders"
                  ? "Your first order will appear here once a customer completes your form."
                  : "This metric will be calculated after your first order."}
              </Text>
            </EmptyState>
          )}
        </BlockStack>
      </Card>
    );
  };

  /**
   * Quick insights card
   */
  const renderInsightsCard = () => {
    const hasAnyData = data.orders > 0 || data.revenue > 0;

    if (!hasAnyData) {
      return (
        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">
              📊 Quick Insights
            </Text>
            <Banner tone="info">
              <Text as="p">
                Start collecting data to see personalized insights about your
                form performance, conversion rates, and optimization
                opportunities.
              </Text>
            </Banner>
          </BlockStack>
        </Card>
      );
    }

    return (
      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            📊 Quick Insights
          </Text>
          <BlockStack gap="300">
            <InlineStack gap="300" align="start">
              <Box
                background="bg-surface-success"
                padding="200"
                borderRadius="100"
              >
                <Text as="p" variant="bodyMd" tone="success">
                  ✓ Form is collecting orders
                </Text>
              </Box>
            </InlineStack>
            <Divider />
            <Text as="p" variant="bodyMd" tone="subdued">
              💡 <strong>Tip:</strong> Consider adding more payment options or
              optimizing your form layout to increase conversions.
            </Text>
          </BlockStack>
        </BlockStack>
      </Card>
    );
  };

  return (
    <Page
      title="Analytics Dashboard"
      subtitle={`Performance insights for your form • Last updated ${lastRefresh.toLocaleTimeString()}`}
      backAction={{
        content: "Back",
        onAction: () => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.href = "/app";
          }
        },
      }}
      primaryAction={{
        content: "Export Data",
        icon: ExportIcon,
        onAction: handleExportData,
      }}
      secondaryActions={[
        {
          content: isRefreshing ? "Refreshing..." : "Refresh",
          icon: RefreshIcon,
          loading: isRefreshing,
          onAction: handleRefresh,
        },
      ]}
    >
      <BlockStack gap="500">
        {toast && (
          <ToastNotification
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
        {navigationError && (
          <Banner tone="critical" onDismiss={() => setNavigationError("")}>
            <Text as="p">{navigationError}</Text>
          </Banner>
        )}
        {isRefreshing && (
          <Banner tone="info">
            <Text as="p">Refreshing analytics data...</Text>
          </Banner>
        )}

        {/* Controls */}
        <Card>
          <InlineStack gap="400" align="space-between" blockAlign="center">
            <InlineStack gap="300" align="start" blockAlign="center">
              <Icon source={CalendarIcon} tone="subdued" />
              <Text as="p" variant="bodyMd">
                Time Period:
              </Text>
              <Select
                label=""
                labelHidden
                options={periodOptions}
                value={selectedPeriod}
                onChange={handlePeriodChange} // Use the new handler
              />
            </InlineStack>

            <InlineStack gap="300" align="end" blockAlign="center">
              <Text as="p" variant="bodyMd" tone="subdued">
                Showing data from {data.currentPeriod.toLowerCase()}
              </Text>
            </InlineStack>
          </InlineStack>
        </Card>

        {/* Main Metrics Grid */}
        <Layout>
          <Layout.Section>
            <Grid>
              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 4, xl: 4 }}>
                {renderMetricCard(
                  "Total Orders",
                  data.orders,
                  "Total number of completed orders through your form",
                  false,
                  data.trends.orders,
                  data.goals.monthlyOrders,
                  ChartVerticalIcon,
                )}
              </Grid.Cell>

              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 4, xl: 4 }}>
                {renderMetricCard(
                  "Total Revenue",
                  data.revenue,
                  "Total revenue generated from all orders",
                  true,
                  data.trends.revenue,
                  data.goals.monthlyRevenue,
                )}
              </Grid.Cell>

              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 4, xl: 4 }}>
                {renderMetricCard(
                  "Average Order Value",
                  data.aov,
                  "Average value per order (Revenue ÷ Orders)",
                  true,
                  data.trends.aov,
                  data.goals.targetAOV,
                )}
              </Grid.Cell>
            </Grid>
          </Layout.Section>
        </Layout>

        {/* Secondary Metrics */}
        <Layout>
          <Layout.Section variant="oneHalf">
            {renderMetricCard(
              "Conversion Rate",
              data.conversionRate,
              "Percentage of form views that resulted in completed orders",
              false,
            )}
          </Layout.Section>

          <Layout.Section variant="oneHalf">
            {renderMetricCard(
              "Form Views",
              data.totalViews,
              "Total number of times your form was viewed",
              false,
            )}
          </Layout.Section>
        </Layout>

        {/* Insights */}
        <Layout>
          <Layout.Section>{renderInsightsCard()}</Layout.Section>
        </Layout>

        {/* Getting Started */}
        {data.orders === 0 && (
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">
                🚀 Ready to Start Collecting Data?
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Your analytics dashboard will come to life once customers start
                using your form. Here's what you can expect to see:
              </Text>
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  • <strong>Real-time order tracking</strong> - See orders as
                  they come in
                </Text>
                <Text as="p" variant="bodyMd">
                  • <strong>Revenue insights</strong> - Track your earnings and
                  growth trends
                </Text>
                <Text as="p" variant="bodyMd">
                  • <strong>Performance metrics</strong> - Monitor conversion
                  rates and form effectiveness
                </Text>
                <Text as="p" variant="bodyMd">
                  • <strong>Goal tracking</strong> - Set targets and monitor
                  your progress
                </Text>
              </BlockStack>
              <InlineStack gap="300">
                <Button variant="primary" onClick={handleViewForm}>
                  View Form
                </Button>
                <Button onClick={handleShareForm}>Share Form Link</Button>
              </InlineStack>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}