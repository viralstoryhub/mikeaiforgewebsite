# Abacus.AI RouteLLM Client

A minimal Node.js client and CLI for calling Abacus.AI RouteLLM chat API.

## 📋 Prerequisites

- Node.js 18+ installed
- Abacus.AI API key (get one from [Abacus.AI](https://abacus.ai))

## 🚀 Quick Start

### 1. Installation

```bash
cd abacus-routellm-client
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file and add your API key:

```bash
cp .env.example .env
```

Edit `.env` and add your API key:

```
ABACUS_API_KEY=your_actual_api_key_here
```

**Setting Environment Variables:**

**macOS/Linux:**
```bash
export ABACUS_API_KEY="your_api_key_here"
export ABACUS_API_BASE_URL="https://routellm.abacus.ai/v1"  # Optional
```

**Windows PowerShell:**
```powershell
$env:ABACUS_API_KEY="your_api_key_here"
$env:ABACUS_API_BASE_URL="https://routellm.abacus.ai/v1"  # Optional
```

**Windows Command Prompt:**
```cmd
set ABACUS_API_KEY=your_api_key_here
set ABACUS_API_BASE_URL=https://routellm.abacus.ai/v1
```

### 3. Run the CLI

**Simple message:**
```bash
node bin/chat.js --model "route-llm" --user "Hello from VS Code"
```

**Using a JSON file:**
```bash
node bin/chat.js --model "route-llm" --file ./examples/hello.json
```

**With optional parameters:**
```bash
node bin/chat.js --model "route-llm" --user "Explain quantum computing" --temperature 0.7 --max_tokens 500
```

## 📖 Usage

### CLI Options

```
Options:
  --model, -m        Model name (required)                          [string] [required]
  --user, -u         User message (one-shot)                        [string]
  --file, -f         Path to JSON file containing messages array    [string]
  --temperature, -t  Temperature for response generation            [number]
  --max_tokens       Maximum tokens in response                     [number]
  --top_p            Top-p sampling parameter                       [number]
  --stream           Enable streaming (if supported)                [boolean]
  --help, -h         Show help                                      [boolean]
```

### JSON File Format

Create a JSON file with a `messages` array:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "What is the meaning of life?"
    }
  ]
}
```

For multi-turn conversations:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello! Can you help me?"
    },
    {
      "role": "assistant",
      "content": "Of course! I'd be happy to help. What do you need?"
    },
    {
      "role": "user",
      "content": "Explain machine learning in simple terms."
    }
  ]
}
```

## 🔧 Using as a Library

You can import and use the client in your own Node.js projects:

```javascript
import { sendChat, extractContent } from './src/abacusClient.js';

async function example() {
  try {
    const response = await sendChat({
      model: 'route-llm',
      messages: [
        { role: 'user', content: 'Hello!' }
      ],
      params: {
        temperature: 0.7,
        max_tokens: 100
      }
    });

    const content = extractContent(response);
    console.log(content);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

example();
```

## 🛠️ API Client Features

- ✅ **Automatic retry logic** with exponential backoff for 429 and 5xx errors
- ✅ **60-second timeout** for requests
- ✅ **Environment variable support** for API keys and base URLs
- ✅ **OpenAI-compatible** response format
- ✅ **Comprehensive error handling** with helpful error messages
- ✅ **No hardcoded secrets** - all credentials via environment variables

## 📚 API Documentation

For complete API documentation, visit:
[RouteLLM APIs Documentation](https://abacus.ai/app/route-llm-apis)

### API Endpoint

**Base URL:** `https://routellm.abacus.ai/v1`  
**Endpoint:** `/chat/completions`  
**Method:** `POST`

### Request Schema

```json
{
  "model": "route-llm",
  "messages": [
    {
      "role": "user",
      "content": "Your message here"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 500,
  "top_p": 1.0,
  "stream": false
}
```

### Supported Parameters

- `max_tokens` - Maximum tokens in response
- `stream` - Enable streaming responses
- `temperature` - Controls randomness (0-2)
- `top_p` - Nucleus sampling parameter
- `stop` - Stop sequences
- `response_format` - Response format (only `json` supported)

## 🔒 Security Notes

- ⚠️ **Never commit your `.env` file** - it's already in `.gitignore`
- ⚠️ **Don't paste API keys in chat or code** - use environment variables
- ⚠️ **Rotate your keys regularly** for security
- ⚠️ **API keys are not printed** to console or logs

## 🐛 Troubleshooting

### "API key is required" error

Make sure you've set the `ABACUS_API_KEY` environment variable:

```bash
# Check if it's set
echo $ABACUS_API_KEY  # macOS/Linux
echo $env:ABACUS_API_KEY  # Windows PowerShell
```

### Network errors

The client includes automatic retry logic for transient errors. If you continue to see errors:

1. Check your internet connection
2. Verify the API endpoint is accessible
3. Ensure your API key is valid

### Module errors

If you see "Cannot find module" errors, ensure you're using Node.js 18+ and have run `npm install`.

## 📁 Project Structure

```
abacus-routellm-client/
├── bin/
│   └── chat.js              # CLI tool
├── src/
│   └── abacusClient.js      # Core API client
├── examples/
│   └── hello.json           # Example messages file
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
├── package.json             # Project metadata
└── README.md                # This file
```

## 📝 Examples

### Example 1: Simple Question

```bash
node bin/chat.js --model "route-llm" --user "What is 2+2?"
```

### Example 2: Creative Writing

```bash
node bin/chat.js --model "route-llm" --user "Write a haiku about coding" --temperature 0.9
```

### Example 3: Using a File

```bash
node bin/chat.js --model "route-llm" --file ./examples/hello.json
```

### Example 4: With Max Tokens

```bash
node bin/chat.js --model "route-llm" --user "Explain the universe" --max_tokens 200
```

## 📄 License

ISC

## 🔗 Links

- [Abacus.AI](https://abacus.ai)
- [RouteLLM API Documentation](https://abacus.ai/app/route-llm-apis)
- [Node.js](https://nodejs.org)

---

**Note:** This client is compatible with the OpenAI API format, so you can easily adapt it for other OpenAI-compatible endpoints.
