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

function CustomIcon({ src, alt, size = 24 }: { src: string; alt: string; size?: number }) {
  return (
    <div style={{ 
      width: size, 
      height: size, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      position: 'relative'
    }}>
      <img
        src={src}
        alt={alt}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
        }}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling && (e.currentTarget.nextElementSibling as HTMLElement).style.display == 'flex';
        }}
      />
      <div style={{ display: 'none', alignItems: 'center', justifyContent: 'center' }}>
        <Icon source={PlusCircleIcon} />
      </div>
    </div>
  );
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
      opacity: 0.1
    }}>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 4,
            height: 4,
            backgroundColor: '#00A652',
            borderRadius: '50%',
            left: `${20 + i * 20}%`,
            animation: `float 3s ease-in-out infinite ${i * 0.5}s`,
          }}
        />
      ))}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
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
      icon: "https://cdn-icons-png.flaticon.com/512/3815/3815452.png",
    },
    {
      id: "configure_pixels",
      title: "Setup Tracking Pixels",
      description: "Add marketing pixels to track performance",
      url: "/app/pixels",
      completed: isPixelsConfigured(shopSettings?.pixelSettings || null),
      priority: "medium",
      icon: "https://cdn-icons-png.flaticon.com/512/5916/5916612.png",
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
      <div style={{ position: 'relative' }}>
        <FloatingParticles />
        <BlockStack gap="600">
          {/* Enhanced Header */}
          <Card>
            <Box padding="600">
              <div style={{
                background: 'linear-gradient(135deg, #00A652 0%, #00D4AA 100%)',
                borderRadius: '12px',
                padding: '24px',
                color: 'white',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '100px',
                  height: '100px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%',
                  transform: 'translate(30px, -30px)'
                }} />
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="400" blockAlign="center">
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      fontWeight: 'bold',
                      animation: isAnimating ? 'pulse 2s infinite' : 'none'
                    }}>
                      {shopName.charAt(0).toUpperCase()}
                    </div>
                    <BlockStack gap="200">
                      <div style={{ 
                        fontSize: '28px', 
                        fontWeight: 'bold',
                        textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        Welcome back, {shopName}! 🚀
                      </div>
                      <div style={{ 
                        fontSize: '16px',
                        opacity: 0.9
                      }}>
                        {isSetupComplete 
                          ? hasOrders 
                            ? (
                              <>
                                <AnimatedCounter end={stats.pendingOrders || 0} suffix=" pending orders" /> • 
                                <AnimatedCounter end={stats.totalRevenue} prefix="DA " suffix=" total revenue" />
                              </>
                            )
                            : "Your COD form is ready to receive orders! 🎉"
                          : "Let's complete your setup to start receiving orders"}
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

          {/* Setup Complete Badge */}
          {isSetupComplete && (
            <Card>
              <Box padding="400">
                <div style={{
                  background: 'linear-gradient(90deg, #FFD700 0%, #FFA500 100%)',
                  borderRadius: '12px',
                  padding: '16px 24px',
                  textAlign: 'center',
                  animation: 'shine 2s infinite'
                }}>
                  <InlineStack gap="300" align="center" blockAlign="center">
                    <Icon source={CheckIcon} />
                    <Text as="p" variant="bodyLg" fontWeight="bold">
                      🎊 Congratulations! Your COD setup is 100% complete!
                    </Text>
                    <Icon source={StarIcon} />
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
            
            @keyframes shine {
              0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.3); }
              50% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.6); }
            }
            
            @keyframes slideInUp {
              from { transform: translateY(30px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            
            @keyframes bounceIn {
              0% { transform: scale(0.3); opacity: 0; }
              50% { transform: scale(1.05); opacity: 0.8; }
              70% { transform: scale(0.9); opacity: 0.9; }
              100% { transform: scale(1); opacity: 1; }
            }
            
            @keyframes fadeInScale {
              0% { opacity: 0; transform: scale(0.8); }
              100% { opacity: 1; transform: scale(1); }
            }
          `
        }} />
      </div>
    </Page>
  );
}

// --- ENHANCED SETUP SECTION ---
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
    }, 200);
    
    return () => clearInterval(timer);
  }, [setupSteps.length]);
  
  return (
    <Card>
      <Box padding={{ xs: "600", md: "800" }}>
        <BlockStack gap="600" inlineAlign="center">
          {/* Clean Progress Header */}
          <Box maxWidth="500px" width="100%">
            <div style={{
              textAlign: 'center',
              padding: '32px 24px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
              border: '2px solid #E2E8F0'
            }}>
              <BlockStack gap="400" inlineAlign="center">
                <InlineStack gap="300" blockAlign="center">
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '20px'
                  }}>
                    ⚙️
                  </div>
                  <Text as="h2" variant="headingXl" alignment="center">
                    Complete Your Setup
                  </Text>
                </InlineStack>
                
                <div style={{ 
                  fontSize: '40px', 
                  fontWeight: 'bold',
                  color: '#6366F1'
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

          {/* Clean Setup Steps */}
          <Box maxWidth="600px" width="100%">
            <BlockStack gap="300">
              {setupSteps.map((step, index) => (
                <div
                  key={step.id}
                  style={{
                    opacity: index < visibleSteps ? 1 : 0,
                    transform: index < visibleSteps ? 'translateY(0)' : 'translateY(20px)',
                    transition: 'all 0.4s ease-out',
                    transitionDelay: `${index * 0.1}s`
                  }}
                >
                  <CleanSetupStepCard 
                    step={step}
                    stepNumber={index + 1}
                    isNext={step.id === nextStep?.id}
                    onClick={() => onStepClick(step.url)}
                  />
                </div>
              ))}
            </BlockStack>
          </Box>

          {/* Next Action */}
          {nextStep && (
            <div style={{ animation: 'fadeInScale 0.6s ease-out 0.8s both' }}>
              <Button 
                onClick={() => onStepClick(nextStep.url)}
                variant="primary"
                size="large"
                icon={PlusCircleIcon}
              >
                {nextStep.title}
              </Button>
            </div>
          )}
        </BlockStack>
      </Box>
    </Card>
  );
}

// --- CLEAN SETUP STEP CARD ---
function CleanSetupStepCard({ step, stepNumber, isNext, onClick }: {
  step: SetupStep;
  stepNumber: number;
  isNext: boolean;
  onClick: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      style={{
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.2s ease',
        boxShadow: isHovered ? '0 4px 20px rgba(0, 0, 0, 0.08)' : 'none'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        onClick={onClick}
        style={{
          padding: '20px',
          borderRadius: '12px',
          border: step.completed 
            ? '2px solid #10B981' 
            : isNext 
              ? '2px solid #6366F1'
              : '2px solid #E5E7EB',
          background: step.completed 
            ? '#F0FDF4' 
            : isNext 
              ? '#F8FAFF'
              : 'white',
          cursor: 'pointer',
          position: 'relative'
        }}
      >
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="400" blockAlign="center">
            {/* Step Icon */}
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: step.completed 
                ? '#10B981'
                : isNext 
                  ? '#6366F1'
                  : '#E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {step.completed ? (
                <div style={{ color: 'white', fontSize: '20px' }}>✓</div>
              ) : (
                <div style={{
                  color: isNext ? 'white' : '#6B7280',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}>
                  {stepNumber}
                </div>
              )}
            </div>
            
            {/* Step Content */}
            <BlockStack gap="100">
              <InlineStack gap="200" blockAlign="center">
                <Text as="p" variant="bodyLg" fontWeight="semibold">
                  {step.title}
                </Text>
                {step.priority === 'high' && (
                  <Badge tone="critical" size="small">High Priority</Badge>
                )}
              </InlineStack>
              <Text as="p" variant="bodyMd" tone="subdued">
                {step.description}
              </Text>
            </BlockStack>
          </InlineStack>
          
          {/* Status Badge */}
          <div style={{
            padding: '8px 16px',
            borderRadius: '20px',
            background: step.completed 
              ? '#10B981'
              : isNext 
                ? '#6366F1'
                : '#F3F4F6',
            color: step.completed || isNext ? 'white' : '#6B7280',
            fontSize: '12px',
            fontWeight: '600',
            minWidth: '80px',
            textAlign: 'center'
          }}>
            {step.completed ? 'Complete' : isNext ? 'Next' : 'Pending'}
          </div>
        </InlineStack>
      </div>
    </div>
  );
}: 'center'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {step.completed ? (
                    <>
                      <span>✅ Complete</span>
                    </>
                  ) : isNext ? (
                    <>
                      <span>➡️ Next Up</span>
                    </>
                  ) : (
                    <>
                      <span>⏳ Pending</span>
                    </>
                  )}
                </div>
              </div>
            </InlineStack>
          </div>
        </Box>
      </Card>
    </div>
  );
}

// --- SETUP GUIDE CARD ---
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
            padding: '24px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            color: 'white'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <div style={{ fontSize: '24px' }}>📋</div>
              <Text as="h3" variant="headingMd" fontWeight="bold">
                Setup Guide
              </Text>
            </div>
            <Text as="p" variant="bodyMd" alignment="center">
              Follow these steps to complete your Shopify setup
            </Text>
            <div style={{ 
              marginTop: '16px',
              fontSize: '14px',
              opacity: 0.9
            }}>
              {completedSteps.size} of {guideSteps.length} tasks completed
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ width: '100%' }}>
            <ProgressBar 
              progress={(completedSteps.size / guideSteps.length) * 100} 
              tone="success" 
              size="medium"
            />
          </div>

          {/* Steps */}
          <BlockStack gap="200">
            {guideSteps.map((guideStep, index) => {
              const isCompleted = completedSteps.has(guideStep.id);
              const isOpen = openStep === guideStep.id;
              
              return (
                <div key={guideStep.id} style={{
                  border: `2px solid ${isCompleted ? '#00A652' : isOpen ? '#6366F1' : '#E5E7EB'}`,
                  borderRadius: '12px',
                  background: isCompleted ? '#F0FDF4' : isOpen ? '#F8FAFF' : 'white',
                  transition: 'all 0.2s ease'
                }}>
                  <Box padding="400">
                    <div
                      onClick={() => setOpenStep(openStep === guideStep.id ? null : guideStep.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <InlineStack align="space-between" blockAlign="center">
                        <InlineStack gap="300" blockAlign="center">
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: isCompleted 
                              ? '#00A652' 
                              : isOpen 
                                ? '#6366F1' 
                                : '#E5E7EB',
                            color: isCompleted || isOpen ? 'white' : '#6B7280',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            flexShrink: 0
                          }}>
                            {isCompleted ? '✓' : index + 1}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Text as="p" variant="bodyMd" fontWeight="semibold">
                              {guideStep.title}
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              {guideStep.description}
                            </Text>
                          </div>
                        </InlineStack>
                        <div style={{
                          transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease'
                        }}>
                          <Icon source={ChevronRightIcon} />
                        </div>
                      </InlineStack>
                    </div>
                    
                    <Collapsible
                      open={isOpen}
                      id={`guide-step-${guideStep.id}`}
                      transition={{duration: '200ms', timingFunction: 'ease-in-out'}}
                    >
                      <Box paddingBlockStart="400">
                        <div style={{
                          background: '#F8FAFC',
                          padding: '16px',
                          borderRadius: '8px',
                          border: '1px solid #E2E8F0'
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
                            <div style={{ marginTop: '16px', textAlign: 'center' }}>
                              <Button
                                onClick={() => handleStepComplete(guideStep.id)}
                                variant="primary"
                                size="slim"
                              >
                                Mark as Complete
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

          {/* Completion Status */}
          {completedSteps.size === guideSteps.length && (
            <div style={{
              textAlign: 'center',
              padding: '20px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: 'white',
              animation: 'bounceIn 0.6s ease-out'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
              <Text as="p" variant="bodyLg" fontWeight="bold">
                Setup Complete!
              </Text>
              <Text as="p" variant="bodyMd">
                Your Shopify store is ready for COD orders
              </Text>
            </div>
          )}
        </BlockStack>
      </Box>
    </Card>
  );
}

// --- ENHANCED DASHBOARD SECTION ---
function DashboardSection({ orders, hasOrders, onNavigate, stats, guideSteps }: {
  orders: RecentOrder[];
  hasOrders: boolean;
  onNavigate: (url: string) => void;
  stats: DashboardStats;
  guideSteps: GuideStep[];
}) {
  if (!hasOrders) {
    return (
      <Layout>
        <Layout.Section>
          <Card>
            <Box padding="800">
              <div style={{ position: 'relative' }}>
                <EmptyState
                  heading="🎉 Your COD form is ready!"
                  action={{
                    content: "🎨 Customize Form",
                    icon: PaintBrushFlatIcon,
                    onAction: () => onNavigate("/app/form-designer")
                  }}
                  secondaryAction={{
                    content: "❓ View Help",
                    icon: QuestionCircleIcon,
                    onAction: () => onNavigate("/app/help")
                  }}
                  image="https://cdn.shopify.com/s/files/1/0262/4074/files/empty-state.svg"
                >
                  <div style={{
                    background: 'linear-gradient(135deg, #f8f9ff 0%, #e8f5e8 100%)',
                    padding: '24px',
                    borderRadius: '16px',
                    margin: '20px 0'
                  }}>
                    <Text as="p" variant="bodyLg" alignment="center">
                      🚀 Excellent work! Your Cash on Delivery form is configured and ready to convert visitors into customers.
                      Orders will appear here once customers start placing them.
                    </Text>
                  </div>
                </EmptyState>
              </div>
            </Box>
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <SetupGuideCard guideSteps={guideSteps} />
        </Layout.Section>
      </Layout>
    );
  }

  return (
    <Layout>
      <Layout.Section>
        <RecentOrdersCard orders={orders} stats={stats} />
      </Layout.Section>
      <Layout.Section variant="oneThird">
        <BlockStack gap="400">
          <QuickActionsCard onNavigate={onNavigate} />
          <SetupGuideCard guideSteps={guideSteps} />
        </BlockStack>
      </Layout.Section>
    </Layout>
  );
}

// --- ENHANCED RECENT ORDERS CARD ---
function RecentOrdersCard({ orders, stats }: { orders: RecentOrder[]; stats: DashboardStats }) {
  return (
    <Card>
      <Box padding="600">
        <BlockStack gap="500">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h2" variant="headingLg" fontWeight="semibold">
              📦 Recent Orders
            </Text>
            <div style={{
              background: 'linear-gradient(135deg, #00A652 0%, #00D4AA 100%)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              <AnimatedCounter end={stats.totalOrders} suffix=" total" />
            </div>
          </InlineStack>
          
          <BlockStack gap="300">
            {orders.map((order, index) => (
              <div
                key={order.id}
                style={{
                  opacity: 0,
                  animation: `slideInUp 0.5s ease-out ${index * 0.1}s forwards`
                }}
              >
                <Card>
                  <Box padding="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="400" blockAlign="center">
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px'
                        }}>
                          📦
                        </div>
                        <BlockStack gap="200">
                          <InlineStack gap="300" blockAlign="center">
                            <Text as="p" variant="bodyLg" fontWeight="semibold">
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
                        padding: '8px 16px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #00A652 0%, #00D4AA 100%)',
                        color: 'white'
                      }}>
                        <Text as="p" variant="headingMd" fontWeight="bold">
                          💰 DA <AnimatedCounter end={order.total} />
                        </Text>
                      </div>
                    </InlineStack>
                  </Box>
                </Card>
              </div>
            ))}
          </BlockStack>
        </BlockStack>
      </Box>
    </Card>
  );
}

// --- SIMPLIFIED QUICK ACTIONS CARD ---
function QuickActionsCard({ onNavigate }: { onNavigate: (url: string) => void }) {
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  
  const actions = [
    { 
      title: "Customize Form", 
      url: "/app/form-designer", 
      icon: PaintBrushFlatIcon,
      emoji: "🎨",
      color: "#FF6B6B",
      description: "Design your perfect COD form"
    },
    { 
      title: "Tracking Pixels", 
      url: "/app/pixels", 
      icon: MarketsIcon,
      emoji: "📊",
      color: "#45B7D1",
      description: "Monitor marketing performance"
    },
    { 
      title: "General Settings", 
      url: "/app/general", 
      icon: SettingsIcon,
      emoji: "⚙️",
      color: "#96CEB4",
      description: "Configure app preferences"
    },
  ];

  return (
    <BlockStack gap="400">
      {/* Stats Overview */}
      <Card>
        <Box padding="600">
          <BlockStack gap="400">
            <Text as="h3" variant="headingLg" fontWeight="semibold">
              📈 Quick Stats
            </Text>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px'
            }}>
              <div style={{
                textAlign: 'center',
                padding: '16px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #FFE5E5 0%, #FFD1D1 100%)'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF4757' }}>
                  📦 5
                </div>
                <Text as="p" variant="bodyMd" tone="subdued">Orders Today</Text>
              </div>
              <div style={{
                textAlign: 'center',
                padding: '16px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #E8F5E8 0%, #D1F2D1 100%)'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00A652' }}>
                  🎯 87%
                </div>
                <Text as="p" variant="bodyMd" tone="subdued">Conversion</Text>
              </div>
            </div>
          </BlockStack>
        </Box>
      </Card>

      {/* Quick Actions */}
      <Card>
        <Box padding="600">
          <BlockStack gap="500">
            <Text as="h3" variant="headingLg" fontWeight="semibold">
              🚀 Quick Actions
            </Text>
            <BlockStack gap="300">
              {actions.map((action, index) => (
                <div
                  key={action.url}
                  style={{
                    opacity: 0,
                    animation: `slideInUp 0.5s ease-out ${index * 0.1 + 0.5}s forwards`
                  }}
                  onMouseEnter={() => setHoveredAction(action.url)}
                  onMouseLeave={() => setHoveredAction(null)}
                >
                  <div
                    onClick={() => onNavigate(action.url)}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: `2px solid ${action.color}20`,
                      background: hoveredAction === action.url 
                        ? `linear-gradient(135deg, ${action.color}10 0%, ${action.color}20 100%)`
                        : 'transparent',
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
                    
                    <InlineStack gap="300" blockAlign="center">
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: `${action.color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px'
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

      {/* Help Section */}
      <Card>
        <Box padding="600">
          <div style={{
            textAlign: 'center',
            padding: '20px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎯</div>
            <Text as="h4" variant="headingMd" fontWeight="bold">
              Need Help?
            </Text>
            <Text as="p" variant="bodyMd" alignment="center">
              Our support team is here to help you succeed
            </Text>
            <div style={{ marginTop: '16px' }}>
              <Button
                onClick={() => onNavigate("/app/help")}
                variant="primary"
                size="slim"
              >
                💬 Get Support
              </Button>
            </div>
          </div>
        </Box>
      </Card>
    </BlockStack>
  );
}