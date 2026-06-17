import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_OPTIONS = {
  demoBlocked: true,
  title: 'Оплата',
};

export function normalizeAmountToKopecks(value) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(',', '.');

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount * 100);
}

export function validatePaymentForm(data) {
  const errors = {};
  const fullName = String(data.fullName ?? '').trim();
  const phone = String(data.phone ?? '').trim();
  const email = String(data.email ?? '').trim();
  const amountKopecks = normalizeAmountToKopecks(data.amount);

  if (fullName.length < 5) {
    errors.fullName = 'Укажите ФИО плательщика.';
  }

  if (!/^\+?[0-9\s().-]{10,}$/.test(phone)) {
    errors.phone = 'Укажите корректный телефон.';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Укажите корректный email.';
  }

  if (!amountKopecks || amountKopecks < 100) {
    errors.amount = 'Укажите сумму не менее 1 рубля.';
  }

  return {
    amountKopecks,
    errors,
    ok: Object.keys(errors).length === 0,
  };
}

function buildPaymentPageSection(options = {}) {
  const settings = { ...DEFAULT_OPTIONS, ...options };
  const blockedText = settings.demoBlocked
    ? 'После отправки формы будет подготовлена ссылка или QR-код для оплаты.'
    : 'После отправки формы откроется защищенная оплата Точка Банка.';

  const titleMarkup = settings.showTitle === false
    ? ''
    : `    <h1 class="payment-title">${settings.title}</h1>\n`;

  return `<!-- Tochka payment page. Secrets are intentionally not embedded. -->
<section class="payment-page" data-tochka-payment>
  <style>
    .payment-page {
      --payment-accent: #E52F42;
      --payment-accent-dark: #bd2334;
      --payment-ink: #1b1b1f;
      --payment-muted: #64666d;
      --payment-line: #e6e6e8;
      --payment-soft: #f7f7f8;
      color: var(--payment-ink);
      font-family: inherit;
      margin: 0 auto;
      max-width: 1120px;
      padding: 0 0 42px;
    }
    .payment-page * { box-sizing: border-box; }
    .payment-head {
      display: grid;
      gap: 12px;
      margin-bottom: 26px;
    }
    .payment-title {
      color: var(--payment-ink);
      font-size: clamp(30px, 4vw, 44px);
      font-weight: 700;
      line-height: 1.12;
      margin: 0;
    }
    .payment-lead {
      color: var(--payment-muted);
      font-size: 18px;
      line-height: 1.55;
      margin: 0;
      max-width: 820px;
    }
    .payment-status {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 6px;
    }
    .payment-badge {
      border: 1px solid rgba(229, 47, 66, .28);
      border-radius: 999px;
      color: var(--payment-accent);
      display: inline-flex;
      font-size: 13px;
      font-weight: 700;
      line-height: 1;
      padding: 8px 12px;
      text-transform: uppercase;
    }
    .payment-layout {
      display: grid;
      gap: 24px;
      grid-template-columns: minmax(0, 1.08fr) minmax(280px, 0.92fr);
    }
    .payment-panel {
      background: #fff;
      border: 1px solid var(--payment-line);
      border-radius: 8px;
      box-shadow: 0 12px 34px rgba(0, 0, 0, .06);
      padding: 26px;
    }
    .payment-form {
      display: grid;
      gap: 16px;
    }
    .payment-field {
      display: grid;
      gap: 7px;
    }
    .payment-label {
      color: var(--payment-ink);
      font-size: 14px;
      font-weight: 700;
    }
    .payment-input {
      background: #fff;
      border: 1px solid #d7d7db;
      border-radius: 4px;
      color: var(--payment-ink);
      font: inherit;
      min-height: 48px;
      padding: 11px 13px;
      width: 100%;
    }
    .payment-input:focus {
      border-color: var(--payment-accent);
      outline: 2px solid rgba(229, 47, 66, .14);
    }
    .payment-grid {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .payment-methods {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .payment-method {
      background: var(--payment-soft);
      border: 1px solid var(--payment-line);
      border-radius: 8px;
      display: grid;
      gap: 6px;
      min-height: 90px;
      padding: 15px;
      position: relative;
    }
    .payment-method::before {
      background: var(--payment-accent);
      border-radius: 999px;
      content: "";
      height: 8px;
      position: absolute;
      right: 15px;
      top: 17px;
      width: 8px;
    }
    .payment-method strong {
      color: var(--payment-ink);
      font-size: 15px;
      padding-right: 20px;
    }
    .payment-method span {
      color: var(--payment-muted);
      font-size: 13px;
      line-height: 1.38;
    }
    .payment-check {
      align-items: start;
      display: grid;
      gap: 10px;
      grid-template-columns: 20px minmax(0, 1fr);
      line-height: 1.45;
    }
    .payment-check input {
      accent-color: var(--payment-accent);
      margin-top: 3px;
    }
    .payment-button {
      background: var(--payment-accent);
      border: 0;
      border-radius: 4px;
      color: #fff;
      cursor: pointer;
      font: inherit;
      font-weight: 700;
      min-height: 50px;
      padding: 13px 20px;
      text-transform: uppercase;
      transition: background .2s ease, transform .2s ease;
    }
    .payment-button:hover {
      background: var(--payment-accent-dark);
      transform: translateY(-1px);
    }
    .payment-alert {
      border-radius: 6px;
      line-height: 1.45;
      padding: 12px 14px;
    }
    .payment-alert-info {
      background: #fff5f6;
      border: 1px solid rgba(229, 47, 66, .24);
      color: #7d1722;
    }
    .payment-alert-error {
      background: #fff0f0;
      border: 1px solid #ffd0d0;
      color: #9f1d1d;
      margin-top: 8px;
    }
    .payment-side {
      display: grid;
      gap: 16px;
      align-content: start;
    }
    .payment-side h2 {
      color: var(--payment-ink);
      font-size: 22px;
      line-height: 1.2;
      margin: 0 0 14px;
    }
    .payment-list {
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 0;
    }
    .payment-list li {
      color: var(--payment-ink);
      list-style: none;
      padding-left: 22px;
      position: relative;
    }
    .payment-list li::before {
      background: var(--payment-accent);
      border-radius: 50%;
      content: "";
      height: 7px;
      left: 0;
      position: absolute;
      top: .62em;
      width: 7px;
    }
    .payment-qr {
      align-items: center;
      aspect-ratio: 1;
      background:
        linear-gradient(90deg, #1b1b1f 10px, transparent 10px) 18px 18px / 54px 54px,
        linear-gradient(#1b1b1f 10px, transparent 10px) 18px 18px / 54px 54px,
        #fff;
      border: 1px solid var(--payment-line);
      border-radius: 8px;
      display: grid;
      justify-items: center;
      margin-top: 6px;
      max-width: 220px;
      padding: 18px;
    }
    .payment-qr span {
      background: #fff;
      border: 1px solid var(--payment-line);
      border-radius: 6px;
      color: var(--payment-muted);
      font-size: 13px;
      line-height: 1.3;
      padding: 10px;
      text-align: center;
    }
    .payment-note {
      color: var(--payment-muted);
      font-size: 13px;
      line-height: 1.45;
      margin: 0;
    }
    @media (max-width: 820px) {
      .payment-page {
        padding-bottom: 30px;
      }
      .payment-layout,
      .payment-grid,
      .payment-methods {
        grid-template-columns: 1fr;
      }
      .payment-panel {
        padding: 18px;
      }
      .payment-lead {
        font-size: 16px;
      }
    }
  </style>

  <div class="payment-head">
${titleMarkup}    <p class="payment-lead">Заполните данные плательщика и сумму услуги. Оплатить можно банковской картой или через СБП, электронный чек будет отправлен на указанный email.</p>
    <div class="payment-status">
      <span class="payment-badge">Безопасно</span>
      <span class="payment-note">Оплата проходит на защищенной стороне Точка Банка.</span>
    </div>
  </div>

  <div class="payment-layout">
    <div class="payment-panel">
      <form class="payment-form" data-payment-form data-payment-endpoint="/tochka-create-payment">
        <div class="payment-grid">
          <label class="payment-field">
            <span class="payment-label">ФИО плательщика</span>
            <input class="payment-input" name="fullName" autocomplete="name" placeholder="Иванов Иван Иванович">
          </label>
          <label class="payment-field">
            <span class="payment-label">Телефон</span>
            <input class="payment-input" name="phone" autocomplete="tel" inputmode="tel" placeholder="+7 900 000-00-00">
          </label>
        </div>

        <div class="payment-grid">
          <label class="payment-field">
            <span class="payment-label">Email для чека</span>
            <input class="payment-input" name="email" autocomplete="email" inputmode="email" placeholder="client@example.ru">
          </label>
          <label class="payment-field">
            <span class="payment-label">Сумма, руб.</span>
            <input class="payment-input" name="amount" inputmode="decimal" placeholder="1 000">
          </label>
        </div>

        <div class="payment-methods" aria-label="Способы оплаты">
          <div class="payment-method">
            <strong>Банковская карта</strong>
            <span>Оплата картой МИР или другой картой, доступной для онлайн-оплаты.</span>
          </div>
          <div class="payment-method">
            <strong>СБП</strong>
            <span>Оплата из приложения вашего банка по QR-коду или ссылке.</span>
          </div>
        </div>

        <label class="payment-check">
          <input name="offer" type="checkbox">
          <span>Согласен с условиями публичной оферты, оплатой услуги и обработкой персональных данных.</span>
        </label>

        <div data-payment-errors></div>
        <button class="payment-button" type="submit">Подготовить оплату</button>
        <div class="payment-alert payment-alert-info" data-payment-summary hidden></div>
        <p class="payment-note" data-payment-notice>${blockedText}</p>
      </form>
    </div>

    <aside class="payment-side">
      <div class="payment-panel">
        <h2>Как проходит оплата</h2>
        <ul class="payment-list">
          <li>Вы указываете данные плательщика и сумму услуги.</li>
          <li>Для оплаты будет подготовлена защищенная ссылка или QR-код.</li>
          <li>Оплатить можно банковской картой или через СБП.</li>
          <li>После успешной оплаты чек придет на указанный email.</li>
        </ul>
      </div>
      <div class="payment-panel">
        <h2>Оплата через СБП</h2>
        <div class="payment-qr" aria-hidden="true"><span>QR-код появится после проверки данных</span></div>
        <p class="payment-note">Если удобнее оплатить по ссылке, она будет доступна вместе с данными заказа.</p>
      </div>
    </aside>
  </div>

  <script>${pageScript()}</script>
</section>`;
}

