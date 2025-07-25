<?php
// PHP proxy pro Resend API
// Tento soubor obchází CORS omezení

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['emails']) || !isset($input['resendApiKey'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required parameters']);
    exit;
}

$emails = $input['emails'];
$resendApiKey = $input['resendApiKey'];
$results = [];

foreach ($emails as $emailData) {
    $ch = curl_init();
    
    curl_setopt($ch, CURLOPT_URL, 'https://api.resend.com/emails');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($emailData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $resendApiKey,
        'Content-Type: application/json',
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if ($response === false) {
        $results[] = [
            'success' => false,
            'email' => $emailData['to'][0],
            'error' => curl_error($ch)
        ];
    } else {
        $data = json_decode($response, true);
        
        if ($httpCode === 200) {
            $results[] = [
                'success' => true,
                'email' => $emailData['to'][0],
                'id' => $data['id']
            ];
        } else {
            $results[] = [
                'success' => false,
                'email' => $emailData['to'][0],
                'error' => $data['message'] ?? 'Unknown error'
            ];
        }
    }
    
    curl_close($ch);
    
    // Malé zpoždění mezi emaily
    usleep(100000); // 100ms
}

$successCount = count(array_filter($results, function($r) { return $r['success']; }));
$failedCount = count($results) - $successCount;

echo json_encode([
    'success' => true,
    'sent' => $successCount,
    'failed' => $failedCount,
    'results' => $results
]);
?>