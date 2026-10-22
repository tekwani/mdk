import { describe, expect, it, vi } from 'vitest';

const installSkillsMock = vi.hoisted(() => vi.fn());
vi.mock('@tetherto/mdk-skill', () => ({ installSkills: installSkillsMock }));

const { installSkill } = await import('../../src/lib/skill.js');

describe('installSkill', () => {
  it('reports success with a count and the installed clients', () => {
    installSkillsMock.mockReturnValue({
      skills: [{ id: 'a' }, { id: 'b' }],
      installed: [{ client: 'cursor' }, { client: 'claude' }],
    });
    const result = installSkill('all', '/tmp/project');
    expect(installSkillsMock).toHaveBeenCalledWith({
      client: 'all',
      target: '/tmp/project',
      onWarn: expect.any(Function),
    });
    expect(result).toEqual({ ok: true, message: 'Installed 2 skill(s) for cursor, claude.' });
  });

  it('names skipped skill dirs in the warning', () => {
    installSkillsMock.mockReturnValue({
      skills: ['a'],
      installed: [{ client: 'claude' }],
      skipped: [{ client: 'claude', skill: 'a', dir: '/p/.claude/skills/a', reason: 'symlink' }],
    });
    const result = installSkill('claude', '/p');
    expect(result.ok).toBe(true);
    expect(result.warning).toBe('Skipped 1 existing skill dir(s): /p/.claude/skills/a (symlink)');
    expect(result.detail).toBeUndefined();
  });

  it('surfaces swept stale skills as detail', () => {
    installSkillsMock.mockReturnValue({
      skills: ['mdk'],
      installed: [
        { client: 'cursor', removed: ['mdk-old'] },
        { client: 'claude', removed: ['mdk-old'] },
      ],
    });
    const result = installSkill('all', '/tmp/project');
    expect(result).toEqual({
      ok: true,
      message: 'Installed 1 skill(s) for cursor, claude.',
      detail: 'Removed 1 stale skill(s): mdk-old.',
    });
  });

  it('reports failure with the error message', () => {
    installSkillsMock.mockImplementation(() => {
      throw new Error('disk full');
    });
    const result = installSkill('cursor', '/tmp/project');
    expect(result).toEqual({ ok: false, message: 'disk full' });
  });

  it('stringifies a non-Error throw', () => {
    installSkillsMock.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw 'nope';
    });
    const result = installSkill('cursor', '/tmp/project');
    expect(result).toEqual({ ok: false, message: 'nope' });
  });
});