function pageScript() {
  return String.raw`
(function () {
  var form = document.querySelector('[data-payment-form]');
  var notice = document.querySelector('[data-payment-notice]');
  var summary = document.querySelector('[data-payment-summary]');
  var errorBox = document.querySelector('[data-payment-errors]');
  var submitButton = form ? form.querySelector('button[type="submit"]') : null;

  function normalizeAmount(value) {
    var normalized = String(value || '').trim().replace(/\s+/g, '').replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
      return null;
    }
    var amount = Number(normalized);
    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }
    return Math.round(amount * 100);
  }

  function validate(data) {
    var errors = [];
    if (data.fullName.trim().length < 5) errors.push('Укажите ФИО плательщика.');
    if (!/^\+?[0-9\s().-]{10,}$/.test(data.phone.trim())) errors.push('Укажите корректный телефон.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errors.push('Укажите корректный email.');
    if (!normalizeAmount(data.amount) || normalizeAmount(data.amount) < 100) errors.push('Укажите сумму не менее 1 рубля.');
    if (!data.offer) errors.push('Подтвердите согласие с офертой и обработкой данных.');
    return errors;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char];
    });
  }

  function showErrors(errors) {
    errorBox.innerHTML = errors.map(function (error) {
      return '<div class="payment-alert payment-alert-error">' + escapeHtml(error) + '</div>';
    }).join('');
  }

  function showAcceptedSummary(data, amountRub) {
    summary.hidden = false;
    summary.innerHTML = '<strong>Данные для оплаты приняты.</strong><br>' +
      'Плательщик: ' + escapeHtml(data.fullName.trim()) + '<br>' +
      'Сумма: ' + amountRub + ' руб.<br>' +
      'Способ оплаты: банковская карта или СБП.<br>' +
      'Ссылка или QR-код для оплаты будут подготовлены после проверки данных, электронный чек придет на указанный email.';

    notice.textContent = 'Спасибо. Мы подготовим ссылку или QR-код для оплаты и отправим чек после успешного платежа.';
  }

  function submitTochkaPayment(data) {
    var endpoint = form.getAttribute('data-payment-endpoint');

    if (!endpoint || !window.fetch) {
      return Promise.resolve(null);
    }

    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: data.amount,
        email: data.email,
        fullName: data.fullName,
        phone: data.phone
      })
    }).then(function (response) {
      return response.json().catch(function () {
        return {};
      }).then(function (payload) {
        payload.httpOk = response.ok;
        return payload;
      });
    });
  }

  if (!form) return;

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var fields = form.elements;

    var data = {
      fullName: fields.fullName.value,
      phone: fields.phone.value,
      email: fields.email.value,
      amount: fields.amount.value,
      offer: fields.offer.checked
    };
    var errors = validate(data);

    errorBox.innerHTML = '';
    summary.hidden = true;

    if (errors.length) {
      showErrors(errors);
      return;
    }

    var amountRub = (normalizeAmount(data.amount) / 100).toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    summary.hidden = false;
    summary.innerHTML = '<strong>Готовим ссылку на оплату.</strong><br>Пожалуйста, подождите несколько секунд.';
    notice.textContent = 'Соединяемся с платежной страницей Точка Банка.';

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Готовим оплату...';
    }

    submitTochkaPayment(data).then(function (result) {
      if (result && result.success && result.paymentLink) {
        summary.innerHTML = '<strong>Ссылка на оплату готова.</strong><br>Сейчас откроется защищенная платежная страница.';
        window.location.href = result.paymentLink;
        return;
      }

      if (result && result.errors) {
        showErrors(Object.keys(result.errors).map(function (key) {
          return result.errors[key];
        }));
        summary.hidden = true;
        notice.textContent = result.message || 'Проверьте данные плательщика.';
        return;
      }

      showAcceptedSummary(data, amountRub);
    }).catch(function () {
      showAcceptedSummary(data, amountRub);
    }).finally(function () {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Подготовить оплату';
      }
    });
  });
})();`;
}

