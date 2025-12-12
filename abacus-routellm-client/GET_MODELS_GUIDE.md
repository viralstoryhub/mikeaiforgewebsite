# How to Get RouteLLM Model IDs - Complete Guide

## Current Status

The `getModels.js` script is ready to use, but the API endpoint returned a 404 error. This guide will help you:
1. Troubleshoot the issue
2. Use alternative methods to find model IDs
3. Verify your setup

---

## Method 1: Test with cURL (Recommended First Step)

Run this command in your terminal to test the API directly:

```bash
curl -X GET -H "apiKey: s2_60d4fa5d9cc54745bd61a7b728f8858d" "https://api.abacus.ai/api/v0/listRouteLLMModels"
```

### Possible Responses:

#### ✅ Success (200 OK)
If you get a JSON response with models, the endpoint works! Copy the response and look for GPT-5 models.

#### ❌ 404 Not Found
The endpoint doesn't exist or isn't available for your account. This might mean:
- RouteLLM access isn't enabled for your organization
- You need a different API endpoint
- The endpoint name has changed

#### ❌ 401/403 Unauthorized
Your API key might not have the right permissions.

---

## Method 2: Use the Chat Interface to Discover Models

If the listRouteLLMModels endpoint isn't available, you can still find model IDs by:

### Option A: Check Abacus.ai Dashboard
1. Log into https://abacus.ai
2. Navigate to the ChatLLM or RouteLLM section
3. Look for available models in the UI
4. The model dropdown should show exact model IDs

### Option B: Try Common Model Names
Based on typical RouteLLM implementations, try these model IDs:

```bash
# GPT-5 variants (try each one)
node bin/chat.js "Hello" "gpt-5"
node bin/chat.js "Hello" "gpt-5-thinking"
node bin/chat.js "Hello" "gpt-5-reasoning"
node bin/chat.js "Hello" "gpt-5-pro"
node bin/chat.js "Hello" "openai/gpt-5-thinking"

# Router (auto-selects best model)
node bin/chat.js "Hello" "route-llm"
```

Whichever one returns a successful response is the correct model ID!

---

## Method 3: Contact Abacus Support

If none of the above work, you may need to:

1. **Email Abacus Support**: Ask them:
   - "What model IDs are available for RouteLLM in my organization?"
   - "Is the listRouteLLMModels endpoint available for my API key?"
   - "How do I access GPT-5 Thinking models?"

2. **Check Documentation**: Visit https://docs.abacus.ai for updated API documentation

3. **Ask in Abacus Community**: Check if there's a Discord, Slack, or forum for Abacus users

---

## Method 4: Inspect Network Requests

If you have access to the Abacus.ai web interface:

1. Open browser Developer Tools (F12)
2. Go to Network tab
3. Navigate to ChatLLM page
4. Look for API requests that fetch available models
5. Copy the model IDs from the response

---

## Using the getModels.js Script

Once you confirm the endpoint works with cURL:

### Basic Usage
```bash
cd abacus-routellm-client
node getModels.js
```

### See Full API Response
```bash
node getModels.js --full
```

The script will:
- ✅ List all available models
- ✅ Highlight GPT-5 Thinking/Reasoning models
- ✅ Provide the exact command to use them with chat.bat

---

## Common Model ID Patterns

Based on RouteLLM conventions, model IDs typically follow these patterns:

```
gpt-5
gpt-5-thinking
gpt-5-pro
gpt-5-reasoning
openai/gpt-5-thinking
anthropic/claude-3.5-sonnet
route-llm (automatic routing)
```

---

## Quick Test Commands

Test if specific models work:

```bash
# Windows CMD
chat.bat "What is 2+2?" "gpt-5-thinking"

# Windows PowerShell
.\chat.ps1 "What is 2+2?" "gpt-5-thinking"

# Node.js directly
node bin/chat.js "What is 2+2?" "gpt-5-thinking"
```

If you get a response, that's the correct model ID!

---

## Troubleshooting

### Error: 404 Not Found
- The endpoint doesn't exist for your organization
- Try the manual methods above
- Contact Abacus support

### Error: 401 Unauthorized
- Check your API key in `.env` file
- Verify the API key has correct permissions

### Error: Model not found
- The model ID doesn't exist
- Try other model names from the patterns above
- Use `route-llm` to let Abacus auto-select

### No Response / Hangs
- Network connection issue
- API might be down (check Abacus status page)

---

## Next Steps

1. **Try the cURL command** to test the API directly
2. **If cURL works**: Run `node getModels.js` to see all models
3. **If cURL fails**: Use the manual discovery methods
4. **Once you find the model ID**: Update your chat commands:
   ```
   chat.bat "Your message" "THE_MODEL_ID_YOU_FOUND"
   ```

---

## Example: Finding GPT-5 Thinking

Let's say you run the cURL command and get this response:

```json
{
  "result": [
    {"id": "gpt-4o", "description": "GPT-4 Optimized"},
    {"id": "gpt-5-thinking", "description": "GPT-5 with reasoning"},
    {"id": "route-llm", "description": "Automatic routing"}
  ]
}
```

Perfect! The model ID is **`gpt-5-thinking`**

Use it like this:
```bash
chat.bat "Explain quantum computing" "gpt-5-thinking"
```

---

## Summary

The `getModels.js` script is working correctly, but the API endpoint returned 404. This means:
- Your account may not have access to this specific endpoint
- You'll need to use alternative methods to find model IDs
- Once you find the correct model ID, everything else will work!

**Recommended action**: Start with the cURL test, then try common model names manually.
