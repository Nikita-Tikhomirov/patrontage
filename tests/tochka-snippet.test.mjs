import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const snippetPath = new URL('../modx/TochkaCreatePayment.snippet.php', import.meta.url);

test('MODX Tochka snippet can be used inside a resource', () => {
  const code = readFileSync(snippetPath, 'utf8');

  assert.doesNotMatch(code, /<\?php/);
  assert.match(code, /tochka\.jwt/);
  assert.match(code, /tochka\.merchant_id/);
  assert.match(code, /payments_with_receipt/);
  assert.match(code, /paymentMode/);
  assert.match(code, /taxSystemCode/);
  assert.match(code, /'Data' => \[/);
  assert.match(code, /'Client' => \[/);
  assert.match(code, /'Items' => \[/);
  assert.doesNotMatch(code, /eyJhbGci|JCG29|HTTP_MODAUTH|0Od65|781450526821|302281849/);
});
