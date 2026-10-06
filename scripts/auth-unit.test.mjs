import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeNext, canManage } from '../lib/auth/redirect.ts';
test('email authentication redirects accept only known local destinations', () => {
  for (const path of ['/account','/profile','/organizer/events','/organizer/events/abc/design','/e/adorne-nails-exhibition/claim','/scan/main-entrance']) assert.equal(safeNext(path),path);
  for (const path of [null,[],{},'https://evil.test','//evil.test','/\\evil.test','/%2f%2fevil.test','/organizer/events/../auth/callback','/account?next=https://evil.test','/login','/auth/callback','/account\n']) assert.equal(safeNext(path),'/account');
});
test('Only trusted organizer roles manage the dashboard', () => {
  for (const role of ['owner','admin']) assert.equal(canManage(role),true);
  for (const role of ['staff','visitor','ADMIN','', 'administrator']) assert.equal(canManage(role),false);
});
test('crew invitations survive login without permitting arbitrary redirect queries', () => {
  const token = 'Ab12_-'.repeat(5) + 'Z9';
  const invitation = `/crew/join?token=${token}`;
  assert.equal(safeNext(invitation), invitation);
  for (const path of [
    '/crew/join?token=short',
    `${invitation}&next=https://evil.test`,
    `${invitation}#redirect`,
    `${invitation}\n`,
    '/crew/join?token=%2f%2fevil.test',
  ]) assert.equal(safeNext(path), '/account');
});
