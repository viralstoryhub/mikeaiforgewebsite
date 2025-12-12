import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Default base URL from the RouteLLM API documentation
const DEFAULT_BASE_URL = 'https://routellm.abacus.ai/v1';

/**
 * Sleep utility for retry backoff
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send a chat request to Abacus.AI RouteLLM
 * @param {Object} options - Configuration options
 * @param {string} options.model - Model name (e.g., "route-llm")
 * @param {Array} options.messages - Array of message objects with role and content
 * @param {Object} options.params - Optional parameters (temperature, max_tokens, etc.)
 * @param {string} options.baseUrl - Optional base URL override
 * @param {string} options.apiKey - Optional API key override
 * @returns {Promise<Object>} The API response
 */
export async function sendChat({ model, messages, params = {}, baseUrl, apiKey }) {
  // Validate required parameters
  if (!model) {
    throw new Error('Model parameter is required');
  }
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new Error('Messages must be a non-empty array');
  }

  // Determine base URL and API key
  const finalBaseUrl = baseUrl || process.env.ABACUS_API_BASE_URL || DEFAULT_BASE_URL;
  const finalApiKey = apiKey || process.env.ABACUS_API_KEY;

  if (!finalApiKey) {
    throw new Error('API key is required. Set ABACUS_API_KEY environment variable or pass apiKey parameter.');
  }

  // Construct the endpoint URL
  const endpoint = `${finalBaseUrl}/chat/completions`;

  // Build request body according to RouteLLM schema
  const requestBody = {
    model,
    messages,
    ...params
  };

  // Configure axios request
  const axiosConfig = {
    method: 'POST',
    url: endpoint,
    headers: {
      'Authorization': `Bearer ${finalApiKey}`,
      'Content-Type': 'application/json'
    },
    data: requestBody,
    timeout: 60000 // 60 second timeout
  };

  // Retry logic with exponential backoff
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios(axiosConfig);
      
      // Return the full response data
      return response.data;
    } catch (error) {
      lastError = error;

      // Extract error details
      const status = error.response?.status;
      const errorMessage = error.response?.data?.error?.message || error.message;

      // Retry on 429 (rate limit) or 5xx (server errors)
      const shouldRetry = (status === 429 || (status >= 500 && status < 600)) && attempt < maxRetries;

      if (shouldRetry) {
        // Exponential backoff: 2^attempt seconds
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.error(`Request failed with status ${status}. Retrying in ${backoffMs / 1000}s... (Attempt ${attempt}/${maxRetries})`);
        await sleep(backoffMs);
        continue;
      }

      // Throw a helpful error for non-retryable cases or after max retries
      const fullError = error.response?.data ? JSON.stringify(error.response.data, null, 2) : errorMessage;
      throw new Error(
        `Abacus.AI RouteLLM API Error (Status ${status || 'Unknown'}): ${fullError}`
      );
    }
  }

  // If we exhausted all retries
  throw new Error(`Failed after ${maxRetries} attempts. Last error: ${lastError.message}`);
}

/**
 * Extract the assistant's message content from the API response
 * @param {Object} response - The API response from sendChat
 * @returns {string} The assistant's message content
 */
export function extractContent(response) {
  try {
    // Follow OpenAI-compatible response structure
    return response.choices?.[0]?.message?.content || '';
  } catch (error) {
    throw new Error('Failed to extract content from API response');
  }
}
