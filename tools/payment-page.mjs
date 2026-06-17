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
    errors.amount = 'Минимальная сумма для теста - 1 рубль.';
  }

  return {
    amountKopecks,
    errors,
    ok: Object.keys(errors).length === 0,
  };
}

function pageScript() {
  return String.raw`
(function () {
  var form = document.querySelector('[data-payment-form]');
  var notice = document.querySelector('[data-payment-notice]');
  var summary = document.querySelector('[data-payment-summary]');
  var errorBox = document.querySelector('[data-payment-errors]');

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
    if (!normalizeAmount(data.amount) || normalizeAmount(data.amount) < 100) errors.push('Минимальная сумма для теста - 1 рубль.');
    if (!data.offer) errors.push('Подтвердите согласие с офертой и обработкой данных.');
    return errors;
  }

  if (!form) return;

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var data = {
      fullName: form.fullName.value,
      phone: form.phone.value,
      email: form.email.value,
      amount: form.amount.value,
      offer: form.offer.checked
    };
    var errors = validate(data);

    errorBox.innerHTML = '';
    summary.hidden = true;

    if (errors.length) {
      errorBox.innerHTML = errors.map(function (error) {
        return '<div class="payment-alert payment-alert-error">' + error + '</div>';
      }).join('');
      return;
    }

    var amountRub = (normalizeAmount(data.amount) / 100).toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    summary.hidden = false;
    summary.innerHTML = '<strong>Данные приняты для теста.</strong><br>' +
      'Плательщик: ' + data.fullName.trim() + '<br>' +
      'Сумма: ' + amountRub + ' руб.<br>' +
      'Способы оплаты: банковская карта и СБП.<br>' +
      'Чек: будет формироваться через эквайринг Точки после выбора терминала с фискализацией.';

    notice.textContent = 'Следующий шаг: клиент выбирает нужный терминал с чеками, после этого включаем создание платежной ссылки.';
  });
})();`;
}

export function buildPaymentPageHtml(options = {}) {
  const settings = { ...DEFAULT_OPTIONS, ...options };
  const blockedText = settings.demoBlocked
    ? 'Платежная ссылка пока не создается: нужно выбрать merchantId терминала с чеками и подтвердить права JWT в Точке.'
    : 'Платежная ссылка будет создана через API Точки.';

  const section = `<!-- Tochka payment demo page. Secrets are intentionally not embedded. -->
<section class="payment-page" data-tochka-payment-demo>
  <style>
    .payment-page {
      --payment-accent: #1f6feb;
      --payment-ink: #172033;
      --payment-muted: #617086;
      --payment-line: #d9e2ef;
      --payment-bg: #f6f8fb;
      color: var(--payment-ink);
      font-family: inherit;
      margin: 0 auto;
      max-width: 1120px;
      padding: 34px 18px 48px;
    }
    .payment-page * { box-sizing: border-box; }
    .payment-head {
      display: grid;
      gap: 10px;
      margin-bottom: 24px;
    }
    .payment-title {
      font-size: clamp(28px, 4vw, 44px);
      font-weight: 700;
      line-height: 1.1;
      margin: 0;
    }
    .payment-lead {
      color: var(--payment-muted);
      font-size: 17px;
      line-height: 1.55;
      margin: 0;
      max-width: 760px;
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
      padding: 24px;
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
      font-size: 14px;
      font-weight: 700;
    }
    .payment-input {
      border: 1px solid #cbd6e6;
      border-radius: 6px;
      color: var(--payment-ink);
      font: inherit;
      min-height: 46px;
      padding: 10px 12px;
      width: 100%;
    }
    .payment-input:focus {
      border-color: var(--payment-accent);
      outline: 2px solid rgba(31, 111, 235, .16);
    }
    .payment-grid {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .payment-methods {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .payment-method {
      border: 1px solid #cbd6e6;
      border-radius: 8px;
      display: grid;
      gap: 4px;
      min-height: 86px;
      padding: 14px;
    }
    .payment-method strong {
      font-size: 15px;
    }
    .payment-method span {
      color: var(--payment-muted);
      font-size: 13px;
      line-height: 1.35;
    }
    .payment-check {
      align-items: start;
      display: grid;
      gap: 10px;
      grid-template-columns: 20px minmax(0, 1fr);
      line-height: 1.45;
    }
    .payment-check input {
      margin-top: 3px;
    }
    .payment-button {
      background: var(--payment-accent);
      border: 0;
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      font: inherit;
      font-weight: 700;
      min-height: 48px;
      padding: 12px 18px;
    }
    .payment-button:hover {
      background: #185abc;
    }
    .payment-alert {
      border-radius: 6px;
      line-height: 1.45;
      padding: 12px 14px;
    }
    .payment-alert-info {
      background: #eef4ff;
      border: 1px solid #c9dcff;
      color: #174ea6;
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
      font-size: 22px;
      margin: 0 0 12px;
    }
    .payment-list {
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 0;
    }
    .payment-list li {
      list-style: none;
      padding-left: 20px;
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
        linear-gradient(90deg, #172033 10px, transparent 10px) 18px 18px / 54px 54px,
        linear-gradient(#172033 10px, transparent 10px) 18px 18px / 54px 54px,
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
      .payment-layout,
      .payment-grid,
      .payment-methods {
        grid-template-columns: 1fr;
      }
      .payment-panel {
        padding: 18px;
      }
    }
  </style>

  <div class="payment-head">
    <h1 class="payment-title">${settings.title}</h1>
    <p class="payment-lead">Введите данные плательщика и сумму. Оплата будет проходить через Точка Банк: банковской картой или через СБП, с формированием чека.</p>
  </div>

  <div class="payment-layout">
    <div class="payment-panel">
      <form class="payment-form" data-payment-form>
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
            <span>Visa, Mastercard, МИР и другие карты, доступные в эквайринге Точки.</span>
          </div>
          <div class="payment-method">
            <strong>СБП</strong>
            <span>Оплата по QR-коду или ссылке через приложение банка.</span>
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
        <h2>Что будет после подключения</h2>
        <ul class="payment-list">
          <li>Сайт создаст платежную ссылку через API Точки.</li>
          <li>Клиент сможет оплатить картой или через СБП.</li>
          <li>Чек будет формироваться через выбранный терминал Точки.</li>
          <li>Статус оплаты можно будет проверять по операции или вебхуку.</li>
        </ul>
      </div>
      <div class="payment-panel">
        <h2>QR для оплаты</h2>
        <div class="payment-qr" aria-hidden="true"><span>Появится после создания платежной ссылки</span></div>
        <p class="payment-note">Для запуска нужен merchantId терминала с чеками и подтвержденные права JWT на интернет-эквайринг.</p>
      </div>
    </aside>
  </div>

  <script>${pageScript()}</script>
</section>`;

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

function main() {
  const outputPath = resolve('dist/oplata.html');
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, buildPaymentPageHtml(), 'utf8');
  console.log(outputPath);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
