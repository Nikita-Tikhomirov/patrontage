if (!function_exists('patronage_tochka_json_response')) {
    function patronage_tochka_json_response(int $status, array $payload): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}

if (!function_exists('patronage_tochka_option')) {
    function patronage_tochka_option(string $settingKey, string $envKey, string $default = ''): string
    {
        global $modx;

        $value = '';

        if (isset($modx) && is_object($modx) && method_exists($modx, 'getOption')) {
            $value = (string)$modx->getOption($settingKey, null, '');
        }

        if (trim($value) === '') {
            $envValue = getenv($envKey);
            $value = $envValue === false ? '' : (string)$envValue;
        }

        if (trim($value) === '') {
            $value = $default;
        }

        return trim($value);
    }
}

if (!function_exists('patronage_tochka_config')) {
    function patronage_tochka_config(): array
    {
        return [
            'jwt' => patronage_tochka_option('tochka.jwt', 'TOCHKA_JWT'),
            'customerCode' => patronage_tochka_option('tochka.customer_code', 'TOCHKA_CUSTOMER_CODE'),
            'merchantId' => patronage_tochka_option('tochka.merchant_id', 'TOCHKA_MERCHANT_ID'),
            'serviceName' => patronage_tochka_option('tochka.service_name', 'TOCHKA_SERVICE_NAME', 'Услуга по подбору персонала'),
            'taxSystemCode' => patronage_tochka_option('tochka.tax_system_code', 'TOCHKA_TAX_SYSTEM_CODE', 'usn_income_outcome'),
            'vatType' => patronage_tochka_option('tochka.vat_type', 'TOCHKA_VAT_TYPE', 'none'),
            'apiBase' => patronage_tochka_option('tochka.api_base', 'TOCHKA_API_BASE', 'https://enter.tochka.com/uapi'),
            'redirectUrl' => patronage_tochka_option('tochka.redirect_url', 'TOCHKA_REDIRECT_URL', 'https://patronage-service.ru/oplata?payment=success'),
            'failRedirectUrl' => patronage_tochka_option('tochka.fail_redirect_url', 'TOCHKA_FAIL_REDIRECT_URL', 'https://patronage-service.ru/oplata?payment=fail'),
        ];
    }
}

if (!function_exists('patronage_tochka_read_body')) {
    function patronage_tochka_read_body(): array
    {
        $raw = file_get_contents('php://input') ?: '';
        $data = json_decode($raw, true);

        if (is_array($data)) {
            return $data;
        }

        return $_POST;
    }
}

if (!function_exists('patronage_tochka_amount')) {
    function patronage_tochka_amount(string $value): ?string
    {
        $normalized = str_replace(',', '.', preg_replace('/\s+/', '', trim($value)));

        if (!preg_match('/^\d+(\.\d{1,2})?$/', $normalized)) {
            return null;
        }

        $amount = (float)$normalized;

        if ($amount <= 0) {
            return null;
        }

        return number_format($amount, 2, '.', '');
    }
}

if (!function_exists('patronage_tochka_phone')) {
    function patronage_tochka_phone(string $value): string
    {
        $digits = preg_replace('/\D+/', '', $value);

        if (strlen($digits) === 11 && $digits[0] === '8') {
            return '+7' . substr($digits, 1);
        }

        if (strlen($digits) === 11 && $digits[0] === '7') {
            return '+' . $digits;
        }

        if (strlen($digits) === 10) {
            return '+7' . $digits;
        }

        return trim($value);
    }
}

if (!function_exists('patronage_tochka_strlen')) {
    function patronage_tochka_strlen(string $value): int
    {
        if (function_exists('mb_strlen')) {
            return mb_strlen($value, 'UTF-8');
        }

        return strlen($value);
    }
}

if (!function_exists('patronage_tochka_validate_form')) {
    function patronage_tochka_validate_form(array $data): array
    {
        $errors = [];
        $amount = patronage_tochka_amount((string)($data['amount'] ?? ''));
        $email = trim((string)($data['email'] ?? ''));
        $fullName = trim((string)($data['fullName'] ?? ''));
        $phone = trim((string)($data['phone'] ?? ''));

        if (patronage_tochka_strlen($fullName) < 5) {
            $errors['fullName'] = 'Укажите ФИО плательщика.';
        }

        if (!preg_match('/^\+?[0-9\s().-]{10,}$/', $phone)) {
            $errors['phone'] = 'Укажите корректный телефон.';
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Укажите корректный email.';
        }

        if ($amount === null || (float)$amount < 1) {
            $errors['amount'] = 'Укажите сумму не менее 1 рубля.';
        }

        return [$errors, [
            'amount' => $amount,
            'email' => $email,
            'fullName' => $fullName,
            'phone' => patronage_tochka_phone($phone),
        ]];
    }
}

if (!function_exists('patronage_tochka_payment_id')) {
    function patronage_tochka_payment_id(): string
    {
        try {
            $suffix = bin2hex(random_bytes(3));
        } catch (Exception $exception) {
            $suffix = substr(sha1(uniqid('', true)), 0, 6);
        }

        return 'patronage-' . date('YmdHis') . '-' . $suffix;
    }
}

