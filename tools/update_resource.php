<?php
define('MODX_API_MODE', true);
require_once dirname(__DIR__) . '/config.core.php';
require_once MODX_CORE_PATH . 'model/modx/modx.class.php';

$modx = new modX();
$modx->initialize('web');

$fragmentFile = __DIR__ . '/oplata.html';

if (!is_file($fragmentFile)) {
    http_response_code(500);
    echo 'File not found: ' . $fragmentFile;
    exit;
}

$content = file_get_contents($fragmentFile);

$resource = $modx->getObject('modResource', 1476);

if (!$resource) {
    http_response_code(404);
    echo 'Resource 1476 not found';
    exit;
}

$resource->set('content', $content);
$resource->set('editedon', time());

if ($resource->save()) {
    $modx->cacheManager->refresh(['resource' => ['contexts' => ['web']]]);
    echo 'OK: ' . strlen($content) . ' bytes';
} else {
    http_response_code(500);
    echo 'Save failed';
}
