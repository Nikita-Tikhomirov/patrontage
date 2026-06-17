import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPaymentPageHtml,
  normalizeAmountToKopecks,
  validatePaymentForm,
} from '../tools/payment-page.mjs';

test('normalizes ruble amounts to kopecks', () => {
  assert.equal(normalizeAmountToKopecks('1'), 100);
  assert.equal(normalizeAmountToKopecks('1250,50'), 125050);
});

test('rejects invalid demo payment form data before API call', () => {
  const result = validatePaymentForm({
    fullName: '',
    phone: '123',
    email: 'bad',
    amount: '0',
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.fullName, /ФИО/);
  assert.match(result.errors.phone, /телефон/);
  assert.match(result.errors.email, /email/i);
  assert.match(result.errors.amount, /сумм/);
});

test('renders card and SBP payment modes and merchant blocker', () => {
  const html = buildPaymentPageHtml({ demoBlocked: true });

  assert.match(html, /Оплата/);
  assert.match(html, /Банковская карта/);
  assert.match(html, /СБП/);
  assert.match(html, /merchantId/);
  assert.doesNotMatch(html, /eyJhbGci/);
});
