import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function test() {
  const key = process.env['GEMINI_API_KEY']!;
  const gemini = new GoogleGenerativeAI(key);
  const models = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash-lite', 'gemini-1.5-flash-latest'];

  for (const m of models) {
    try {
      const model = gemini.getGenerativeModel({ model: m });
      const result = await model.generateContent('Reply with: "AI works"');
      console.log(`✅ ${m}: ${result.response.text().trim()}`);
      break;
    } catch (err: unknown) {
      const msg = (err as Error).message ?? ''
      if (msg.includes('429') || msg.includes('quota')) { console.log(`⚡ ${m}: quota exceeded`); }
      else if (msg.includes('404')) { console.log(`❌ ${m}: not found`); }
      else { console.log(`❌ ${m}: ${msg.substring(0, 80)}`); }
    }
  }
}
test();
