import { describe, expect, it } from 'vitest';
import { auditorCode, auditorLabel, DEFAULT_REPORT_SETTINGS } from '../src/reporting';

describe('auditorLabel', () => {
  it('codes the auditor by default', () => {
    // You can start naming a coded auditor; you cannot un-name one whose name
    // a charity has already read.
    expect(DEFAULT_REPORT_SETTINGS.showAuditorName).toBe(false);
    expect(auditorLabel(DEFAULT_REPORT_SETTINGS, { fullName: 'M. Okafor', code: '231' })).toBe(
      'Auditor 231',
    );
  });

  it('names them when the setting is on', () => {
    expect(auditorLabel({ showAuditorName: true }, { fullName: 'M. Okafor', code: '231' })).toBe(
      'M. Okafor',
    );
  });

  it('falls back to a generic label rather than leaking a name', () => {
    expect(auditorLabel({ showAuditorName: true }, { fullName: null, code: null })).toBe(
      'PICK auditor',
    );
    expect(auditorLabel({ showAuditorName: false }, { fullName: 'M. Okafor' })).toBe(
      'PICK auditor',
    );
  });
});

describe('auditorCode', () => {
  it('derives from the audit, never the auditor', () => {
    // A charity must not be able to build a picture of an individual across
    // reports, so the code changes with the audit.
    expect(auditorCode('PS-001231')).toBe('231');
    expect(auditorCode('PS-001999')).toBe('999');
  });

  it('copes with a reference that has no digits', () => {
    expect(auditorCode('DRAFT')).toBe('000');
  });
});
