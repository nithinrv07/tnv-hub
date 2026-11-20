const assert = require('assert');
const crypto = require('crypto');
const supabaseBridge = require('../supabase_bridge');

async function runTests() {
  console.log('Testing Task 1: Performance Caching (Auth & Snapshots)...');

  // Test 1: Snapshot Memory Cache
  console.log('  1. Testing snapshot cache...');
  const testKey = 'test_cache_' + Date.now();
  const testData = [{ id: 1, name: 'TNV Item' }];

  // Save snapshot
  await supabaseBridge.saveSupabaseSnapshot(testKey, testData);

  // Read snapshot - should hit cache
  const read1 = await supabaseBridge.getSupabaseSnapshot(testKey);
  assert.deepStrictEqual(read1, testData, 'Snapshot read1 matches saved data');

  // Update snapshot with new data
  const testData2 = [{ id: 1, name: 'TNV Item Updated' }, { id: 2, name: 'Second' }];
  await supabaseBridge.saveSupabaseSnapshot(testKey, testData2);

  // Read snapshot - should immediately reflect updated data
  const read2 = await supabaseBridge.getSupabaseSnapshot(testKey);
  assert.deepStrictEqual(read2, testData2, 'Snapshot read2 reflects invalidated/updated cache');

  // Test 2: Auth Profile In-Memory Cache (exposed via bridge or server helper)
  console.log('  2. Testing auth profile cache helper...');
  assert(typeof supabaseBridge.getCachedAuthProfile === 'function', 'getCachedAuthProfile exists');
  assert(typeof supabaseBridge.setCachedAuthProfile === 'function', 'setCachedAuthProfile exists');

  const testToken = 'test_token_' + crypto.randomBytes(8).toString('hex');
  const mockProfile = { id: 'usr_test', full_name: 'Test Volunteer', role: 'volunteer' };

  assert.strictEqual(supabaseBridge.getCachedAuthProfile(testToken), null, 'Cache miss for new token');

  supabaseBridge.setCachedAuthProfile(testToken, mockProfile, 60000);
  const cached = supabaseBridge.getCachedAuthProfile(testToken);
  assert.deepStrictEqual(cached, mockProfile, 'Cache hit for cached token');

  console.log('Task 1 Cache Tests Passed Successfully!');
}

runTests().catch(err => {
  console.error('Task 1 Test Failed:', err);
  process.exit(1);
});
