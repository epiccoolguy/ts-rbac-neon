import type { RBAC } from "@epiccoolguy/rbac";
import { and, eq, sql } from "drizzle-orm";
import { type NeonHttpDatabase } from "drizzle-orm/neon-http";

import type * as schema from "./db/schema.js";
import {
  permissions,
  rolePermissions,
  roles,
  subjects,
  subjectRoles,
} from "./db/schema.js";

export function createPostgresRBAC<
  P extends string = string,
  R extends string = string,
  S extends string = string
>(db: NeonHttpDatabase<typeof schema>): RBAC<P, R, S> {
  return {
    async assignPermissionToRole(permission: P, role: R): Promise<void> {
      await Promise.all([
        db
          .insert(permissions)
          .values({ name: permission })
          .onConflictDoNothing({ target: [permissions.name] }),
        db
          .insert(roles)
          .values({ name: role })
          .onConflictDoNothing({ target: [roles.name] }),
      ]);

      const [[{ id: permissionId }], [{ id: roleId }]] = await Promise.all([
        db
          .select({ id: permissions.id })
          .from(permissions)
          .where(eq(permissions.name, permission)),
        db.select({ id: roles.id }).from(roles).where(eq(roles.name, role)),
      ]);

      await db
        .insert(rolePermissions)
        .values({
          roleId,
          permissionId,
        })
        .onConflictDoNothing({
          target: [rolePermissions.roleId, rolePermissions.permissionId],
        });
    },

    async removePermissionFromRole(permission: P, role: R): Promise<void> {
      const [[{ roleId }], [{ permissionId }]] = await Promise.all([
        db.select({ roleId: roles.id }).from(roles).where(eq(roles.name, role)),
        db
          .select({ permissionId: permissions.id })
          .from(permissions)
          .where(eq(permissions.name, permission)),
      ]);

      await db
        .delete(rolePermissions)
        .where(
          and(
            eq(rolePermissions.roleId, roleId),
            eq(rolePermissions.permissionId, permissionId)
          )
        );
    },

    async roleHasPermission(role: R, permission: P): Promise<boolean> {
      const results = await db
        .select({ hasPermission: sql<number>`1` })
        .from(rolePermissions)
        .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
        .innerJoin(
          permissions,
          eq(rolePermissions.permissionId, permissions.id)
        )
        .where(and(eq(roles.name, role), eq(permissions.name, permission)));

      if (results.length === 0) {
        return false;
      }

      return true;
    },

    async assignRoleToSubject(role: R, subject: S): Promise<void> {
      await Promise.all([
        db
          .insert(roles)
          .values({ name: role })
          .onConflictDoNothing({ target: [roles.name] }),
        db
          .insert(subjects)
          .values({ name: subject })
          .onConflictDoNothing({ target: [subjects.name] }),
      ]);

      const [[{ id: roleId }], [{ id: subjectId }]] = await Promise.all([
        db.select({ id: roles.id }).from(roles).where(eq(roles.name, role)),
        db
          .select({ id: subjects.id })
          .from(subjects)
          .where(eq(subjects.name, subject)),
      ]);

      await db
        .insert(subjectRoles)
        .values({
          roleId,
          subjectId,
        })
        .onConflictDoNothing({
          target: [subjectRoles.roleId, subjectRoles.subjectId],
        });
    },

    async removeRoleFromSubject(role: R, subject: S): Promise<void> {
      const [[{ roleId }], [{ subjectId }]] = await Promise.all([
        db.select({ roleId: roles.id }).from(roles).where(eq(roles.name, role)),
        db
          .select({ subjectId: subjects.id })
          .from(subjects)
          .where(eq(subjects.name, subject)),
      ]);

      await db
        .delete(subjectRoles)
        .where(
          and(
            eq(subjectRoles.roleId, roleId),
            eq(subjectRoles.subjectId, subjectId)
          )
        );
    },

    async subjectHasRole(subject: S, role: R): Promise<boolean> {
      const results = await db
        .select({ hasRole: sql<number>`1` })
        .from(subjectRoles)
        .innerJoin(subjects, eq(subjectRoles.subjectId, subjects.id))
        .innerJoin(roles, eq(subjectRoles.roleId, roles.id))
        .where(and(eq(roles.name, role), eq(subjects.name, subject)));

      if (results.length === 0) {
        return false;
      }

      return true;
    },

    async subjectHasPermission(subject: S, permission: P): Promise<boolean> {
      const [subjectsResults, permissionsResults] = await Promise.all([
        db
          .select({ id: subjects.id })
          .from(subjects)
          .where(eq(subjects.name, subject)),
        db
          .select({ id: permissions.id })
          .from(permissions)
          .where(eq(permissions.name, permission)),
      ]);

      if (subjectsResults.length === 0 || permissionsResults.length === 0) {
        return false;
      }

      const [{ id: subjectId }] = subjectsResults;
      const [{ id: permissionId }] = permissionsResults;

      const results = await db
        .select({ hasPermission: sql<number>`1` })
        .from(subjectRoles)
        .innerJoin(
          rolePermissions,
          eq(rolePermissions.permissionId, permissionId)
        )
        .innerJoin(roles, eq(subjectRoles.roleId, roles.id))
        .where(
          and(
            eq(subjectRoles.subjectId, subjectId),
            eq(rolePermissions.roleId, roles.id)
          )
        );

      if (results.length === 0) {
        return false;
      }

      return true;
    },
  };
}
