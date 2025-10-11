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
  Avatar,
  Spinner,
  List,
  Collapsible,
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
  StarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
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
  icon: string;
}

interface GuideStep {
  id: string;
  title: string;
  description: string;
  steps: string[];
  isCompleted?: boolean;
}

// --- CUSTOM COMPONENTS ---
function AnimatedCounter({ end, duration = 2000, prefix = "", suffix = "" }: {
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
      
      const easedProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
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

function FloatingParticles() {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      overflow: 'hidden',
      opacity: 0.08,
      zIndex: 0
    }}>
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: Math.random() * 6 + 2,
            height: Math.random() * 6 + 2,
            backgroundColor: '#6366F1',
            borderRadius: '50%',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float ${3 + Math.random() * 2}s ease-in-out infinite ${Math.random() * 2}s`,
          }}
        />
      ))}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(180deg); }
          }
        `
      }} />
    </div>
  );
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
      title: "Customize Your COD Form",
      description: "Add essential fields like name, phone, and address",
      url: "/app/form-designer",
      completed: isFormFieldsConfigured(shopSettings?.formFields || null),
      priority: "high",
      icon: "🎨",
    },
    {
      id: "configure_pixels",
      title: "Setup Tracking Pixels",
      description: "Add marketing pixels to track performance",
      url: "/app/pixels",
      completed: isPixelsConfigured(shopSettings?.pixelSettings || null),
      priority: "medium",
      icon: "📊",
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
    title: "Select delivery option for cash on delivery",
    description: "Configure shipping rates that will be visible when selecting Cash on Delivery payment method",
    steps: [
      "Go to your Shopify admin → Settings → Shipping and delivery",
      "In the 'Delivery' section, under 'General shipping rates', click 'General'",
      "If you don't have a shipping zone yet, click 'Add shipping zone'",
      "Under the newly created shipping zone, click the 'Add rate' button",
      "Name the rate and set the price (this will be your cash on delivery fee)",
      "Click 'Save' to confirm the new settings"
    ]
  },
  {
    id: "payment_method",
    title: "Choose a cash on delivery payment method",
    description: "Enable COD as a payment option in your Shopify store",
    steps: [
      "Go to your Shopify admin → Settings → Payments",
      "Scroll down to the 'Manual payment methods' section",
      "Click '+ Manual payment method'",
      "From the dropdown list, select 'Cash on Delivery (COD)'",
      "Click 'Activate Cash on Delivery' to enable it"
    ]
  },
  {
    id: "activate_app",
    title: "Activate app",
    description: "Complete the final steps to fully activate your COD app",
    steps: [
      "Complete all the setup steps in your app dashboard",
      "Test your COD form on your storefront",
      "Verify that orders are being tracked properly",
      "Configure any additional settings as needed"
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
    setupGuideSteps,
  });
};

