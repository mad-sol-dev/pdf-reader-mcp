#!/usr/bin/env node

/**
 * Quick test script for insert_markers feature
 * Tests the new content markers functionality
 */

import { pdfReadPages } from './dist/handlers/readPages.js';

async function testInsertMarkers() {
  console.log('🧪 Testing insert_markers feature...\n');

  // Test PDF path - using the vendor datasheet from earlier
  const testPdfPath = '/home/martinm/programme/Projekte/zk-inkjet-printer/docs/vendor/N3290X.PDF';

  try {
    // Test 1: Without markers (existing behavior)
    console.log('Test 1: Reading page 1 WITHOUT markers...');
    const result1 = await pdfReadPages.handler({
      input: {
        sources: [{ path: testPdfPath, pages: '1' }],
        insert_markers: false,
        include_image_indexes: true,
      },
    });

    const response1 = JSON.parse(result1[0].content);
    const page1 = response1.results[0].data.pages[0];

    console.log('  Page 1 text preview (first 200 chars):');
    console.log(`  ${page1.text.substring(0, 200).replace(/\n/g, '\\n')}`);
    console.log('  Image indexes:', page1.image_indexes || 'none');
    console.log(
      '  Contains [IMAGE markers:',
      page1.text.includes('[IMAGE') ? 'YES ❌ (should be NO)' : 'NO ✅'
    );
    console.log('');

    // Test 2: With markers (new behavior)
    console.log('Test 2: Reading page 1 WITH markers...');
    const result2 = await pdfReadPages.handler({
      input: {
        sources: [{ path: testPdfPath, pages: '1' }],
        insert_markers: true,
        include_image_indexes: true,
      },
    });

    const response2 = JSON.parse(result2[0].content);
    const page2 = response2.results[0].data.pages[0];

    console.log('  Page 1 text preview (first 500 chars):');
    console.log(`  ${page2.text.substring(0, 500).replace(/\n/g, '\n  ')}`);
    console.log('\n  Image indexes:', page2.image_indexes || 'none');
    console.log(
      '  Contains [IMAGE markers:',
      page2.text.includes('[IMAGE') ? 'YES ✅' : 'NO ❌ (should be YES)'
    );

    // Count markers
    const markerMatches = page2.text.match(/\[IMAGE \d+: \d+x\d+px/g);
    console.log('  Number of [IMAGE markers found:', markerMatches ? markerMatches.length : 0);
    console.log('');

    // Test 3: Multiple pages with markers
    console.log('Test 3: Reading pages 1-3 WITH markers...');
    const result3 = await pdfReadPages.handler({
      input: {
        sources: [{ path: testPdfPath, pages: '1-3' }],
        insert_markers: true,
      },
    });

    const response3 = JSON.parse(result3[0].content);
    const pages = response3.results[0].data.pages;

    console.log(`  Processed ${pages.length} pages`);
    for (const page of pages) {
      const markers = page.text.match(/\[IMAGE \d+:/g);
      console.log(`    Page ${page.page_number}: ${markers ? markers.length : 0} image marker(s)`);
    }
    console.log('');

    // Test 4: Verify backwards compatibility (no markers by default)
    console.log('Test 4: Backwards compatibility (insert_markers not specified)...');
    const result4 = await pdfReadPages.handler({
      input: {
        sources: [{ path: testPdfPath, pages: '1' }],
      },
    });

    const response4 = JSON.parse(result4[0].content);
    const page4 = response4.results[0].data.pages[0];
    const hasMarkers = page4.text.includes('[IMAGE');

    console.log(
      '  Contains markers:',
      hasMarkers ? 'YES ❌ (should be NO - breaking change!)' : 'NO ✅'
    );
    console.log('');

    console.log('✅ All tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testInsertMarkers();
