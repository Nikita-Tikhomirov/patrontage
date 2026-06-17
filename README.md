# Patronage payment

Локальный пакет для страницы оплаты Точка Банка на MODX-сайте.

## Что развернуто

- Публичная демо-страница: https://patronage-service.ru/oplata
- MODX resource id: `1476`
- Выбран рабочий сценарий: форма на сайте создает одноразовую платежную ссылку Точки с чеком.
- JWT и `merchantId` не хранятся в репозитории и не вшиты в HTML.
- Пока `merchantId` и рабочие права JWT не внесены на сервер, форма показывает аккуратный fallback без технической ошибки.

## Локальная сборка

```bash
node tools/build-payment-page-from-site.mjs
```

Команда забирает отрендеренные шапку, подвал и основные стили с главной страницы сайта, затем генерирует:

- `dist/oplata.html` - готовый HTML для MODX-ресурса `/oplata` с шапкой и подвалом сайта;
- `dist/oplata.fragment.html` - только платежный блок, если позже понадобится штатный MODX-шаблон.

Для полностью автономной локальной демо-страницы без шапки и подвала можно запустить:

```bash
node tools/payment-page.mjs
```

## Проверки

```bash
node --test --test-concurrency=1 tests/payment-page.test.mjs
```

Проверяется нормализация суммы, клиентская валидация, наличие способов оплаты картой и СБП, а также сборка страницы с шапкой/подвалом.

## Endpoint оплаты

Рабочий endpoint на сайте: `https://patronage-service.ru/tochka-create-payment`.

Для MODX подготовлен snippet `modx/TochkaCreatePayment.snippet.php`. На сайте он должен быть создан как элемент `TochkaCreatePayment`, а ресурс `/tochka-create-payment` должен вызывать:

```text
[[!TochkaCreatePayment]]
```

Секреты и параметры интеграции не пишутся в HTML. Для live-сайта snippet читает их из системных настроек MODX или переменных окружения:

- `tochka.jwt` / `TOCHKA_JWT`;
- `tochka.customer_code` / `TOCHKA_CUSTOMER_CODE`;
- `tochka.merchant_id` / `TOCHKA_MERCHANT_ID`;
- `tochka.service_name` / `TOCHKA_SERVICE_NAME`;
- `tochka.tax_system_code` / `TOCHKA_TAX_SYSTEM_CODE`;
- `tochka.vat_type` / `TOCHKA_VAT_TYPE`.

Файл `modx/tochka-create-payment.php` оставлен как standalone-вариант для сервера, где можно загрузить отдельный PHP endpoint. В таком варианте рядом создается локальный файл `tochka-payment.local.php` по примеру `modx/tochka-payment.local.example.php`; этот файл не коммитится.

Минимальная конфигурация:

```php
<?php

return [
    'jwt' => 'JWT из личного кабинета Точки',
    'customerCode' => 'код клиента из JWT/Точки',
    'merchantId' => 'merchantId активной торговой точки интернет-эквайринга',
    'serviceName' => 'Услуга по подбору персонала',
    'taxSystemCode' => 'usn_income_outcome',
    'vatType' => 'none',
];
```

Параметры чека по текущим скриншотам клиента:

- предмет расчета: `service` / услуги;
- способ расчета: `full_payment` / полная оплата;
- СНО: `usn_income_outcome` / УСН доходы минус расходы;
- НДС: нужно подтвердить, предварительно ставим `none` / без НДС;
- название услуги: `Услуга по подбору персонала`.

## Что нужно для следующего шага

От клиента/Точки нужно получить:

- `merchantId` терминала, который выбивает чеки;
- подтверждение, что JWT имеет доступ к созданию платежей интернет-эквайринга с чеком;
- подтверждение НДС: вероятно `none` / без НДС;
- разрешение на тестовую оплату 1 рубль.