// --- MAIN COMPONENT ---
export default function DashboardPage() {
  const navigate = useNavigate();
  const [isAnimating, setIsAnimating] = useState(true);
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
    const timer = setTimeout(() => setIsAnimating(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const isSetupComplete = setupProgress === 100;
  const hasOrders = stats.totalOrders > 0;

  const handleStepClick = (url: string) => {
    navigate(url);
  };

  return (
    <Page fullWidth>
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        <FloatingParticles />
        <BlockStack gap="600">
          {/* Hero Header */}
          <Card>
            <Box padding="800">
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '20px',
                padding: '40px',
                color: 'white',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-50px',
                  right: '-50px',
                  width: '200px',
                  height: '200px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%',
                  filter: 'blur(40px)'
                }} />
                
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="600" blockAlign="center">
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '20px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '32px',
                      fontWeight: 'bold',
                      animation: isAnimating ? 'pulse 2s infinite' : 'none',
                      backdropFilter: 'blur(10px)'
                    }}>
                      {shopName.charAt(0).toUpperCase()}
                    </div>
                    
                    <BlockStack gap="300">
                      <div style={{ 
                        fontSize: '36px', 
                        fontWeight: 'bold',
                        textShadow: '0 4px 8px rgba(0,0,0,0.2)'
                      }}>
                        Welcome back, {shopName}! ✨
                      </div>
                      <div style={{ 
                        fontSize: '18px',
                        opacity: 0.95,
                        fontWeight: '500'
                      }}>
                        {isSetupComplete 
                          ? hasOrders 
                            ? (
                              <>
                                🎯 <AnimatedCounter end={stats.pendingOrders || 0} suffix=" pending orders" /> • 
                                💰 <AnimatedCounter end={stats.totalRevenue} prefix="DA " suffix=" revenue" />
                              </>
                            )
                            : "Your COD form is ready to receive orders! 🚀"
                          : `Setup Progress: ${Math.round(setupProgress)}% • Let's complete your configuration`}
                      </div>
                    </BlockStack>
                  </InlineStack>
                  
                  {hasOrders && (
                    <Button 
                      url={`https://admin.shopify.com/store/${shopName}/orders`}
                      icon={ExternalIcon}
                      target="_blank"
                      variant="primary"
                      size="large"
                    >
                      View All Orders
                    </Button>
                  )}
                </InlineStack>
              </div>
            </Box>
          </Card>

          {/* Success Notification */}
          {isSetupComplete && (
            <Card>
              <Box padding="400">
                <div style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  textAlign: 'center',
                  animation: 'glow 3s ease-in-out infinite alternate',
                  color: 'white'
                }}>
                  <InlineStack gap="400" align="center" blockAlign="center">
                    <div style={{ fontSize: '32px' }}>🎉</div>
                    <Text as="p" variant="headingMd" fontWeight="bold">
                      Congratulations! Your COD setup is complete and ready to convert!
                    </Text>
                    <div style={{ fontSize: '32px' }}>⚡</div>
                  </InlineStack>
                </div>
              </Box>
            </Card>
          )}

          {/* Main Content */}
          {!isSetupComplete ? (
            <Layout>
              <Layout.Section>
                <SetupSection 
                  setupProgress={setupProgress}
                  completedSteps={completedSteps}
                  totalSteps={totalSteps}
                  setupSteps={setupSteps}
                  onStepClick={handleStepClick}
                />
              </Layout.Section>
              <Layout.Section variant="oneThird">
                <SetupGuideCard guideSteps={setupGuideSteps} />
              </Layout.Section>
            </Layout>
          ) : (
            <DashboardSection 
              orders={recentOrders}
              hasOrders={hasOrders}
              onNavigate={navigate}
              stats={stats}
              guideSteps={setupGuideSteps}
              shopName={shopName}
            />
          )}
        </BlockStack>

        {/* Global Styles */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
            
            @keyframes glow {
              0% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.3); }
              100% { box-shadow: 0 0 40px rgba(16, 185, 129, 0.6); }
            }
            
            @keyframes slideInUp {
              from { transform: translateY(30px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            
            @keyframes fadeIn {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
            
            @keyframes bounceIn {
              0% { transform: scale(0.3); opacity: 0; }
              50% { transform: scale(1.05); }
              70% { transform: scale(0.9); }
              100% { transform: scale(1); opacity: 1; }
            }
          `
        }} />
      </div>
    </Page>
  );
}

// --- MODERN SETUP SECTION ---
function SetupSection({ setupProgress, completedSteps, totalSteps, setupSteps, onStepClick }: {
  setupProgress: number;
  completedSteps: number;
  totalSteps: number;
  setupSteps: SetupStep[];
  onStepClick: (url: string) => void;
}) {
  const [visibleSteps, setVisibleSteps] = useState<number>(0);
  const nextStep = setupSteps.find(step => !step.completed);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleSteps(prev => {
        if (prev < setupSteps.length) return prev + 1;
        clearInterval(timer);
        return prev;
      });
    }, 300);
    
    return () => clearInterval(timer);
  }, [setupSteps.length]);
  
  return (
    <Card>
      <Box padding="800">
        <BlockStack gap="800" inlineAlign="center">
          {/* Progress Overview */}
          <Box maxWidth="600px" width="100%">
            <div style={{
              textAlign: 'center',
              padding: '40px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #F8FAFC 0%, #EDF2F7 100%)',
              border: '2px solid #E2E8F0',
              position: 'relative'
            }}>
              <BlockStack gap="500" inlineAlign="center">
                <InlineStack gap="400" blockAlign="center">
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '24px',
                    boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
                  }}>
                    ⚙️
                  </div>
                  <Text as="h2" variant="headingXl" alignment="center">
                    Complete Your Setup
                  </Text>
                </InlineStack>
                
                <div style={{ 
                  fontSize: '48px', 
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: 'pulse 2s infinite'
                }}>
                  <AnimatedCounter end={Math.round(setupProgress)} suffix="%" />
                </div>
                
                <Text as="p" variant="bodyLg" tone="subdued" alignment="center">
                  {completedSteps} of {totalSteps} steps completed
                </Text>
                
                <div style={{ width: '100%', position: 'relative' }}>
                  <ProgressBar progress={setupProgress} tone="primary" size="large" />
                </div>
              </BlockStack>
            </div>
          </Box>

          {/* Setup Steps */}
          <Box maxWidth="700px" width="100%">
            <BlockStack gap="400">
              {setupSteps.map((step, index) => (
                <div
                  key={step.id}
                  style={{
                    opacity: index < visibleSteps ? 1 : 0,
                    transform: index < visibleSteps ? 'translateY(0)' : 'translateY(20px)',
                    transition: 'all 0.6s ease-out',
                    transitionDelay: `${index * 0.2}s`
                  }}
                >
                  <ModernSetupStepCard 
                    step={step}
                    stepNumber={index + 1}
                    isNext={step.id === nextStep?.id}
                    onClick={() => onStepClick(step.url)}
                  />
                </div>
              ))}
            </BlockStack>
          </Box>

          {/* Call to Action */}
          {nextStep && (
            <div style={{ animation: 'fadeIn 0.8s ease-out 1s both' }}>
              <Button 
                onClick={() => onStepClick(nextStep.url)}
                variant="primary"
                size="large"
                icon={PlusCircleIcon}
              >
                {nextStep.title} →
              </Button>
            </div>
          )}
        </BlockStack>
      </Box>
    </Card>
  );
}

// --- MODERN SETUP STEP CARD ---
function ModernSetupStepCard({ step, stepNumber, isNext, onClick }: {
  step: SetupStep;
  stepNumber: number;
  isNext: boolean;
  onClick: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      style={{
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.3s ease',
        boxShadow: isHovered ? '0 12px 40px rgba(0, 0, 0, 0.1)' : 'none'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        onClick={onClick}
        style={{
          padding: '24px',
          borderRadius: '16px',
          border: step.completed 
            ? '2px solid #10B981' 
            : isNext 
              ? '2px solid #667eea'
              : '2px solid #E5E7EB',
          background: step.completed 
            ? 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)' 
            : isNext 
              ? 'linear-gradient(135deg, #F8FAFF 0%, #EEF2FF 100%)'
              : 'white',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Background Effect */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: step.completed ? 0 : '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.1), transparent)',
          transition: 'left 0.5s ease',
          pointerEvents: 'none'
        }} />
        
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="500" blockAlign="center">
            {/* Step Icon */}
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: step.completed 
                ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                : isNext 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : '#F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: step.completed || isNext ? '0 4px 20px rgba(0,0,0,0.15)' : 'none'
            }}>
              {step.completed ? (
                <div style={{ color: 'white', fontSize: '24px' }}>✅</div>
              ) : (
                <div style={{
                  color: isNext ? 'white' : '#6B7280',
                  fontSize: '20px'
                }}>
                  {step.icon}
                </div>
              )}
            </div>
            
            {/* Step Content */}
            <BlockStack gap="200">
              <InlineStack gap="300" blockAlign="center">
                <Text as="p" variant="headingMd" fontWeight="semibold">
                  {step.title}
                </Text>
                {step.priority === 'high' && (
                  <Badge tone="critical" size="small">🔥 High Priority</Badge>
                )}
              </InlineStack>
              <Text as="p" variant="bodyMd" tone="subdued">
                {step.description}
              </Text>
            </BlockStack>
          </InlineStack>
          
          {/* Status Indicator */}
          <div style={{
            padding: '12px 20px',
            borderRadius: '24px',
            background: step.completed 
              ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
              : isNext 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : '#F9FAFB',
            color: step.completed || isNext ? 'white' : '#6B7280',
            fontSize: '14px',
            fontWeight: '600',
            minWidth: '100px',
            textAlign: 'center',
            boxShadow: step.completed || isNext ? '0 4px 16px rgba(0,0,0,0.1)' : 'none'
          }}>
            {step.completed ? '✅ Complete' : isNext ? '👉 Start Now' : '⏳ Pending'}
          </div>
        </InlineStack>
      </div>
    </div>
  );
}

// --- ENHANCED SETUP GUIDE CARD ---
function SetupGuideCard({ guideSteps }: { guideSteps: GuideStep[] }) {
  const [openStep, setOpenStep] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const handleStepComplete = (stepId: string) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
  };

  return (
    <Card>
      <Box padding="600">
        <BlockStack gap="600">
          {/* Header */}
          <div style={{
            textAlign: 'center',
            padding: '32px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              width: '100px',
              height: '100px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              filter: 'blur(20px)'
            }} />
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '32px' }}>📋</div>
              <Text as="h3" variant="headingLg" fontWeight="bold">
                Shopify Setup Guide
              </Text>
            </div>
            <Text as="p" variant="bodyMd" alignment="center">
              Complete these Shopify configurations to enable COD
            </Text>
            <div style={{ 
              marginTop: '20px',
              fontSize: '16px',
              fontWeight: '600'
            }}>
              📊 {completedSteps.size} of {guideSteps.length} tasks completed
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ width: '100%' }}>
            <ProgressBar 
              progress={(completedSteps.size / guideSteps.length) * 100} 
              tone="success" 
              size="large"
            />
          </div>

          {/* Steps */}
          <BlockStack gap="300">
            {guideSteps.map((guideStep, index) => {
              const isCompleted = completedSteps.has(guideStep.id);
              const isOpen = openStep === guideStep.id;
              
              return (
                <div key={guideStep.id} style={{
                  border: `2px solid ${isCompleted ? '#10B981' : isOpen ? '#667eea' : '#E5E7EB'}`,
                  borderRadius: '16px',
                  background: isCompleted 
                    ? 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)' 
                    : isOpen 
                      ? 'linear-gradient(135deg, #F8FAFF 0%, #EEF2FF 100%)' 
                      : 'white',
                  transition: 'all 0.3s ease',
                  animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`
                }}>
                  <Box padding="500">
                    <div
                      onClick={() => setOpenStep(openStep === guideStep.id ? null : guideStep.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <InlineStack align="space-between" blockAlign="center">
                        <InlineStack gap="400" blockAlign="center">
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: isCompleted 
                              ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
                              : isOpen 
                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                                : '#E5E7EB',
                            color: isCompleted || isOpen ? 'white' : '#6B7280',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            flexShrink: 0,
                            boxShadow: isCompleted || isOpen ? '0 4px 16px rgba(0,0,0,0.1)' : 'none'
                          }}>
                            {isCompleted ? '✅' : index + 1}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Text as="p" variant="bodyLg" fontWeight="semibold">
                              {guideStep.title}
                            </Text>
                            <Text as="p" variant="bodyMd" tone="subdued">
                              {guideStep.description}
                            </Text>
                          </div>
                        </InlineStack>
                        <div style={{
                          transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s ease',
                          padding: '8px'
                        }}>
                          <Icon source={ChevronRightIcon} />
                        </div>
                      </InlineStack>
                    </div>
                    
                    <Collapsible
                      open={isOpen}
                      id={`guide-step-${guideStep.id}`}
                      transition={{duration: '300ms', timingFunction: 'ease-in-out'}}
                    >
                      <Box paddingBlockStart="500">
                        <div style={{
                          background: 'linear-gradient(135deg, #F8FAFC 0%, #EDF2F7 100%)',
                          padding: '20px',
                          borderRadius: '12px',
                          border: '2px solid #E2E8F0'
                        }}>
                          <List type="number">
                            {guideStep.steps.map((step, stepIndex) => (
                              <List.Item key={stepIndex}>
                                <Text as="p" variant="bodyMd">
                                  {step}
                                </Text>
                              </List.Item>
                            ))}
                          </List>
                          
                          {!isCompleted && (
                            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                              <Button
                                onClick={() => handleStepComplete(guideStep.id)}
                                variant="primary"
                                size="medium"
                              >
                                ✅ Mark as Complete
                              </Button>
                            </div>
                          )}
                        </div>
                      </Box>
                    </Collapsible>
                  </Box>
                </div>
              );
            })}
          </BlockStack>

          {/* Completion Celebration */}
          {completedSteps.size === guideSteps.length && (
            <div style={{
              textAlign: 'center',
              padding: '32px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
              color: 'white',
              animation: 'bounceIn 0.8s ease-out'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
              <Text as="p" variant="headingMd" fontWeight="bold">
                Shopify Setup Complete!
              </Text>
              <Text as="p" variant="bodyLg">
                Your store is ready to accept COD orders
              </Text>
            </div>
          )}
        </BlockStack>
      </Box>
    </Card>
  );
}

