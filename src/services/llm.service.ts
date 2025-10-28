import axios from 'axios';
import config from '../config';

export async function callLLM(prompt: string): Promise<string> {
  if (!config.openrouterKey) {
    return `I don't have an OpenRouter API key. Prompt: ${prompt.slice(0, 100)}...`;
  }

  try {
    const resp = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: process.env.OPENROUTER_MODEL || 'openai/gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${config.openrouterKey}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'RAG Chatbot Test',
        },
        timeout: 20000,
      }
    );

    return resp.data.choices?.[0]?.message?.content?.trim() || 'No response';
  } catch (err: any) {
    console.error('[LLM] call failed:', err.response?.data || err.message);
    throw new Error('LLM call failed');
  }
}