export function buildPaymentPageFragmentHtml(options = {}) {
  return buildPaymentPageSection({ ...options, showTitle: false });
}

export function buildPaymentPageHtml(options = {}) {
  const settings = { ...DEFAULT_OPTIONS, ...options };
  const section = buildPaymentPageSection({ ...settings, showTitle: true });

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>${settings.title}</title>
</head>
<body>
${section}
</body>
</html>`;
}

export function wrapPaymentPageWithSiteChrome({
  bodyScriptsHtml = '',
  footerHtml,
  headAssetsHtml = '',
  headerHtml,
  paymentHtml = buildPaymentPageFragmentHtml(),
  title = 'Оплата',
} = {}) {
  if (!headerHtml || !footerHtml) {
    throw new Error('Header and footer HTML are required to build the site payment page.');
  }

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <base href="https://patronage-service.ru/">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>${title}</title>
${headAssetsHtml}
  <style>
    .payment-template-main {
      background: #f6f6f6;
      padding: 160px 0 58px;
    }
    .payment-template-title {
      color: #0b0b0b;
      font-size: clamp(32px, 4vw, 48px);
      font-weight: 700;
      line-height: 1.1;
      margin: 0 auto 26px;
      max-width: 1120px;
      padding: 0 20px;
    }
    .payment-template-inner {
      margin: 0 auto;
      max-width: 1160px;
      padding: 0 20px;
    }
    .payment-template-inner .payment-page {
      max-width: 1120px;
    }
    @media (max-width: 820px) {
      .payment-template-main {
        padding: 112px 0 42px;
      }
      .payment-template-title {
        margin-bottom: 18px;
      }
    }
  </style>
</head>
<body>
${headerHtml}
<main class="payment-template-main">
  <h1 class="payment-template-title">${title}</h1>
  <div class="payment-template-inner">
${paymentHtml}
  </div>
</main>
${footerHtml}
${bodyScriptsHtml}
</body>
</html>`;
}

function main() {
  const outputPath = resolve('dist/oplata.html');
  const fragmentPath = resolve('dist/oplata.fragment.html');
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, buildPaymentPageHtml(), 'utf8');
  writeFileSync(fragmentPath, buildPaymentPageFragmentHtml(), 'utf8');
  console.log(outputPath);
  console.log(fragmentPath);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