// --- ENHANCED DASHBOARD SECTION ---
function DashboardSection({ orders, hasOrders, onNavigate, stats, guideSteps, shopName }: {
  orders: RecentOrder[];
  hasOrders: boolean;
  onNavigate: (url: string) => void;
  stats: DashboardStats;
  guideSteps: GuideStep[];
  shopName: string;
}) {
  if (!hasOrders) {
    return (
      <Layout>
        <Layout.Section>
          <Card>
            <Box padding="800">
              <div style={{ position: 'relative', textAlign: 'center' }}>
                <div style={{
                  padding: '60px 40px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)',
                  border: '2px solid #BBF7D0',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    fontSize: '60px',
                    opacity: 0.1
                  }}>
                    🚀
                  </div>
                  
                  <BlockStack gap="600" inlineAlign="center">
                    <div style={{ fontSize: '80px', animation: 'bounceIn 1s ease-out' }}>
                      🎉
                    </div>
                    
                    <Text as="h2" variant="headingXl" fontWeight="bold">
                      Your COD Form is Ready!
                    </Text>
                    
                    <div style={{
                      background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
                      color: 'white',
                      padding: '24px 32px',
                      borderRadius: '16px',
                      maxWidth: '500px'
                    }}>
                      <Text as="p" variant="bodyLg" alignment="center">
                        🚀 Excellent! Your Cash on Delivery form is configured and ready to convert visitors into customers. Orders will appear here once customers start placing them.
                      </Text>
                    </div>
                    
                    <InlineStack gap="400" align="center">
                      <Button
                        onClick={() => onNavigate("/app/form-designer")}
                        variant="primary"
                        size="large"
                        icon={PaintBrushFlatIcon}
                      >
                        🎨 Customize Form
                      </Button>
                      <Button
                        onClick={() => onNavigate("/app/help")}
                        variant="secondary"
                        size="large"
                        icon={QuestionCircleIcon}
                      >
                        📖 View Guide
                      </Button>
                    </InlineStack>
                  </BlockStack>
                </div>
              </div>
            </Box>
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <BlockStack gap="500">
            <QuickStatsCard />
            <SetupGuideCard guideSteps={guideSteps} />
          </BlockStack>
        </Layout.Section>
      </Layout>
    );
  }

  return (
    <Layout>
      <Layout.Section>
        <RecentOrdersCard orders={orders} stats={stats} shopName={shopName} />
      </Layout.Section>
      <Layout.Section variant="oneThird">
        <BlockStack gap="500">
          <QuickStatsCard />
          <QuickActionsCard onNavigate={onNavigate} />
          <SetupGuideCard guideSteps={guideSteps} />
        </BlockStack>
      </Layout.Section>
    </Layout>
  );
}

