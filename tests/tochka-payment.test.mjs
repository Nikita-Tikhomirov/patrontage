import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTochkaReceiptPayload,
  extractTochkaPaymentLink,
  validateTochkaPaymentConfig,
} from '../tools/tochka-payment.mjs';

test('builds Tochka payment-with-receipt payload for card and SBP', () => {
  const payload = buildTochkaReceiptPayload({
    amount: '1000',
    email: 'client@example.ru',
    fullName: 'Иванов Иван Иванович',
    paymentLinkId: 'patronage-123',
    phone: '+7 900 111-22-33',
  }, {
    customerCode: 'customer-code',
    failRedirectUrl: 'https://patronage-service.ru/oplata?payment=fail',
    merchantId: '123456789012345',
    redirectUrl: 'https://patronage-service.ru/oplata?payment=success',
    serviceName: 'Услуга по подбору персонала',
    taxSystemCode: 'usn_income_outcome',
    vatType: 'none',
  });

  assert.ok(payload.Data);
  assert.equal(payload.Data.amount, '1000.00');
  assert.equal(payload.Data.customerCode, 'customer-code');
  assert.equal(payload.Data.merchantId, '123456789012345');
  assert.equal(payload.Data.purpose, 'Оплата услуги по подбору персонала');
  assert.deepEqual(payload.Data.paymentMode, ['card', 'sbp']);
  assert.equal(payload.Data.paymentLinkId, 'patronage-123');
  assert.equal(payload.Data.taxSystemCode, 'usn_income_outcome');
  assert.deepEqual(payload.Data.Client, {
    email: 'client@example.ru',
    name: 'Иванов Иван Иванович',
    phone: '+79001112233',
  });
  assert.deepEqual(payload.Data.Items, [{
    amount: '1000.00',
    measure: 'шт.',
    name: 'Услуга по подбору персонала',
    paymentMethod: 'full_payment',
    paymentObject: 'service',
    quantity: 1,
    vatType: 'none',
  }]);
});

test('reports missing Tochka configuration without exposing secrets', () => {
  const result = validateTochkaPaymentConfig({
    customerCode: '',
    jwt: '',
    merchantId: '',
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, ['jwt', 'customerCode', 'merchantId']);
});

test('extracts payment link from supported Tochka response shapes', () => {
  assert.equal(extractTochkaPaymentLink({
    Data: {
      operationId: 'operation-1',
      paymentLink: 'https://pay.tochka.com/one',
    },
  }), 'https://pay.tochka.com/one');

  assert.equal(extractTochkaPaymentLink({
    data: {
      paymentLink: 'https://pay.tochka.com/two',
    },
  }), 'https://pay.tochka.com/two');
});
