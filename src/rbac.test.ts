import "dotenv/config";

import { beforeAll, beforeEach, describe, expect, test } from "@jest/globals";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./db/schema.js";
import { createPostgresRBAC } from "./rbac.js";

const permissions = [
  "service.component.create",
  "service.component.read",
  "service.component.update",
  "service.component.delete",
] as const;

type Permission = (typeof permissions)[number];

const roles = [
  "roles/service.componentCreator",
  "roles/service.componentReader",
  "roles/service.componentUpdater",
  "roles/service.componentDeleter",
  "roles/service.componentAdmin",
] as const;

type Role = (typeof roles)[number];

const subjects = ["user:example@example.com"] as const;

type Subject = (typeof subjects)[number];

let sql: ReturnType<typeof neon>;
let db: ReturnType<typeof drizzle<typeof schema>>;
let rbac: ReturnType<typeof createPostgresRBAC<Permission, Role, Subject>>;

beforeAll(() => {
  sql = neon(String(process.env.DATABASE_URL));
  db = drizzle(sql, { schema });
  rbac = createPostgresRBAC(db);
});

beforeEach(() => {
  return Promise.all([
    db.delete(schema.roles),
    db.delete(schema.permissions),
    db.delete(schema.subjects),
  ]);
});

describe("permission -> role", () => {
  test("assignPermissionToRole assigns permission to role", async () => {
    const permission: Permission = "service.component.create";
    const role: Role = "roles/service.componentCreator";

    await rbac.assignPermissionToRole(permission, role);
    const hasPermission = await rbac.roleHasPermission(role, permission);

    expect(hasPermission).toBe(true);
  });

  test("removePermissionFromRole removes permission from role", async () => {
    const permission: Permission = "service.component.read";
    const role: Role = "roles/service.componentReader";

    await rbac.assignPermissionToRole(permission, role);
    await rbac.removePermissionFromRole(permission, role);
    const hasPermission = await rbac.roleHasPermission(role, permission);

    expect(hasPermission).toBe(false);
  });
});

describe("role -> subject", () => {
  test("assignRoleToSubject assigns role to subject", async () => {
    const role: Role = "roles/service.componentUpdater";
    const subject: Subject = "user:example@example.com";

    await rbac.assignRoleToSubject(role, subject);
    const hasRole = await rbac.subjectHasRole(subject, role);

    expect(hasRole).toBe(true);
  });

  describe("removeRoleFromSubject", () => {
    test("removes role from subject", async () => {
      const role: Role = "roles/service.componentDeleter";
      const subject: Subject = "user:example@example.com";

      await rbac.assignRoleToSubject(role, subject);
      await rbac.removeRoleFromSubject(role, subject);
      const hasRole = await rbac.subjectHasRole(subject, role);

      expect(hasRole).toBe(false);
    });
  });

  describe("subjectHasPermission", () => {
    test("returns true if subject has permission", async () => {
      const role: Role = "roles/service.componentAdmin";
      const permission: Permission = "service.component.create";
      const subject: Subject = "user:example@example.com";

      await rbac.assignPermissionToRole(permission, role);
      await rbac.assignRoleToSubject(role, subject);

      const hasPermission = await rbac.subjectHasPermission(
        subject,
        permission
      );

      expect(hasPermission).toBe(true);
    });

    test("returns false if subject or role are not registered", async () => {
      const permission: Permission = "service.component.create";
      const subject: Subject = "user:example@example.com";

      const hasPermission = await rbac.subjectHasPermission(
        subject,
        permission
      );

      expect(hasPermission).toBe(false);
    });

    test("returns false if subject does not have role with provided permission", async () => {
      const role: Role = "roles/service.componentDeleter";
      const permission: Permission = "service.component.delete";
      const otherRole: Role = "roles/service.componentCreator";
      const otherPermission: Permission = "service.component.create";
      const subject: Subject = "user:example@example.com";

      await rbac.assignPermissionToRole(permission, role);
      await rbac.assignPermissionToRole(otherPermission, otherRole);
      await rbac.assignRoleToSubject(otherRole, subject);

      const hasPermission = await rbac.subjectHasPermission(
        subject,
        permission
      );

      expect(hasPermission).toBe(false);
    });
  });
});
