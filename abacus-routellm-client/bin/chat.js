#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { readFileSync } from 'fs';
import { sendChat, extractContent } from '../src/abacusClient.js';

// Parse command-line arguments
const argv = yargs(hideBin(process.argv))
  .option('model', {
    alias: 'm',
    type: 'string',
    description: 'Model name (e.g., "route-llm")',
    demandOption: true
  })
  .option('user', {
    alias: 'u',
    type: 'string',
    description: 'User message (one-shot)'
  })
  .option('file', {
    alias: 'f',
    type: 'string',
    description: 'Path to JSON file containing messages array'
  })
  .option('temperature', {
    alias: 't',
    type: 'number',
    description: 'Temperature for response generation'
  })
  .option('max_tokens', {
    type: 'number',
    description: 'Maximum tokens in response'
  })
  .option('top_p', {
    type: 'number',
    description: 'Top-p sampling parameter'
  })
  .option('stream', {
    type: 'boolean',
    description: 'Enable streaming (if supported)',
    default: false
  })
  .check((argv) => {
    // Must provide either --user or --file
    if (!argv.user && !argv.file) {
      throw new Error('Must provide either --user or --file');
    }
    if (argv.user && argv.file) {
      throw new Error('Cannot use both --user and --file at the same time');
    }
    return true;
  })
  .help()
  .alias('help', 'h')
  .example('$0 --model route-llm --user "Hello from VS Code"', 'Send a simple message')
  .example('$0 --model route-llm --file ./examples/hello.json', 'Send messages from a file')
  .example('$0 -m route-llm -u "Explain AI" --temperature 0.7', 'With temperature parameter')
  .argv;

async function main() {
  try {
    // Build messages array
    let messages;

    if (argv.file) {
      // Read messages from file
      const fileContent = readFileSync(argv.file, 'utf-8');
      const parsed = JSON.parse(fileContent);
      
      if (!parsed.messages || !Array.isArray(parsed.messages)) {
        throw new Error('File must contain a "messages" array');
      }
      
      messages = parsed.messages;
    } else {
      // Build messages from --user argument
      messages = [
        {
          role: 'user',
          content: argv.user
        }
      ];
    }

    // Build optional parameters
    const params = {};
    if (argv.temperature !== undefined) params.temperature = argv.temperature;
    if (argv.max_tokens !== undefined) params.max_tokens = argv.max_tokens;
    if (argv.top_p !== undefined) params.top_p = argv.top_p;
    if (argv.stream !== undefined) params.stream = argv.stream;

    // Call the API
    console.error('Sending request to Abacus.AI RouteLLM...\n');
    
    const response = await sendChat({
      model: argv.model,
      messages,
      params
    });

    // Extract and print the assistant's response
    const content = extractContent(response);
    
    if (content) {
      console.log(content);
    } else {
      console.error('No content in response');
      console.log(JSON.stringify(response, null, 2));
    }

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
