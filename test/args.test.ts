import { describe, it, expect } from 'vitest';
import { parseArgs, str, num, bool, buildWhere } from '../scripts/jt.ts';

describe('parseArgs', () => {
    it('parses a single positional', () => {
        const r = parseArgs(['get-organization']);
        expect(r.positional).toEqual(['get-organization']);
        expect(r.flags).toEqual({});
    });

    it('parses --key=value flags', () => {
        const r = parseArgs(['list-jobs', '--org-id=ABC123', '--size=10']);
        expect(r.positional).toEqual(['list-jobs']);
        expect(r.flags).toEqual({ 'org-id': 'ABC123', size: '10' });
    });

    it('parses --key value flags (next arg is the value)', () => {
        const r = parseArgs(['list-jobs', '--org-id', 'ABC123', '--size', '10']);
        expect(r.flags).toEqual({ 'org-id': 'ABC123', size: '10' });
    });

    it('parses boolean flags (no value)', () => {
        const r = parseArgs(['get-document-pdf', '--document-id', 'DOC1', '--download']);
        expect(r.flags).toEqual({ 'document-id': 'DOC1', download: true });
    });

    it('treats --key followed by another --flag as boolean', () => {
        const r = parseArgs(['cmd', '--expand', '--path', 'root']);
        expect(r.flags).toEqual({ expand: true, path: 'root' });
    });

    it('collects multiple positional args', () => {
        const r = parseArgs(['pave-query', 'extra1', 'extra2']);
        expect(r.positional).toEqual(['pave-query', 'extra1', 'extra2']);
    });

    it('treats everything after -- as positional', () => {
        const r = parseArgs(['cmd', '--', '--not-a-flag', 'pos2']);
        expect(r.positional).toEqual(['cmd', '--not-a-flag', 'pos2']);
        expect(r.flags).toEqual({});
    });

    it('handles empty argv', () => {
        const r = parseArgs([]);
        expect(r.positional).toEqual([]);
        expect(r.flags).toEqual({});
    });

    it('handles --key= with empty value', () => {
        const r = parseArgs(['cmd', '--key=']);
        expect(r.flags).toEqual({ key: '' });
    });

    it('does not consume next arg as value if it starts with --', () => {
        const r = parseArgs(['cmd', '--flag', '--other']);
        expect(r.flags).toEqual({ flag: true, other: true });
    });
});

describe('str helper', () => {
    it('returns string values as-is', () => {
        expect(str({ key: 'value' }, 'key')).toBe('value');
    });

    it('returns "true" for boolean true', () => {
        expect(str({ key: true }, 'key')).toBe('true');
    });

    it('returns undefined for missing keys', () => {
        expect(str({}, 'key')).toBeUndefined();
    });

    it('returns undefined for false', () => {
        expect(str({ key: false }, 'key')).toBeUndefined();
    });

    it('returns undefined for numbers', () => {
        expect(str({ key: 42 }, 'key')).toBeUndefined();
    });
});

describe('num helper', () => {
    it('returns number values as-is', () => {
        expect(num({ size: 25 }, 'size', 10)).toBe(25);
    });

    it('parses string numbers', () => {
        expect(num({ size: '25' }, 'size', 10)).toBe(25);
    });

    it('returns default for missing keys', () => {
        expect(num({}, 'size', 10)).toBe(10);
    });

    it('returns default for empty strings', () => {
        expect(num({ size: '' }, 'size', 10)).toBe(10);
    });

    it('returns NaN for non-numeric strings', () => {
        expect(num({ size: 'abc' }, 'size', 10)).toBeNaN();
    });
});

describe('bool helper', () => {
    it('returns true for boolean true', () => {
        expect(bool({ flag: true }, 'flag')).toBe(true);
    });

    it('returns false for boolean false', () => {
        expect(bool({ flag: false }, 'flag')).toBe(false);
    });

    it('returns undefined for missing keys', () => {
        expect(bool({}, 'flag')).toBeUndefined();
    });

    it('parses "true" string', () => {
        expect(bool({ flag: 'true' }, 'flag')).toBe(true);
    });

    it('parses "1" string', () => {
        expect(bool({ flag: '1' }, 'flag')).toBe(true);
    });

    it('parses "false" string as false', () => {
        expect(bool({ flag: 'false' }, 'flag')).toBe(false);
    });

    it('parses "0" string as false', () => {
        expect(bool({ flag: '0' }, 'flag')).toBe(false);
    });
});

describe('buildWhere', () => {
    it('returns undefined for empty conditions', () => {
        expect(buildWhere([])).toBeUndefined();
    });

    it('returns single condition unwrapped', () => {
        const cond = ['type', 'customer'];
        expect(buildWhere([cond])).toBe(cond);
    });

    it('wraps multiple conditions in an and clause', () => {
        const c1 = ['type', 'customer'];
        const c2 = ['status', 'pending'];
        expect(buildWhere([c1, c2])).toEqual({ and: [c1, c2] });
    });

    it('wraps three conditions in an and clause', () => {
        const result = buildWhere([['a', 1], ['b', 2], ['c', 3]]);
        expect(result).toEqual({ and: [['a', 1], ['b', 2], ['c', 3]] });
    });
});