// --- ENHANCED RECENT ORDERS CARD ---
function RecentOrdersCard({ orders, stats, shopName }: { 
  orders: RecentOrder[]; 
  stats: DashboardStats; 
  shopName: string; 
}) {
  return (
    <Card>
      <Box padding="600">
        <BlockStack gap="600">
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            padding: '24px',
            color: 'white'
          }}>
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="400" blockAlign="center">
                <div style={{ fontSize: '32px' }}>📦</div>
                <Text as="h2" variant="headingLg" fontWeight="bold">
                  Recent Orders
                </Text>
              </InlineStack>
              <div style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '16px',
                fontWeight: 'bold',
                backdropFilter: 'blur(10px)'
              }}>
                📊 <AnimatedCounter end={stats.totalOrders} suffix=" total" />
              </div>
            </InlineStack>
          </div>
          
          <BlockStack gap="300">
            {orders.map((order, index) => (
              <div
                key={order.id}
                style={{
                  opacity: 0,
                  animation: `slideInUp 0.6s ease-out ${index * 0.15}s forwards`
                }}
              >
                <Card>
                  <Box padding="500">
                    <div style={{
                      padding: '20px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #F8FAFC 0%, #EDF2F7 100%)',
                      border: '1px solid #E2E8F0'
                    }}>
                      <InlineStack align="space-between" blockAlign="center">
                        <InlineStack gap="500" blockAlign="center">
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px',
                            boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)'
                          }}>
                            📦
                          </div>
                          <BlockStack gap="200">
                            <InlineStack gap="300" blockAlign="center">
                              <Text as="p" variant="headingMd" fontWeight="semibold">
                                {order.orderNumber}
                              </Text>
                              <Badge tone="warning">⏳ Pending</Badge>
                            </InlineStack>
                            <Text as="p" variant="bodyMd" tone="subdued">
                              👤 {order.customerName} • 📅 {new Date(order.createdAt).toLocaleDateString()}
                            </Text>
                          </BlockStack>
                        </InlineStack>
                        <div style={{
                          textAlign: 'right',
                          padding: '12px 20px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                          color: 'white',
                          boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)'
                        }}>
                          <Text as="p" variant="headingMd" fontWeight="bold">
                            💰 DA <AnimatedCounter end={order.total} />
                          </Text>
                        </div>
                      </InlineStack>
                    </div>
                  </Box>
                </Card>
              </div>
            ))}
          </BlockStack>
          
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <Button
              url={`https://admin.shopify.com/store/${shopName}/orders`}
              target="_blank"
              variant="primary"
              size="large"
              icon={ExternalIcon}
            >
              View All Orders in Shopify
            </Button>
          </div>
        </BlockStack>
      </Box>
    </Card>
  );
}

