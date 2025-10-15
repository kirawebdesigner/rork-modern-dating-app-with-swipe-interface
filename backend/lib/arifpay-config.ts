import 'dotenv/config';

export const ARIFPAY_CONFIG = {
  apiKey: process.env.ARIFPAY_API_KEY || '',
  packageName: process.env.ARIFPAY_PACKAGE_NAME || 'app.rork.modern-dating-app-swipe',
  merchantId: process.env.ARIFPAY_MERCHANT_ID || '',
  sandboxMode: process.env.ARIFPAY_SANDBOX === 'true',
};

export function validateArifpayConfig() {
  if (!ARIFPAY_CONFIG.apiKey) {
    console.warn('[Arifpay] API key not configured. Set ARIFPAY_API_KEY environment variable.');
    return false;
  }
  if (!ARIFPAY_CONFIG.merchantId) {
    console.warn('[Arifpay] Merchant ID not configured. Set ARIFPAY_MERCHANT_ID environment variable.');
    return false;
  }
  return true;
}

console.log('[Arifpay] Configuration loaded', {
  sandboxMode: ARIFPAY_CONFIG.sandboxMode,
  hasApiKey: !!ARIFPAY_CONFIG.apiKey,
  hasMerchantId: !!ARIFPAY_CONFIG.merchantId,
});
