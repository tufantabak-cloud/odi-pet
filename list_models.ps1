$envContent = Get-Content -Path ".env.local" -Raw
$key = ""
if ($envContent -match "GEMINI_API_KEY=(.+)") {
    $key = $matches[1].Trim()
}

if ($key) {
    $response = Invoke-RestMethod -Uri "https://generativelanguage.googleapis.com/v1beta/models?key=$key" -Method Get
    foreach ($model in $response.models) {
        if ($model.supportedGenerationMethods -contains "generateContent") {
            Write-Output $model.name
        }
    }
} else {
    Write-Output "API Key not found"
}
