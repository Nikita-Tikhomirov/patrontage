import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPaymentPageFragmentHtml,
  buildPaymentPageHtml,
  normalizeAmountToKopecks,
  validatePaymentForm,
  wrapPaymentPageWithSiteChrome,
} from '../tools/payment-page.mjs';
import { extractSiteChrome } from '../tools/build-payment-page-from-site.mjs';

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

test('renders site-integrated fragment without standalone document wrapper', () => {
  const html = buildPaymentPageFragmentHtml({ demoBlocked: true });

  assert.doesNotMatch(html, /<!doctype/i);
  assert.doesNotMatch(html, /<body/i);
  assert.doesNotMatch(html, /<h1/i);
  assert.match(html, /#E52F42/i);
  assert.match(html, /payment-page/);
});

test('wraps payment fragment with rendered site chrome', () => {
  const html = wrapPaymentPageWithSiteChrome({
    footerHtml: '<footer class="footer">Footer</footer>',
    headAssetsHtml: '<link rel="stylesheet" href="/site.css">',
    headerHtml: '<header class="header">Header</header>',
    paymentHtml: buildPaymentPageFragmentHtml(),
  });

  assert.match(html, /<header class="header">Header<\/header>/);
  assert.match(html, /data-tochka-payment-demo/);
  assert.match(html, /<footer class="footer">Footer<\/footer>/);
  assert.match(html, /<title>Оплата<\/title>/);
  assert.doesNotMatch(html, /eyJhbGci/);
});

test('extracts rendered site chrome from source html', () => {
  const chrome = extractSiteChrome(`<!doctype html>
<html>
<head>
  <link rel="stylesheet" href="/assets/site.css">
  <link rel="icon" href="/favicon.png">
</head>
<body>
  <header class="header"><button class="header__burger">Menu</button></header>
  <script>document.querySelector('.header__burger')</script>
  <main>Home</main>
  <style>.footer { color: #fff; }</style>
  <footer class="footer">Footer</footer>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
  <script src="/assets/components/ajaxform/js/default.js"></script>
  <script src="/assets/components/modxminify/cache/scripts-2-1682162308.min.js"></script>
</body>
</html>`);

  assert.match(chrome.headerHtml, /header__burger/);
  assert.match(chrome.footerHtml, /\.footer/);
  assert.match(chrome.headAssetsHtml, /site\.css/);
  assert.match(chrome.bodyScriptsHtml, /ajaxform\/js\/default\.js/);
  assert.match(chrome.bodyScriptsHtml, /jquery/);
  assert.match(chrome.bodyScriptsHtml, /modxminify/);
  assert.ok(chrome.bodyScriptsHtml.indexOf('jquery') < chrome.bodyScriptsHtml.indexOf('ajaxform/js/default.js'));
  assert.ok(chrome.bodyScriptsHtml.indexOf('ajaxform/js/default.js') < chrome.bodyScriptsHtml.indexOf('modxminify'));
});
