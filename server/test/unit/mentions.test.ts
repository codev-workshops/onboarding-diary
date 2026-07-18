import { describe, expect, it } from 'vitest';
import { handleForEmail, parseMentionHandles } from '../../src/domain/mentions.js';

describe('parseMentionHandles', () => {
  it('extracts unique, lower-cased handles', () => {
    expect(parseMentionHandles('hey @manager.eng and @Admin, ping @manager.eng')).toEqual([
      'manager.eng',
      'admin',
    ]);
  });

  it('returns an empty array when there are no mentions', () => {
    expect(parseMentionHandles('no mentions here')).toEqual([]);
  });

  it('supports dots, dashes and underscores in handles', () => {
    expect(parseMentionHandles('@recruit.rina @some-user @snake_case')).toEqual([
      'recruit.rina',
      'some-user',
      'snake_case',
    ]);
  });
});

describe('handleForEmail', () => {
  it('returns the lower-cased local-part', () => {
    expect(handleForEmail('Manager.Eng@demo.local')).toBe('manager.eng');
  });
});
