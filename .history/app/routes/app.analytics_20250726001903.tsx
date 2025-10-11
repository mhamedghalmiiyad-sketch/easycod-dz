// app/routes/app.analytics.tsx
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { useState } from "react";
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
  ChartVerticalIcon
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

/**
 * Enhanced loader function with more comprehensive analytics data
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  
  // In a real app, fetch this from your database/API
  const analyticsData = {
    // Current period metrics
    orders: 0,
    revenue: 0,
    aov: 0,
    
    // Enhanced metrics
    conversionRate: 0,
    totalViews: 0,
    
    // Historical data for trends (mock data)
    trends: {
      orders: { current: 0, previous: 0, change: 0 },
      revenue: { current: 0, previous: 0, change: 0 },
      aov: { current: 0, previous: 0, change: 0 },
    },
    
    // Goals/targets
    goals: {
      monthlyRevenue: 10000,
      monthlyOrders: 100,
      targetAOV: 150,
    },
    
    // Recent activity (mock data)
    recentOrders: [],
    
    // Period info
    currentPeriod: "This Month",
    lastUpdated: new Date().toISOString(),
  };
  
  return json(analyticsData);
};

export default function AnalyticsPage() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Handle navigation and actions
  const handleViewForm = () => {
    // Navigate to the form page - adjust the route as needed
    navigate("/app/form");
  };

  const handleShareForm = () => {
    // Copy form URL to clipboard or open share modal
    const formUrl = `${window.location.origin}/form`; // Adjust URL as needed
    navigator.clipboard.writeText(formUrl).then(() => {
      // You could show a toast notification here
      alert("Form URL copied to clipboard!");
    }).catch(() => {
      // Fallback - show the URL in a prompt
      prompt("Copy this form URL:", formUrl);
    });
  };

  const handleExportData = () => {
    // Create and download CSV of analytics data
    const csvData = [
      ["Metric", "Value"],
      ["Total Orders", data.orders.toString()],
      ["Total Revenue", `${data.revenue.toFixed(2)}`],
      ["Average Order Value", `${data.aov.toFixed(2)}`],
      ["Conversion Rate", `${data.conversionRate.toFixed(2)}%`],
      ["Form Views", data.totalViews.toString()],
    ];
    
    const csvContent = csvData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };
  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // In a real app, you'd make an API call to refresh data
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      // You could call a refresh function here that updates the data
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Failed to refresh data:", error);
    } finally {
      setIsRefreshing(false);
    }
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
    trend?: { current: number; previous: number; change: number },
    goal?: number,
    icon?: any
  ) => {
    const hasData = value > 0;
    const formattedValue = isCurrency
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value)
      : value.toLocaleString();

    const trendPercentage = trend ? Math.abs(trend.change) : 0;
    const isPositiveTrend = trend ? trend.change >= 0 : true;
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
                {`${isPositiveTrend ? "↗" : "↘"} ${trendPercentage.toFixed(1)}%`}
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
                  vs {isCurrency ? `$${trend.previous.toLocaleString()}` : trend.previous.toLocaleString()} last period
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
                    Target: {isCurrency ? `$${goal.toLocaleString()}` : goal.toLocaleString()}
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
                  : "This metric will be calculated after your first order."
                }
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
                Start collecting data to see personalized insights about your form performance, 
                conversion rates, and optimization opportunities.
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
              <Box background="bg-surface-success" padding="200" borderRadius="100">
                <Text as="p" variant="bodyMd" tone="success">
                  ✓ Form is collecting orders
                </Text>
              </Box>
            </InlineStack>
            <Divider />
            <Text as="p" variant="bodyMd" tone="subdued">
              💡 <strong>Tip:</strong> Consider adding more payment options or optimizing your form layout to increase conversions.
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
                onChange={setSelectedPeriod}
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
                  ChartVerticalIcon
                )}
              </Grid.Cell>
              
              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 4, xl: 4 }}>
                {renderMetricCard(
                  "Total Revenue",
                  data.revenue,
                  "Total revenue generated from all orders",
                  true,
                  data.trends.revenue,
                  data.goals.monthlyRevenue
                )}
              </Grid.Cell>
              
              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 4, xl: 4 }}>
                {renderMetricCard(
                  "Average Order Value",
                  data.aov,
                  "Average value per order (Revenue ÷ Orders)",
                  true,
                  data.trends.aov,
                  data.goals.targetAOV
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
              false
            )}
          </Layout.Section>
          
          <Layout.Section variant="oneHalf">
            {renderMetricCard(
              "Form Views",
              data.totalViews,
              "Total number of times your form was viewed",
              false
            )}
          </Layout.Section>
        </Layout>

        {/* Insights */}
        <Layout>
          <Layout.Section>
            {renderInsightsCard()}
          </Layout.Section>
        </Layout>

        {/* Getting Started */}
        {data.orders === 0 && (
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">
                🚀 Ready to Start Collecting Data?
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Your analytics dashboard will come to life once customers start using your form. 
                Here's what you can expect to see:
              </Text>
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  • <strong>Real-time order tracking</strong> - See orders as they come in
                </Text>
                <Text as="p" variant="bodyMd">
                  • <strong>Revenue insights</strong> - Track your earnings and growth trends
                </Text>
                <Text as="p" variant="bodyMd">
                  • <strong>Performance metrics</strong> - Monitor conversion rates and form effectiveness
                </Text>
                <Text as="p" variant="bodyMd">
                  • <strong>Goal tracking</strong> - Set targets and monitor your progress
                </Text>
              </BlockStack>
              <InlineStack gap="300">
                <Button variant="primary" onClick={handleViewForm}>
                  View Form
                </Button>
                <Button onClick={handleShareForm}>
                  Share Form Link
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}