// --- QUICK STATS CARD ---
function QuickStatsCard() {
  return (
    <Card>
      <Box padding="600">
        <BlockStack gap="500">
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            padding: '20px',
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📈</div>
            <Text as="h3" variant="headingMd" fontWeight="bold">
              Today's Performance
            </Text>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px'
          }}>
            <div style={{
              textAlign: 'center',
              padding: '20px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
              border: '2px solid #F59E0B'
            }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#D97706', marginBottom: '4px' }}>
                📦 <AnimatedCounter end={7} />
              </div>
              <Text as="p" variant="bodyMd" tone="subdued">Orders Today</Text>
            </div>
            
            <div style={{
              textAlign: 'center',
              padding: '20px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
              border: '2px solid #10B981'
            }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#059669', marginBottom: '4px' }}>
                🎯 <AnimatedCounter end={92} suffix="%" />
              </div>
              <Text as="p" variant="bodyMd" tone="subdued">Conversion Rate</Text>
            </div>
          </div>
        </BlockStack>
      </Box>
    </Card>
  );
}

// --- ENHANCED QUICK ACTIONS CARD ---
function QuickActionsCard({ onNavigate }: { onNavigate: (url: string) => void }) {
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  
  const actions = [
    { 
      title: "Customize Form", 
      url: "/app/form-designer", 
      emoji: "🎨",
      color: "#F59E0B",
      description: "Design your perfect COD form"
    },
    { 
      title: "Tracking Pixels", 
      url: "/app/pixels", 
      emoji: "📊",
      color: "#667eea",
      description: "Monitor marketing performance"
    },
    { 
      title: "General Settings", 
      url: "/app/general", 
      emoji: "⚙️",
      color: "#10B981",
      description: "Configure app preferences"
    },
  ];

  return (
    <Card>
      <Box padding="600">
        <BlockStack gap="500">
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            padding: '20px',
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🚀</div>
            <Text as="h3" variant="headingMd" fontWeight="bold">
              Quick Actions
            </Text>
          </div>
          
          <BlockStack gap="300">
            {actions.map((action, index) => (
              <div
                key={action.url}
                style={{
                  opacity: 0,
                  animation: `slideInUp 0.5s ease-out ${index * 0.1 + 0.3}s forwards`
                }}
                onMouseEnter={() => setHoveredAction(action.url)}
                onMouseLeave={() => setHoveredAction(null)}
              >
                <div
                  onClick={() => onNavigate(action.url)}
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    background: hoveredAction === action.url 
                      ? `linear-gradient(135deg, ${action.color}15 0%, ${action.color}25 100%)`
                      : 'linear-gradient(135deg, #F8FAFC 0%, #EDF2F7 100%)',
                    border: `2px solid ${hoveredAction === action.url ? action.color : '#E2E8F0'}`,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    transform: hoveredAction === action.url ? 'translateX(8px)' : 'translateX(0)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {hoveredAction === action.url && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '4px',
                      background: action.color,
                      borderRadius: '0 4px 4px 0'
                    }} />
                  )}
                  
                  <InlineStack gap="400" blockAlign="center">
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: `${action.color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px'
                    }}>
                      {action.emoji}
                    </div>
                    <BlockStack gap="100">
                      <Text as="p" variant="bodyLg" fontWeight="semibold">
                        {action.title}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {action.description}
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </div>
              </div>
            ))}
          </BlockStack>
        </BlockStack>
      </Box>
    </Card>
  );
}