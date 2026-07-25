/**
 * QA-104: k6 load test for DeWordle game API.
 * Simulates concurrent players guessing words.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const baseUrl = __ENV.K6_BASE_URL || 'http://localhost:3001';
const errorRate = new Rate('errors');
const guessLatency = new Trend('guess_latency_ms', true);

export const options = {
  vus: parseInt(__ENV.K6_VUS || '50'),
  duration: __ENV.K6_DURATION || '2m',
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    errors: ['rate<0.01'],
    guess_latency_ms: ['p(95)<300'],
  },
};

const WORDS = ['CRANE', 'SLATE', 'TRACE', 'AUDIO', 'ARISE'];

export default function () {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];

  // Submit a guess
  const guessRes = http.post(
    `${baseUrl}/api/game/guess`,
    JSON.stringify({ word }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  guessLatency.add(guessRes.timings.duration);
  errorRate.add(guessRes.status >= 400);

  check(guessRes, {
    'guess status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'response has hints': (r) => {
      const body = JSON.parse(r.body as string);
      return Array.isArray(body?.hints);
    },
  });

  // Simulate think-time between guesses
  sleep(Math.random() * 2 + 1);
}