if (!function_exists('patronage_tochka_payload')) {
    function patronage_tochka_payload(array $form, array $config): array
    {
        $serviceName = trim((string)$config['serviceName']);

        return ['Data' => [
            'amount' => $form['amount'],
            'Client' => [
                'email' => $form['email'],
                'name' => $form['fullName'],
                'phone' => $form['phone'],
            ],
            'customerCode' => trim((string)$config['customerCode']),
            'failRedirectUrl' => trim((string)$config['failRedirectUrl']),
            'Items' => [[
                'amount' => $form['amount'],
                'measure' => 'шт.',
                'name' => $serviceName,
                'paymentMethod' => 'full_payment',
                'paymentObject' => 'service',
                'quantity' => 1,
                'vatType' => trim((string)$config['vatType']),
            ]],
            'merchantId' => trim((string)$config['merchantId']),
            'paymentLinkId' => patronage_tochka_payment_id(),
            'paymentMode' => ['card', 'sbp'],
            'preAuthorization' => false,
            'purpose' => 'Оплата услуги по подбору персонала',
            'redirectUrl' => trim((string)$config['redirectUrl']),
            'taxSystemCode' => trim((string)$config['taxSystemCode']),
        ]];
    }
}

if (!function_exists('patronage_tochka_extract_link')) {
    function patronage_tochka_extract_link(array $response): string
    {
        return (string)($response['Data']['paymentLink'] ?? $response['data']['paymentLink'] ?? $response['paymentLink'] ?? '');
    }
}

if (!function_exists('patronage_tochka_log')) {
    function patronage_tochka_log(string $message): void
    {
        global $modx;

        if (isset($modx) && is_object($modx) && method_exists($modx, 'log') && class_exists('modX')) {
            $modx->log(modX::LOG_LEVEL_ERROR, '[Tochka payment] ' . $message);
            return;
        }

        error_log('[Tochka payment] ' . $message);
    }
}

if (!function_exists('patronage_tochka_create_payment')) {
    function patronage_tochka_create_payment(array $payload, array $config): array
    {
        if (!function_exists('curl_init')) {
            return [
                'error' => 'curl_missing',
                'httpStatus' => 0,
                'message' => 'cURL extension is not available.',
            ];
        }

        $url = rtrim((string)$config['apiBase'], '/') . '/acquiring/v1.0/payments_with_receipt';
        $ch = curl_init($url);

        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => 'POST',
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . trim((string)$config['jwt']),
                'Content-Type: application/json',
                'Accept: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 20,
        ]);

        $rawResponse = curl_exec($ch);
        $curlError = curl_error($ch);
        $httpStatus = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        if ($rawResponse === false) {
            return [
                'error' => 'curl_error',
                'httpStatus' => 0,
                'message' => $curlError,
            ];
        }

        $response = json_decode((string)$rawResponse, true);

        if (!is_array($response)) {
            return [
                'error' => 'invalid_json',
                'httpStatus' => $httpStatus,
                'message' => 'Bank returned invalid JSON.',
            ];
        }

        return [
            'httpStatus' => $httpStatus,
            'response' => $response,
        ];
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    patronage_tochka_json_response(405, [
        'success' => false,
        'message' => 'Метод не поддерживается.',
    ]);
}

$patronageTochkaConfig = patronage_tochka_config();
$patronageTochkaMissing = [];

foreach (['jwt', 'customerCode', 'merchantId'] as $patronageTochkaKey) {
    if (trim((string)($patronageTochkaConfig[$patronageTochkaKey] ?? '')) === '') {
        $patronageTochkaMissing[] = $patronageTochkaKey;
    }
}

if ($patronageTochkaMissing !== []) {
    patronage_tochka_json_response(503, [
        'success' => false,
        'code' => 'not_configured',
        'message' => 'Оплата через банк еще настраивается. Мы подготовим ссылку или QR-код для оплаты вручную.',
    ]);
}

[$patronageTochkaErrors, $patronageTochkaForm] = patronage_tochka_validate_form(patronage_tochka_read_body());

if ($patronageTochkaErrors !== []) {
    patronage_tochka_json_response(422, [
        'success' => false,
        'code' => 'validation_error',
        'errors' => $patronageTochkaErrors,
        'message' => 'Проверьте данные плательщика.',
    ]);
}

$patronageTochkaPayload = patronage_tochka_payload($patronageTochkaForm, $patronageTochkaConfig);
$patronageTochkaBankResult = patronage_tochka_create_payment($patronageTochkaPayload, $patronageTochkaConfig);
$patronageTochkaBankStatus = (int)($patronageTochkaBankResult['httpStatus'] ?? 0);
$patronageTochkaBankResponse = $patronageTochkaBankResult['response'] ?? [];
$patronageTochkaPaymentLink = is_array($patronageTochkaBankResponse) ? patronage_tochka_extract_link($patronageTochkaBankResponse) : '';

if ($patronageTochkaBankStatus < 200 || $patronageTochkaBankStatus >= 300 || $patronageTochkaPaymentLink === '') {
    patronage_tochka_log('Bank payment link creation failed. HTTP status: ' . $patronageTochkaBankStatus);
    patronage_tochka_json_response(502, [
        'success' => false,
        'code' => 'bank_error',
        'message' => 'Не удалось создать ссылку на оплату. Мы свяжемся с вами и отправим ссылку вручную.',
    ]);
}

patronage_tochka_json_response(200, [
    'success' => true,
    'paymentLink' => $patronageTochkaPaymentLink,
    'message' => 'Ссылка на оплату создана.',
]);
