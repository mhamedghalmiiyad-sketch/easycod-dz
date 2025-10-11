import db from "../db.server";
interface RiskFactors {
  customerIp: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    address1: string;
    city: string;
    province: string;
    zip: string;
    country: string;
  };
  orderValue: number;
  itemCount: number;
}

interface RiskScore {
  score: number; // 0-100, higher = more risky
  factors: string[];
  recommendation: 'approve' | 'review' | 'reject';
}

export async function calculateRiskScore(
  factors: RiskFactors,
  shopId: string
): Promise<RiskScore> {
  let score = 0;
  const riskFactors: string[] = [];

  // 1. Check order history from same IP/email/phone
  const recentOrders = await db.orderTracking.findMany({
    where: {
      shopId,
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
      OR: [
        { customerIp: factors.customerIp },
        { customerEmail: factors.customerEmail },
        { customerPhone: factors.customerPhone },
      ],
    },
  });

  // Multiple orders from same source in short time
  if (recentOrders.length > 3) {
    score += 30;
    riskFactors.push('Multiple recent orders from same source');
  }

  // 2. Address quality checks
  const addressRisk = assessAddressQuality(factors.shippingAddress);
  score += addressRisk.score;
  riskFactors.push(...addressRisk.factors);

  // 3. Order value analysis
  if (factors.orderValue > 5000) { // High value orders
    score += 20;
    riskFactors.push('High order value');
  }

  // 4. Email domain analysis
  const emailDomain = factors.customerEmail.split('@')[1]?.toLowerCase();
  const suspiciousDomains = ['10minutemail.com', 'tempmail.org', 'guerrillamail.com'];
  if (suspiciousDomains.includes(emailDomain)) {
    score += 40;
    riskFactors.push('Temporary email domain');
  }

  // 5. Check against previous RTO history
  const rtoHistory = await checkRTOHistory(factors, shopId);
  score += rtoHistory.score;
  riskFactors.push(...rtoHistory.factors);

  // Determine recommendation
  let recommendation: 'approve' | 'review' | 'reject';
  if (score >= 70) recommendation = 'reject';
  else if (score >= 40) recommendation = 'review';
  else recommendation = 'approve';

  return { score, factors: riskFactors, recommendation };
}

function assessAddressQuality(address: RiskFactors['shippingAddress']) {
  let score = 0;
  const factors: string[] = [];

  // Check for incomplete address
  if (!address.address1 || address.address1.length < 5) {
    score += 25;
    factors.push('Incomplete or very short address');
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /^test/i,
    /^fake/i,
    /^(123|000)/,
    /(.)\1{4,}/, // Repeated characters
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(address.address1))) {
    score += 35;
    factors.push('Suspicious address pattern');
  }

  // Check for mismatched city/province
  // You can implement region validation logic here

  return { score, factors };
}

async function checkRTOHistory(factors: RiskFactors, shopId: string) {
  let score = 0;
  const riskFactors: string[] = [];

  // Check if this customer had RTOs before
  // This would require you to track RTO data in your database
  const rtoRecords = await db.orderTracking.findMany({
    where: {
      shopId,
      OR: [
        { customerEmail: factors.customerEmail },
        { customerPhone: factors.customerPhone },
      ],
      // Add RTO status field to your schema if needed
      // orderStatus: 'RTO'
    },
  });

  if (rtoRecords.length > 0) {
    score += 50;
    riskFactors.push('Previous RTO history');
  }

  return { score, factors: riskFactors };
}