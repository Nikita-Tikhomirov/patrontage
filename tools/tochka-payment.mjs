export function validateTochkaPaymentConfig(config = {}) {
  const requiredKeys = ['jwt', 'customerCode', 'merchantId'];
  const missing = requiredKeys.filter((key) => !String(config[key] ?? '').trim());

  return {
    missing,
    ok: missing.length === 0,
  };
}

function formatAmountRub(value) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(',', '.');

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error('Invalid amount.');
  }

  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Invalid amount.');
  }

  return amount.toFixed(2);
}

function normalizePhone(value) {
  const digits = String(value ?? '').replace(/\D+/g, '');

  if (digits.length === 11 && digits.startsWith('8')) {
    return `+7${digits.slice(1)}`;
  }

  if (digits.length === 11 && digits.startsWith('7')) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+7${digits}`;
  }

  return String(value ?? '').trim();
}

export function buildTochkaReceiptPayload(formData = {}, config = {}) {
  const amount = formatAmountRub(formData.amount);
  const serviceName = String(config.serviceName || 'Услуга по подбору персонала').trim();
  const paymentLinkId = String(formData.paymentLinkId || '').trim();
  const payload = {
    amount,
    Client: {
      email: String(formData.email ?? '').trim(),
      name: String(formData.fullName ?? '').trim(),
      phone: normalizePhone(formData.phone),
    },
    customerCode: String(config.customerCode ?? '').trim(),
    Items: [{
      amount,
      measure: String(config.measure || 'шт.').trim(),
      name: serviceName,
      paymentMethod: String(config.paymentMethod || 'full_payment').trim(),
      paymentObject: String(config.paymentObject || 'service').trim(),
      quantity: Number(config.quantity || 1),
      vatType: String(config.vatType || 'none').trim(),
    }],
    merchantId: String(config.merchantId ?? '').trim(),
    paymentMode: ['card', 'sbp'],
    preAuthorization: false,
    purpose: String(config.purpose || 'Оплата услуги по подбору персонала').trim(),
    redirectUrl: String(config.redirectUrl ?? '').trim(),
    failRedirectUrl: String(config.failRedirectUrl ?? '').trim(),
    taxSystemCode: String(config.taxSystemCode || 'usn_income_outcome').trim(),
  };

  if (paymentLinkId) {
    payload.paymentLinkId = paymentLinkId;
  }

  return {
    Data: payload,
  };
}

export function extractTochkaPaymentLink(response = {}) {
  return response?.Data?.paymentLink
    || response?.data?.paymentLink
    || response?.paymentLink
    || '';
}
