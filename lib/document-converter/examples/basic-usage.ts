/**
 * Basic usage examples for the Document Converter library
 */

import { DocumentConverter } from '../src/index.js';

async function examples() {
  const converter = new DocumentConverter();

  // Example 1: Import Markdown
  console.log('Example 1: Import Markdown');
  const markdown = `---
title: My First Note
tags: example, test
---

# My First Note

This is a note with **bold** and *italic* text.

## Features

- Feature 1
- Feature 2
- Feature 3

\`\`\`typescript
const hello = "world";
console.log(hello);
\`\`\`

![An image](https://example.com/image.png)
`;

  const doc1 = await converter.import(markdown);
  console.log('Imported document:', JSON.stringify(doc1, null, 2));

  // Example 2: Export to Notion
  console.log('\nExample 2: Export to Notion');
  const notionJson = await converter.export(doc1, 'notion', {
    prettyPrint: true,
  });
  console.log('Notion format:', notionJson);

  // Example 3: Export to Roam
  console.log('\nExample 3: Export to Roam');
  const roamJson = await converter.export(doc1, 'roam', {
    prettyPrint: true,
  });
  console.log('Roam format:', roamJson);

  // Example 4: Direct conversion
  console.log('\nExample 4: Direct conversion (Markdown -> Notion)');
  const converted = await converter.convert(markdown, 'notion', {
    sourceFormat: 'markdown',
    exportOptions: { prettyPrint: true },
  });
  console.log('Converted:', converted);

  // Example 5: Import Notion
  console.log('\nExample 5: Import Notion');
  const notionInput = {
    object: 'page',
    id: 'test-page-id',
    properties: {
      title: {
        type: 'title',
        title: [{ plain_text: 'Notion Page' }],
      },
    },
    children: [
      {
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: [
            {
              type: 'text',
              text: { content: 'Welcome to Notion' },
              plain_text: 'Welcome to Notion',
            },
          ],
        },
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: { content: 'This is a ' },
              plain_text: 'This is a ',
            },
            {
              type: 'text',
              text: { content: 'formatted' },
              plain_text: 'formatted',
              annotations: { bold: true },
            },
            {
              type: 'text',
              text: { content: ' paragraph.' },
              plain_text: ' paragraph.',
            },
          ],
        },
      },
      {
        object: 'block',
        type: 'code',
        code: {
          rich_text: [
            {
              type: 'text',
              text: { content: 'console.log("Hello from Notion!");' },
              plain_text: 'console.log("Hello from Notion!");',
            },
          ],
          language: 'javascript',
        },
      },
    ],
  };

  const doc2 = await converter.import(JSON.stringify(notionInput), {
    format: 'notion',
  });
  console.log('Imported from Notion:', JSON.stringify(doc2, null, 2));

  // Example 6: Convert Notion to Markdown
  console.log('\nExample 6: Convert Notion to Markdown');
  const markdownFromNotion = await converter.export(doc2, 'markdown', {
    includeMetadata: true,
  });
  console.log('Markdown from Notion:\n', markdownFromNotion);

  // Example 7: Import Roam
  console.log('\nExample 7: Import Roam');
  const roamInput = {
    title: 'Daily Notes',
    'create-time': Date.now(),
    'edit-time': Date.now(),
    children: [
      {
        string: 'This is a **bullet point** with formatting',
        uid: 'abc123',
        children: [
          {
            string: 'Nested item with [[wiki link]]',
            uid: 'def456',
          },
        ],
      },
      {
        string: 'Second top-level item',
        uid: 'ghi789',
        heading: 2,
      },
    ],
  };

  const doc3 = await converter.import(JSON.stringify(roamInput), {
    format: 'roam',
  });
  console.log('Imported from Roam:', JSON.stringify(doc3, null, 2));

  // Example 8: Round-trip conversion
  console.log('\nExample 8: Round-trip (Markdown -> Portable Text -> Markdown)');
  const original = `# Title\n\nParagraph with **bold** text.\n\n- List item`;
  const imported = await converter.import(original);
  const exported = await converter.export(imported, 'markdown');
  console.log('Original:', original);
  console.log('After round-trip:', exported);

  // Example 9: List available plugins
  console.log('\nExample 9: Available plugins');
  console.log('Importers:', converter.listImporters());
  console.log('Exporters:', converter.listExporters());
}

// Run examples
examples().catch(console.error);
