/**
 * Generate minimal PDF fixtures without external dependencies
 * These are simple but valid PDFs for basic testing
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pyFixturesDir = join(__dirname, '../python/tests/fixtures');
const tsFixturesDir = join(__dirname, '../src/server/services/image/__tests__/fixtures');

// Minimal valid PDF with one page of text
const singlePagePDF = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
>>
endobj
4 0 obj
<<
/Length 85
>>
stream
BT
/F1 12 Tf
50 750 Td
(Test Document) Tj
0 -20 Td
(This is a test PDF.) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000317 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
452
%%EOF
`;

// Minimal 2-page PDF
const twoPagePDF = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R 5 0 R]
/Count 2
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
>>
endobj
4 0 obj
<<
/Length 56
>>
stream
BT
/F1 12 Tf
50 750 Td
(Page 1) Tj
0 -20 Td
(Test content) Tj
ET
endstream
endobj
5 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 6 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
>>
endobj
6 0 obj
<<
/Length 56
>>
stream
BT
/F1 12 Tf
50 750 Td
(Page 2) Tj
0 -20 Td
(More content) Tj
ET
endstream
endobj
xref
0 7
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000123 00000 n
0000000325 00000 n
0000000430 00000 n
0000000632 00000 n
trailer
<<
/Size 7
/Root 1 0 R
>>
startxref
737
%%EOF
`;

console.log('Creating PDF fixtures...');

// Write single page PDF
writeFileSync(join(pyFixturesDir, 'sample-1page.pdf'), singlePagePDF);
console.log('Created sample-1page.pdf');

// Write 2-page PDF for TypeScript
writeFileSync(join(tsFixturesDir, 'sample-2page.pdf'), twoPagePDF);
console.log('Created sample-2page.pdf');

// Write multi-page PDF (5 pages)
// Generate a 5-page PDF programmatically
const pages = [];
for (let i = 1; i <= 5; i++) {
  pages.push({
    pageObj: `${3 + (i - 1) * 2} 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents ${3 + (i - 1) * 2 + 1} 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
>>
endobj`,
    contentObj: `${3 + (i - 1) * 2 + 1} 0 obj
<<
/Length 60
>>
stream
BT
/F1 12 Tf
50 750 Td
(Page ${i}) Tj
0 -20 Td
(Test content for page ${i}) Tj
ET
endstream
endobj`,
  });
}

const multiPagePDF = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [${pages.map((_, i) => `${3 + i * 2} 0 R`).join(' ')}]
/Count 5
>>
endobj
${pages.map(p => p.pageObj).join('\n')}
${pages.map(p => p.contentObj).join('\n')}
xref
0 ${3 + pages.length * 2}
${'0000000000 65535 f \n'}${Array.from({ length: 2 + pages.length * 2 }, (_, i) => {
  // Approximate offsets (good enough for testing)
  return `${String(100 + i * 200).padStart(10, '0')} 00000 n \n`;
}).join('')}trailer
<<
/Size ${3 + pages.length * 2}
/Root 1 0 R
>>
startxref
${1000 + pages.length * 400}
%%EOF
`;

writeFileSync(join(pyFixturesDir, 'sample-multipage.pdf'), multiPagePDF);
console.log('Created sample-multipage.pdf');

console.log('✅ PDF fixtures created successfully!');
