import { BadRequestException } from '@nestjs/common';

/**
 * Small, explicit edits to an invitation, by dot path:
 *
 *   { op: "set",    path: "content.couple.partner1.father", value: "Mr. K.V. Mathew" }
 *   { op: "unset",  path: "content.hero.tagline" }           // removes a key, or an array item
 *   { op: "push",   path: "content.schedule.events", value: { … } }
 *   { op: "insert", path: "content.schedule.events.1", value: { … } }
 *   { op: "merge",  path: "content.dressCode", value: { note: "…" } }   // shallow
 *
 * Numbers in a path are array positions ("content.schedule.events.0.time").
 * Only these roots can be edited: content, theme, templateId, themeId,
 * motifId, ownerEmail.
 */
export type Op =
  | { op: 'set'; path: string; value: unknown }
  | { op: 'unset'; path: string }
  | { op: 'push'; path: string; value: unknown }
  | { op: 'insert'; path: string; value: unknown }
  | { op: 'merge'; path: string; value: Record<string, unknown> };

export const ROOTS = [
  'content',
  'theme',
  'templateId',
  'themeId',
  'motifId',
  'ownerEmail',
] as const;
const FORBIDDEN = new Set(['__proto__', 'prototype', 'constructor']);

type Bag = Record<string, unknown> | unknown[];

function split(path: unknown): string[] {
  if (typeof path !== 'string' || !path.trim())
    throw new BadRequestException('Each op needs a "path"');
  const parts = path.split('.').map((p) => p.trim());
  if (parts.some((p) => !p || FORBIDDEN.has(p)))
    throw new BadRequestException(`Bad path "${path}"`);
  if (!(ROOTS as readonly string[]).includes(parts[0])) {
    throw new BadRequestException(
      `"${path}" must start with one of: ${ROOTS.join(', ')}`,
    );
  }
  return parts;
}

const isIndex = (k: string) => /^\d+$/.test(k);

/** The container a path ends in, creating objects/arrays on the way when `create`. */
function parentOf(
  doc: Record<string, unknown>,
  parts: string[],
  create: boolean,
): Bag {
  let node: unknown = doc;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    const container = node as Record<string, unknown>;
    let next = Array.isArray(node)
      ? (node as unknown[])[Number(k)]
      : container[k];
    if (next === undefined || next === null) {
      if (!create)
        throw new BadRequestException(
          `"${parts.slice(0, i + 1).join('.')}" does not exist`,
        );
      next = isIndex(parts[i + 1]) ? [] : {};
      if (Array.isArray(node)) (node as unknown[])[Number(k)] = next;
      else container[k] = next;
    }
    if (typeof next !== 'object')
      throw new BadRequestException(
        `"${parts.slice(0, i + 1).join('.')}" is not an object or list`,
      );
    node = next;
  }
  return node as Bag;
}

/** Applies the ops to `doc` in place; returns the paths it touched. */
export function applyOps(doc: Record<string, unknown>, ops: unknown): string[] {
  if (!Array.isArray(ops) || !ops.length)
    throw new BadRequestException('Send "ops": a non-empty list');
  if (ops.length > 200)
    throw new BadRequestException('At most 200 ops at a time');
  const touched: string[] = [];
  for (const raw of ops as Op[]) {
    const parts = split(raw?.path);
    const last = parts[parts.length - 1];
    switch (raw.op) {
      case 'set': {
        if (!('value' in raw))
          throw new BadRequestException(
            `"set" ${parts.join('.')} needs a "value"`,
          );
        const parent = parentOf(doc, parts, true);
        if (Array.isArray(parent)) {
          if (!isIndex(last))
            throw new BadRequestException(
              `"${raw.path}": a list position must be a number`,
            );
          parent[Number(last)] = raw.value;
        } else parent[last] = raw.value;
        break;
      }
      case 'unset': {
        const parent = parentOf(doc, parts, false);
        if (Array.isArray(parent)) {
          if (!isIndex(last) || Number(last) >= parent.length)
            throw new BadRequestException(`"${raw.path}" is not in the list`);
          parent.splice(Number(last), 1);
        } else delete parent[last];
        break;
      }
      case 'push': {
        const parent = parentOf(doc, parts, true) as Record<string, unknown>;
        const list: unknown = Array.isArray(parent)
          ? (parent as unknown[])[Number(last)]
          : parent[last];
        if (list === undefined || list === null) {
          if (Array.isArray(parent))
            (parent as unknown[])[Number(last)] = [raw.value];
          else parent[last] = [raw.value];
        } else if (Array.isArray(list)) list.push(raw.value);
        else throw new BadRequestException(`"${raw.path}" is not a list`);
        break;
      }
      case 'insert': {
        const parent = parentOf(doc, parts, false);
        if (!Array.isArray(parent) || !isIndex(last))
          throw new BadRequestException(
            `"insert" needs a list position, like events.1`,
          );
        parent.splice(Math.min(Number(last), parent.length), 0, raw.value);
        break;
      }
      case 'merge': {
        if (
          !raw.value ||
          typeof raw.value !== 'object' ||
          Array.isArray(raw.value)
        ) {
          throw new BadRequestException(
            `"merge" ${raw.path} needs an object "value"`,
          );
        }
        if (Object.keys(raw.value).some((k) => FORBIDDEN.has(k)))
          throw new BadRequestException('Bad key in "merge"');
        const parent = parentOf(doc, parts, true) as Record<string, unknown>;
        const cur: unknown = Array.isArray(parent)
          ? (parent as unknown[])[Number(last)]
          : parent[last];
        const merged: Record<string, unknown> = {
          ...(cur && typeof cur === 'object' && !Array.isArray(cur)
            ? (cur as Record<string, unknown>)
            : {}),
          ...raw.value,
        };
        if (Array.isArray(parent)) (parent as unknown[])[Number(last)] = merged;
        else parent[last] = merged;
        break;
      }
      default:
        throw new BadRequestException(
          `Unknown op "${String((raw as unknown as { op?: unknown })?.op)}" (use set, unset, push, insert, merge)`,
        );
    }
    touched.push(`${raw.op} ${raw.path}`);
  }
  return touched;
}
