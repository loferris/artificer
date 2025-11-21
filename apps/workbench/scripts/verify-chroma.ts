/**
 * Verify Chroma has indexed data
 */

import { ChromaClient } from 'chromadb';

async function verifyChroma() {
  const client = new ChromaClient({ path: 'http://localhost:8000' });

  console.log('🔍 Checking Chroma collections...\n');

  try {
    // List all collections
    const collections = await client.listCollections();
    console.log(`Found ${collections.length} collections:`);

    for (const coll of collections) {
      console.log(`\n📦 Collection: ${coll.name}`);
      console.log(`   Metadata:`, coll.metadata);

      // Get collection and count items
      const collection = await client.getCollection({
        name: coll.name,
        // @ts-ignore
        embeddingFunction: null,
      });
      const count = await collection.count();
      console.log(`   Items: ${count}`);

      if (count > 0) {
        // Get a few items
        const items = await collection.get({ limit: 3 });
        console.log(`   Sample IDs:`, items.ids?.slice(0, 3));
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

verifyChroma();
