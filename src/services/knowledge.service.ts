import fs from 'fs/promises';
import path from 'path';
import { chunkText } from '../utils/chunker';
import { embedText } from './embedding.service';

type Item = { text: string; embedding: number[] };

export const knowledgeIndex: Item[] = [];

export async function initKnowledge(filePath = path.join(process.cwd(), 'knowledge.txt')) {
  const raw = await fs.readFile(filePath, 'utf8');
  const chunks = chunkText(raw, 250);
  const embeddings = await Promise.all(chunks.map(c => embedText(c)));
  for (let i = 0; i < chunks.length; i++) {
    knowledgeIndex.push({ text: chunks[i], embedding: embeddings[i] });
  }
  console.log(`Loaded ${knowledgeIndex.length} chunks into memory.`);
}
