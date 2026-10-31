import { test } from "node:test";
import assert from "node:assert/strict";
import { createMatchmakingSearch } from "../src/lib/matchmakingSearch.ts";

const flush = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

test("matchmaking starts exactly one request and ignores repeated starts", async () => {
  const first = deferred();
  const second = deferred();
  let polls = 0;
  let cancels = 0;
  const controller = createMatchmakingSearch({
    poll: () => { polls += 1; return polls === 1 ? first.promise : second.promise; },
    cancel: async () => { cancels += 1; },
    onMatch: () => assert.fail("cancelled search must not navigate"),
    onError: () => assert.fail("search must not fail"),
  });
  assert.equal(controller.start(), true);
  assert.equal(controller.start(), false);
  await flush();
  assert.equal(polls, 1);
  assert.equal(controller.isSearching(), true);
  const stopped = controller.stop();
  assert.equal(controller.isSearching(), false);
  assert.equal(cancels, 0, "queue deletion must wait until the poll settles");
  first.resolve({ roomId: "room-after-cancel" });
  await stopped;
  assert.equal(cancels, 1);
  assert.equal(controller.start(), true, "a fully cancelled search can be restarted");
  await flush();
  // This new request is still outstanding; resolve it before cleaning up.
  assert.equal(polls, 2);
  const stoppedAgain = controller.stop();
  second.resolve({ queued: true });
  await stoppedAgain;
  assert.equal(cancels, 2);
});

test("queued results schedule exactly one later poll, then navigate once", async () => {
  const callbacks = [];
  let polls = 0;
  const matches = [];
  const controller = createMatchmakingSearch({
    poll: async () => {
      polls += 1;
      return polls === 1 ? { queued: true } : { roomId: "the-room" };
    },
    cancel: async () => assert.fail("matched searches must not delete an unrelated ticket"),
    onMatch: (id) => matches.push(id),
    onError: () => assert.fail("search must not fail"),
    intervalMs: 50,
    schedule: (callback) => { callbacks.push(callback); return 1; },
    clearScheduled: () => {},
  });
  controller.start();
  await flush();
  assert.equal(polls, 1);
  assert.equal(callbacks.length, 1);
  callbacks.shift()();
  await flush();
  assert.equal(polls, 2);
  assert.deepEqual(matches, ["the-room"]);
  assert.equal(controller.isSearching(), false);
  assert.equal(controller.start(), false, "a matched session is not restarted");
});

test("cancelling after a queued poll clears the retry timer and queue", async () => {
  const callbacks = [];
  let cleared = 0;
  let polls = 0;
  let cancels = 0;
  const controller = createMatchmakingSearch({
    poll: async () => { polls += 1; return { queued: true }; },
    cancel: async () => { cancels += 1; },
    onMatch: () => assert.fail("should not match"),
    onError: () => assert.fail("should not fail"),
    schedule: (callback) => { callbacks.push(callback); return 9; },
    clearScheduled: (handle) => { assert.equal(handle, 9); cleared += 1; },
  });
  controller.start();
  await flush();
  assert.equal(callbacks.length, 1);
  await controller.stop();
  assert.equal(cleared, 1);
  assert.equal(cancels, 1);
  callbacks.shift()(); // Even if an already queued browser callback fires, it cannot poll.
  await flush();
  assert.equal(polls, 1);
});

test("a failed poll cleans the queue before exposing an error or allowing a retry", async () => {
  let cancels = 0;
  const errors = [];
  const controller = createMatchmakingSearch({
    poll: async () => { throw new Error("Connection lost"); },
    cancel: async () => { cancels += 1; },
    onMatch: () => assert.fail("should not match"),
    onError: (e) => errors.push(e.message),
  });
  controller.start();
  await flush();
  assert.equal(cancels, 1);
  assert.deepEqual(errors, ["Connection lost"]);
  assert.equal(controller.isSearching(), false);
  assert.equal(controller.start(), true);
  await flush();
  assert.equal(cancels, 2);
  assert.deepEqual(errors, ["Connection lost", "Connection lost"]);
});

test("a rejected cancellation still prevents late match navigation", async () => {
  const request = deferred();
  let cancellationAttempts = 0;
  const controller = createMatchmakingSearch({
    poll: () => request.promise,
    cancel: async () => {
      cancellationAttempts += 1;
      if (cancellationAttempts === 1) throw new Error("Queue could not be cleared");
    },
    onMatch: () => assert.fail("cancelled request must not navigate"),
    onError: () => {},
  });
  controller.start();
  await flush();
  const pending = controller.stop();
  request.resolve({ roomId: "too-late" });
  await assert.rejects(pending, /Queue could not be cleared/);
  assert.equal(controller.isSearching(), false);
  assert.equal(controller.needsCleanup(), true);
  assert.equal(controller.start(), false, "uncertain queue cannot be restarted");
  await controller.stop();
  assert.equal(cancellationAttempts, 2);
  assert.equal(controller.needsCleanup(), false);
  assert.equal(controller.start(), true);
  // Restart is allowed only after a successful cleanup, and remains cancellable.
  await controller.stop();
  assert.equal(controller.isSearching(), false);
});
