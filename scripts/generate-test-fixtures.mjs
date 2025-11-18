/**
 * Generate test fixtures for image processing tests
 * Run with: node scripts/generate-test-fixtures.mjs
 */

import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tsFixturesDir = join(__dirname, '../src/server/services/image/__tests__/fixtures');
const pyFixturesDir = join(__dirname, '../python/tests/fixtures');

async function generateFixtures() {
  console.log('Generating test fixtures...');

  // Ensure directories exist
  mkdirSync(tsFixturesDir, { recursive: true });
  mkdirSync(pyFixturesDir, { recursive: true });

  // 1. Simple 100x100 red PNG
  console.log('Creating test-100x100.png...');
  await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .png()
    .toFile(join(tsFixturesDir, 'test-100x100.png'));

  await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .png()
    .toFile(join(pyFixturesDir, 'sample-image.png'));

  // 2. Larger 500x500 blue PNG
  console.log('Creating sample-500x500.png...');
  await sharp({
    create: {
      width: 500,
      height: 500,
      channels: 3,
      background: { r: 0, g: 0, b: 255 },
    },
  })
    .png()
    .toFile(join(pyFixturesDir, 'sample-500x500.png'));

  // 3. Large 2000x2000 JPEG (for performance testing)
  console.log('Creating test-2000x2000.jpg...');
  await sharp({
    create: {
      width: 2000,
      height: 2000,
      channels: 3,
      background: { r: 0, g: 255, b: 0 },
    },
  })
    .jpeg({ quality: 90 })
    .toFile(join(tsFixturesDir, 'test-2000x2000.jpg'));

  // 4. Invalid image data
  console.log('Creating invalid.bin...');
  writeFileSync(
    join(tsFixturesDir, 'invalid.bin'),
    Buffer.from('This is not a valid image file')
  );
  writeFileSync(
    join(pyFixturesDir, 'invalid-image.bin'),
    Buffer.from('This is not a valid image file')
  );

  // 5. Sample text file for Python text processor
  console.log('Creating sample-text.txt...');
  const sampleText = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. `.repeat(100);
  writeFileSync(join(pyFixturesDir, 'sample-text.txt'), sampleText);

  // 6. Sample markdown file
  console.log('Creating sample.md...');
  const sampleMarkdown = `---
title: Test Document
tags: [test, markdown]
author: Test User
---

# Hello World

This is a **test** document with some _formatting_.

## Features

- Item 1
- Item 2
- Item 3

### Code Example

\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

### Links and Images

Check out [[Another Page]] for more details.

[External Link](https://example.com)

> This is a blockquote

| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`;
  writeFileSync(join(pyFixturesDir, 'sample.md'), sampleMarkdown);

  // 7. Invalid PDF
  console.log('Creating invalid-pdf.bin...');
  writeFileSync(
    join(pyFixturesDir, 'invalid-pdf.bin'),
    Buffer.from('%PDF-1.4\nThis is not a valid PDF')
  );

  console.log('✅ Test fixtures generated successfully!');
  console.log(`  TypeScript fixtures: ${tsFixturesDir}`);
  console.log(`  Python fixtures: ${pyFixturesDir}`);
}

generateFixtures().catch(console.error);
