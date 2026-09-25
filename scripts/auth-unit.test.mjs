import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext, canManage } from "../lib/auth/redirect.ts";
import {
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  validateEmail,
  validateFullName,
  validatePassword,
} from "../lib/auth/validation.ts";

test("Auth redirects accept only known local destinations", () => {
  for (const path of [
    "/account",
    "/reset-password",
    "/admin",
    "/admin/events/abc/appearance",
    "/e/discoveries-2026/claim",
    "/scan/main-entrance",
  ]) {
    assert.equal(safeNext(path), path);
  }

  for (const path of [
    null,
    [],
    {},
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/%2f%2fevil.test",
    "/admin/../auth/callback",
    "/account?next=https://evil.test",
    "/login",
    "/auth/callback",
    "/account\n",
  ]) {
    assert.equal(safeNext(path), "/account");
  }
});

test("Only trusted organizer roles manage the dashboard", () => {
  for (const role of ["owner", "admin"]) assert.equal(canManage(role), true);
  for (const role of ["staff", "visitor", "ADMIN", "", "administrator"]) {
    assert.equal(canManage(role), false);
  }
});

test("Email and registration input validation is conservative", () => {
  assert.equal(normalizeEmail("  USER@Example.COM "), "user@example.com");
  assert.equal(validateEmail("user@example.com"), true);
  assert.equal(validateEmail("not-an-email"), false);
  assert.equal(validateFullName("Vallian Tito"), true);
  assert.equal(validateFullName("x"), false);
  assert.equal(validatePassword("a".repeat(MIN_PASSWORD_LENGTH)), true);
  assert.equal(validatePassword("a".repeat(MIN_PASSWORD_LENGTH - 1)), false);
  assert.equal(validatePassword("a".repeat(129)), false);
});
