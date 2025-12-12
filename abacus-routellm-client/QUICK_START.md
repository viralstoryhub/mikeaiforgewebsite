# Quick Start Guide - Chat with GPT-5 Pro

Your API key is already set up in `chat.bat`! ✅

## 🚀 How to Chat (Super Easy!)

### Step 1: Open PowerShell in the correct folder

```powershell
cd c:\Users\mikes\Downloads\mikeaiforge-master\mikeaiforge-master\abacus-routellm-client
```

### Step 2: Use the chat helper script

**For PowerShell (RECOMMENDED):**
```powershell
.\chat.ps1 "Your message here"
```

**For Command Prompt:**
```cmd
chat.bat "Your message here"
```

**Examples (PowerShell):**

```powershell
.\chat.ps1 "Hello, how are you?"
```

```powershell
.\chat.ps1 "Explain quantum computing in simple terms"
```

```powershell
.\chat.ps1 "Write a poem about coding"
```

### Step 3: Using Different Models

**PowerShell:**
```powershell
.\chat.ps1 "Your message" "model-name"
```

**Command Prompt:**
```cmd
chat.bat "Your message" "model-name"
```

**Available models (from your screenshot):**
- GPT-5 Pro (default)
- GPT-5 Thinking
- GPT-4.1
- o3 High
- Grok Code Fast
- GPT-OSS 120B
- Qwen3 235B A228 2507
- Qwen3 Max
- And more...

**Example with specific model (PowerShell):**
```powershell
.\chat.ps1 "Hello" "o3 High"
```

```powershell
.\chat.ps1 "Explain AI" "Grok Code Fast"
```

## 📝 Alternative: Using the Full Command

If you prefer not to use the helper script:

```cmd
set ABACUS_API_KEY=s2_60d4fa5d9cc54745bd61a7b728f8858d
node bin/chat.js --model "GPT-5 Pro" --user "Your message here"
```

**With parameters:**
```cmd
node bin/chat.js --model "GPT-5 Pro" --user "Explain AI" --temperature 0.7 --max_tokens 500
```

## 🔧 Troubleshooting

### "Cannot find module" error?
Make sure you're in the correct directory:
```cmd
cd c:\Users\mikes\Downloads\mikeaiforge-master\mikeaiforge-master\abacus-routellm-client
```

### 402 Payment Required error?
- Your API key may need credits added to your Abacus.AI account
- Check your account status at https://abacus.ai

### Want to see available models?
- Check your Abacus.AI ChatLLM Teams interface (screenshot shows the models)
- Or try: `node bin/chat.js --help`

## 💡 Tips

1. **For longer conversations**, create a JSON file with multiple messages
2. **For better results**, adjust temperature (0.0-1.0, default ~0.7)
3. **To limit response length**, use --max_tokens parameter

## 📁 Your Project Location

```
c:\Users\mikes\Downloads\mikeaiforge-master\mikeaiforge-master\abacus-routellm-client\
```

## ⚡ Quick Test

Try this right now in **PowerShell**:

```powershell
cd c:\Users\mikes\Downloads\mikeaiforge-master\mikeaiforge-master\abacus-routellm-client
.\chat.ps1 "Test message - please respond with 'Success!'"
```

Or in **Command Prompt**:

```cmd
cd c:\Users\mikes\Downloads\mikeaiforge-master\mikeaiforge-master\abacus-routellm-client
chat.bat "Test message - please respond with 'Success!'"
```

If you see a response, you're all set! 🎉

---

**Need more help?** See README.md in this folder for complete documentation.
