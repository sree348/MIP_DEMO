$token = 'Venpep@123@348'
$headers = @{ Authorization = "Bearer $token" }
Invoke-WebRequest -Method Get -Uri 'https://huggingface.co/api/whoami-v2' -Headers $headers -UseBasicParsing