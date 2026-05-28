$token = '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'
$headers = @{ Authorization = "Bearer $token" }
$body = '{""name"":""MIP_DEMO"",""type"":""model"",""private\":false}'
Invoke-WebRequest -Method Post -Uri 'https://huggingface.co/api/repos/create' -Headers $headers -Body $body -ContentType 'application/json' -UseBasicParsing