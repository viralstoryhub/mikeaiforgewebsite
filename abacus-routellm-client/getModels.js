import 'dotenv/config';
import fetch from 'node-fetch';

async function getModels() {
  const apiKey = process.env.ABACUS_API_KEY;
  
  if (!apiKey) {
    console.error('Error: ABACUS_API_KEY not found in environment variables.');
    console.error('Please set it in your .env file or as an environment variable.');
    process.exit(1);
  }

  try {
    console.log('Fetching RouteLLM models from Abacus.ai...\n');
    
    const res = await fetch("https://api.abacus.ai/api/v0/listRouteLLMModels", {
      headers: { "apiKey": apiKey }
    });
    
    if (!res.ok) {
      throw new Error(`API request failed with status ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    
    // Display full response if requested
    const showFull = process.argv.includes('--full');
    if (showFull) {
      console.log('=== FULL API RESPONSE ===');
      console.log(JSON.stringify(data, null, 2));
      console.log('\n');
    }
    
    // Extract models array from response
    const models = data.result || data.models || [];
    
    if (!models.length) {
      console.log('No models found in the response.');
      return;
    }
    
    console.log(`Found ${models.length} total models.\n`);
    
    // Display all models in a simple table format
    console.log('=== ALL AVAILABLE MODELS ===');
    console.log('Model ID'.padEnd(50) + 'Description');
    console.log('-'.repeat(100));
    models.forEach(model => {
      const id = model.id || model.name || 'Unknown';
      const desc = model.description || model.displayName || '';
      console.log(id.padEnd(50) + desc);
    });
    
    // Filter for GPT-5 Thinking/Reasoning models
    console.log('\n=== GPT-5 THINKING/REASONING MODELS ===');
    const gpt5ThinkingModels = models.filter(m => {
      const searchString = ((m.id || m.name || '') + ' ' + (m.description || m.displayName || '')).toLowerCase();
      return searchString.includes('gpt-5') && (searchString.includes('thinking') || searchString.includes('reasoning'));
    });
    
    if (gpt5ThinkingModels.length > 0) {
      console.log('Found GPT-5 Thinking models:\n');
      gpt5ThinkingModels.forEach(model => {
        console.log(`Model ID: ${model.id || model.name}`);
        if (model.description || model.displayName) {
          console.log(`Description: ${model.description || model.displayName}`);
        }
        if (model.cost || model.rate) {
          console.log(`Rate: ${JSON.stringify(model.cost || model.rate)}`);
        }
        console.log('');
      });
      
      console.log('To use in chat.bat, run:');
      console.log(`  chat.bat "Your message" "${gpt5ThinkingModels[0].id || gpt5ThinkingModels[0].name}"`);
    } else {
      console.log('No GPT-5 Thinking/Reasoning models found.');
      console.log('\nTry using one of these alternatives:');
      
      // Show GPT-5 models if available
      const gpt5Models = models.filter(m => {
        const s = ((m.id || m.name || '')).toLowerCase();
        return s.includes('gpt-5');
      });
      
      if (gpt5Models.length > 0) {
        console.log('\nGPT-5 models (may include thinking capabilities):');
        gpt5Models.forEach(m => console.log(`  - ${m.id || m.name}`));
      }
      
      // Show route-llm option
      console.log('\nOr use the router to automatically select the best model:');
      console.log('  - route-llm');
    }
    
  } catch (error) {
    console.error('Error fetching models:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
    }
    process.exit(1);
  }
}

// Run if called directly
getModels();

export { getModels };
