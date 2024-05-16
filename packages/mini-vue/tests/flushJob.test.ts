import { expect, test } from 'vitest';
import { flushJob, jobQueue } from '../src/reactive/flushJob';

test('branch cleanup', () => {
  const res = [];
  function test() {
    res.push(1);
  }
  jobQueue.add(test);
  flushJob();
  jobQueue.add(test);
  flushJob();
  jobQueue.add(test);
  flushJob();
  expect(res.length).toBe(0);
});
