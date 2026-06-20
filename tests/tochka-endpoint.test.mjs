import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('PHP endpoint is configurable without committed secrets', async () => {
  const endpoint = await readFile('modx/tochka-create-payment.php', 'utf8');
  const configExample = await readFile('modx/tochka-payment.local.example.php', 'utf8');

  assert.match(endpoint, /TOCHKA_JWT/);
  assert.match(endpoint, /TOCHKA_MERCHANT_ID/);
  assert.match(endpoint, /TOCHKA_CUSTOMER_CODE/);
  assert.match(endpoint, /tochka-payment\.local\.php/);
  assert.match(endpoint, /'Data' => \[/);
  assert.match(endpoint, /'Client' => \[/);
  assert.match(endpoint, /'Items' => \[/);
  assert.doesNotMatch(endpoint, /eyJhbGci|JCG29|HTTP_MODAUTH/);
  assert.doesNotMatch(configExample, /eyJhbGci|JCG29|HTTP_MODAUTH/);
});
