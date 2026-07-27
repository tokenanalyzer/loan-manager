import { ApprovalActionExecutorRegistry } from './approval-action-executor.interface';

describe('ApprovalActionExecutorRegistry', () => {
  it('returns the executor that was registered for an action', () => {
    const registry = new ApprovalActionExecutorRegistry();
    const executor = { execute: jest.fn() };

    registry.register('staff_disable', executor);

    expect(registry.get('staff_disable')).toBe(executor);
  });

  it('throws when asked for an action nothing has registered', () => {
    const registry = new ApprovalActionExecutorRegistry();

    expect(() => registry.get('never_registered')).toThrow('No approval executor registered for action "never_registered".');
  });
});
