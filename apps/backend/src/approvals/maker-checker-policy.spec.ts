import { UserRole } from '../database/entities';

import { ApprovalActionType } from './approval-action-type';
import { MakerCheckerPolicyService } from './maker-checker-policy';

describe('MakerCheckerPolicyService', () => {
  const policy = new MakerCheckerPolicyService();
  const allActions = Object.values(ApprovalActionType);
  const allRoles = Object.values(UserRole);

  it.each(allActions)('requires approval for ORG_ADMIN performing %s', (action) => {
    expect(policy.requiresApproval(UserRole.ORG_ADMIN, action)).toBe(true);
  });

  it.each(allActions)('does not require approval for ADMIN (Super Admin) performing %s', (action) => {
    expect(policy.requiresApproval(UserRole.ADMIN, action)).toBe(false);
  });

  it('defaults to false for every other role/action combination', () => {
    for (const role of allRoles) {
      if (role === UserRole.ORG_ADMIN) continue;
      for (const action of allActions) {
        expect(policy.requiresApproval(role, action)).toBe(false);
      }
    }
  });
});
