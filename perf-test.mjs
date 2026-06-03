// Performance test — measure load time of localhost:3000
const RUNS = 5;
const results = [];

for (let i = 0; i < RUNS; i++) {
  const start = Date.now();
  const res = await fetch('http://localhost:3000/');
  const ttfb = Date.now() - start;
  const body = await res.text();
  const total = Date.now() - start;
  results.push({ run: i + 1, status: res.status, ttfb, total, size: body.length });
  console.log(`Run ${i + 1}: TTFB=${ttfb}ms | Total=${total}ms | Status=${res.status} | Size=${body.length}b`);
}

const avgTTFB = Math.round(results.reduce((s, r) => s + r.ttfb, 0) / RUNS);
const avgTotal = Math.round(results.reduce((s, r) => s + r.total, 0) / RUNS);
console.log(`\n=== SUMMARY (${RUNS} runs) ===`);
console.log(`Avg TTFB: ${avgTTFB}ms`);
console.log(`Avg Total: ${avgTotal}ms`);
console.log(avgTTFB < 50 ? '✅ Server response: FAST' : avgTTFB < 200 ? '⚠️ Server response: OK' : '🔴 Server response: SLOW');
