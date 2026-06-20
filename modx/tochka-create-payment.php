<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

const TOCHKA_API_BASE = 'https://enter.tochka.com/uapi';

function json_response(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);

    if (is_array($data)) {
        return $data;
    }

    return $_POST;
}

function env_value(string $key, string $default = ''): string
{
    $value = getenv($key);

    if ($value === false || trim((string)$value) === '') {
        return $default;
    }

    return trim((string)$value);
}

function load_payment_config(): array
{
    $config = [
        'jwt' => env_value('TOCHKA_JWT'),
        'customerCode' => env_value('TOCHKA_CUSTOMER_CODE'),
        'merchantId' => env_value('TOCHKA_MERCHANT_ID'),
        'serviceName' => env_value('TOCHKA_SERVICE_NAME', 'Услуга по подбору персонала'),
        'taxSystemCode' => env_value('TOCHKA_TAX_SYSTEM_CODE', 'usn_income_outcome'),
        'vatType' => env_value('TOCHKA_VAT_TYPE', 'none'),
        'apiBase' => env_value('TOCHKA_API_BASE', TOCHKA_API_BASE),
        'redirectUrl' => env_value('TOCHKA_REDIRECT_URL', 'https://patronage-service.ru/oplata?payment=success'),
        'failRedirectUrl' => env_value('TOCHKA_FAIL_REDIRECT_URL', 'https://patronage-service.ru/oplata?payment=fail'),
    ];

    $localConfigPath = __DIR__ . '/tochka-payment.local.php';

    if (is_file($localConfigPath)) {
        $localConfig = require $localConfigPath;

        if (is_array($localConfig)) {
            $config = array_merge($config, array_filter($localConfig, static function ($value): bool {
                return $value !== null && trim((string)$value) !== '';
            }));
        }
    }

    return $config;
}

function normalize_amount(string $value): ?string
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

function normalize_phone(string $value): string
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

function validate_payment_form(array $data): array
{
    $errors = [];
    $amount = normalize_amount((string)($data['amount'] ?? ''));
    $email = trim((string)($data['email'] ?? ''));
    $fullName = trim((string)($data['fullName'] ?? ''));
    $phone = trim((string)($data['phone'] ?? ''));

    if (mb_strlen($fullName, 'UTF-8') < 5) {
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
        'phone' => normalize_phone($phone),
    ]];
}

function build_tochka_payload(array $form, array $config): array
{
    $serviceName = trim((string)$config['serviceName']);
    $paymentLinkId = 'patronage-' . date('YmdHis') . '-' . bin2hex(random_bytes(3));

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
        'paymentLinkId' => $paymentLinkId,
        'paymentMode' => ['card', 'sbp'],
        'preAuthorization' => false,
        'purpose' => 'Оплата услуги по подбору персонала',
        'redirectUrl' => trim((string)$config['redirectUrl']),
        'taxSystemCode' => trim((string)$config['taxSystemCode']),
    ]];
}

function extract_payment_link(array $response): string
{
    return (string)($response['Data']['paymentLink'] ?? $response['data']['paymentLink'] ?? $response['paymentLink'] ?? '');
}

function create_tochka_payment(array $payload, array $config): array
{
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, [
        'success' => false,
        'message' => 'Метод не поддерживается.',
    ]);
}

$config = load_payment_config();
$missing = [];

foreach (['jwt', 'customerCode', 'merchantId'] as $key) {
    if (trim((string)($config[$key] ?? '')) === '') {
        $missing[] = $key;
    }
}

if ($missing !== []) {
    json_response(503, [
        'success' => false,
        'code' => 'not_configured',
        'message' => 'Оплата через банк еще настраивается. Мы подготовим ссылку или QR-код для оплаты вручную.',
    ]);
}

[$errors, $form] = validate_payment_form(read_json_body());

if ($errors !== []) {
    json_response(422, [
        'success' => false,
        'code' => 'validation_error',
        'errors' => $errors,
        'message' => 'Проверьте данные плательщика.',
    ]);
}

$payload = build_tochka_payload($form, $config);
$bankResult = create_tochka_payment($payload, $config);
$bankStatus = (int)($bankResult['httpStatus'] ?? 0);
$bankResponse = $bankResult['response'] ?? [];
$paymentLink = is_array($bankResponse) ? extract_payment_link($bankResponse) : '';

if ($bankStatus < 200 || $bankStatus >= 300 || $paymentLink === '') {
    json_response(502, [
        'success' => false,
        'code' => 'bank_error',
        'message' => 'Не удалось создать ссылку на оплату. Мы свяжемся с вами и отправим ссылку вручную.',
    ]);
}

json_response(200, [
    'success' => true,
    'paymentLink' => $paymentLink,
    'message' => 'Ссылка на оплату создана.',
]);
