<?php

return [
    'jwt' => 'paste-token-here',
    // Получите customerCode вызовом Get Customers List:
    //   TOCHKA_JWT="ваш-jwt" node tools/get-customer-code.mjs
    // Нужное значение — поле customerCode у записи с customerType: "Business".
    // Подробнее: https://developers.tochka.com/docs/tochka-api/api/get-customers-list-open-banking-v-1-0-customers-get
    'customerCode' => 'paste-customer-code-here',
    'merchantId' => 'paste-merchant-id-here',
    'serviceName' => 'Услуга по подбору персонала',
    'taxSystemCode' => 'usn_income_outcome',
    'vatType' => 'none',
    'redirectUrl' => 'https://patronage-service.ru/oplata?payment=success',
    'failRedirectUrl' => 'https://patronage-service.ru/oplata?payment=fail',
];
