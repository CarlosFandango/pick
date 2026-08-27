import { describe, expect, it } from 'vitest';
import { auditorLabel, DEFAULT_REPORT_SETTINGS } from '../src/reporting';

describe('auditorLabel', () => {
  it('codes the auditor by default', () => {
    // You can start naming a coded auditor; you cannot un-name one whose name
    // a charity has already read.
    expect(DEFAULT_REPORT_SETTINGS.showAuditorName).toBe(false);
    expect(auditorLabel(DEFAULT_REPORT_SETTINGS, { fullName: 'M. Okafor', code: '3F2A9C' })).toBe(
      'Auditor 3F2A9C',
    );
  });

  it('names them when the setting is on', () => {
    expect(auditorLabel({ showAuditorName: true }, { fullName: 'M. Okafor', code: '3F2A9C' })).toBe(
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
