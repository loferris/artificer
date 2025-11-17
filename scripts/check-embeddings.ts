import * as dotenv from 'dotenv';
dotenv.config();

async function checkEmbeddings() {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Test',
    },
  });
  const data = await res.json();
  const embeddingModels = data.data.filter((m: any) =>
    m.architecture?.modality?.includes('embedding') ||
    m.id.includes('embedding')
  );

  console.log(`Found ${embeddingModels.length} embedding models:`);
  embeddingModels.slice(0, 10).forEach((m: any) => {
    console.log(`  - ${m.id}`);
    console.log(`    Modality: ${m.architecture?.modality}`);
    console.log(`    Context: ${m.context_length}`);
  });
}

checkEmbeddings();
