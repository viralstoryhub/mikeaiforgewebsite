# PowerShell helper script to chat with Abacus.AI RouteLLM
# Usage: .\chat.ps1 "Your message here"
# Or for different model: .\chat.ps1 "Your message" "model-name"

param(
    [Parameter(Mandatory=$true)]
    [string]$Message,
    
    [Parameter(Mandatory=$false)]
    [string]$Model = "gpt-5"
)

$env:ABACUS_API_KEY = "s2_a6941c55824141caab8bc6820a9bc0d7"

node bin/chat.js --model $Model --user $Message
