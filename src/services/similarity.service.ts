import { knowledgeIndex } from './knowledge.service';
import { cosine } from '../utils/cosine';

export function retrieveTopK(queryEmbedding: number[], k = 3) {
  const scored = knowledgeIndex.map(item => ({ text: item.text, score: cosine(queryEmbedding, item.embedding) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
