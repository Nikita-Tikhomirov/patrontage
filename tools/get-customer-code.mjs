/**
 * Fetch the correct customerCode for internet-acquiring payments.
 *
 * The support team confirmed: the customerCode passed to the payment-with-receipt
 * endpoint must be the one returned by Get Customers List for customerType "Business".
 *
 * Usage:
 *   node tools/get-customer-code.mjs
 *
 * The script reads the JWT from the TOCHKA_JWT environment variable.
 * Pass it explicitly when the env var is not set:
 *
 *   TOCHKA_JWT="eyJ..." node tools/get-customer-code.mjs
 *
 * The API endpoint is documented at:
 *   https://developers.tochka.com/docs/tochka-api/api/get-customers-list-open-banking-v-1-0-customers-get
 */

const API_BASE = process.env.TOCHKA_API_BASE || 'https://enter.tochka.com/uapi';
const JWT = (process.env.TOCHKA_JWT || '').trim();

if (!JWT) {
  console.error('TOCHKA_JWT is not set. Export it or pass it inline:');
  console.error('  TOCHKA_JWT="eyJ..." node tools/get-customer-code.mjs');
  process.exit(1);
}

const url = `${API_BASE}/open-banking/v1.0/customers`;

try {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${JWT}`,
      Accept: 'application/json',
    },
  });

  const body = await response.text();

  if (!response.ok) {
    console.error(`API returned HTTP ${response.status}:`);
    console.error(body.slice(0, 2000));
    process.exit(1);
  }

  let data;

  try {
    data = JSON.parse(body);
  } catch {
    console.error('API returned non-JSON response:');
    console.error(body.slice(0, 2000));
    process.exit(1);
  }

  // The API wraps responses in a "Data" envelope.
  const customers = data?.Data ?? data?.data ?? data;

  if (!Array.isArray(customers)) {
    console.error('Unexpected response shape. Expected an array of customers.');
    console.error('Response keys:', Object.keys(data).join(', '));
    console.error(JSON.stringify(data, null, 2).slice(0, 2000));
    process.exit(1);
  }

  if (customers.length === 0) {
    console.error('No customers found. Check that the JWT has access to Open Banking API.');
    process.exit(1);
  }

  const business = customers.filter(
    (c) => c?.customerType === 'Business',
  );

  if (business.length === 0) {
    console.error('No Business-type customer found. Available customer types:');
    for (const c of customers) {
      console.error(`  - customerCode: ${c?.customerCode ?? '?'}  customerType: ${c?.customerType ?? '?'}`);
    }
    process.exit(1);
  }

  if (business.length > 1) {
    console.error('Multiple Business-type customers found. Listing all:');
    for (const c of business) {
      console.error(`  - customerCode: ${c?.customerCode ?? '?'}  name: ${c?.name ?? c?.customerName ?? '?'}`);
    }
    console.error('\nUse the customerCode that corresponds to your active merchant account.');
    process.exit(1);
  }

  const target = business[0];
  const customerCode = target?.customerCode ?? '';

  if (!customerCode) {
    console.error('Business customer found but customerCode field is empty.');
    console.error(JSON.stringify(target, null, 2));
    process.exit(1);
  }

  console.log(customerCode);
  console.error(`Name: ${target?.name ?? target?.customerName ?? '-'}`);
  console.error(`customerType: ${target?.customerType}`);
  console.error(`customerCode: ${customerCode}`);

  process.exit(0);
} catch (err) {
  if (err?.code === 'ENOTFOUND' || err?.cause?.code === 'ENOTFOUND') {
    console.error('Network error: cannot reach the Tochka API. Check your connection.');
    process.exit(1);
  }

  console.error('Unexpected error:', err?.message ?? err);
  process.exit(1);
}
