$token = 'Venpep@123@348'
$headers = @{ Authorization = "Bearer $token" }
$body = @{ name='MIP_DEMO'; type='model'; private=$false } | ConvertTo-Json
Invoke-WebRequest -Method Post -Uri 'https://huggingface.co/api/repos/create' -Headers $headers -Body $body -UseBasicParsing