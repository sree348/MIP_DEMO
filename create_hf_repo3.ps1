$answer = '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     TOKEN WITH WRITE PERMISIION'
$token = $answer.Split(' ')[0]
Write-Host "Token: $token"
$headers = @{ Authorization = "Bearer $token" }
$body = @{ name='MIP_DEMO'; type='model'; private=$false } | ConvertTo-Json
Write-Host "Body: $body"
Invoke-WebRequest -Method Post -Uri 'https://huggingface.co/api/repos/create' -Headers $headers -Body $body -ContentType 'application/json' -UseBasicParsing