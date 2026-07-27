import type { ApprovalRequest } from '@loan-manager/shared-types';
import { useCallback, useEffect, useState } from 'react';

import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { SuccessBanner } from '../../components/states/SuccessBanner';
import { Button } from '../../components/ui/Button';
import { PageContainer } from '../../components/ui/PageContainer';
import { TableContainer } from '../../components/ui/TableContainer';

import { ApprovalDecisionModal } from './ApprovalDecisionModal';
import { fetchPendingApprovals } from './approvals-api';
import { describeAction } from './approvals-meta';

/**
 * Settings → Approvals. Super Admin only — the checker's queue for
 * every maker-checker request currently pending (Admin Authentication
 * Module, Phase 5). A dedicated page rather than a Team-page tab: this
 * is a decision queue with its own state, not staff CRUD, and the
 * framework is meant to extend to more gated actions later.
 */
export function PendingApprovalsPage(): JSX.Element {
  const [requests, setRequests] = useState<ApprovalRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [decisionTarget, setDecisionTarget] = useState<ApprovalRequest | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await fetchPendingApprovals({ status: 'pending', page: 1, pageSize: 50 });
      setRequests(result.items);
    } catch {
      setError('Could not load the approvals queue.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function handleDecided(outcome: 'approved' | 'rejected'): void {
    setSuccessMessage(outcome === 'approved' ? 'Request approved.' : 'Request rejected.');
    setDecisionTarget(null);
    void load();
  }

  return (
    <PageContainer
      title="Approvals"
      description="Requests from Admin-tier staff that need a Super Admin's review before they take effect."
    >
      {successMessage && <SuccessBanner message={successMessage} onDismiss={() => setSuccessMessage(null)} />}

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {!error && requests === null && <LoadingState message="Loading approvals queue…" />}

      {!error && requests !== null && requests.length === 0 && (
        <EmptyState icon="checkCircle" message="Nothing pending — every request has been reviewed." />
      )}

      {!error && requests !== null && requests.length > 0 && (
        <TableContainer>
          <thead>
            <tr>
              <th>Action</th>
              <th>Account</th>
              <th>Requested by</th>
              <th>Requested</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id}>
                <td>{describeAction(request.action)}</td>
                <td>{request.targetUserName ?? request.targetUserEmail ?? '—'}</td>
                <td>{request.makerName ?? '—'}</td>
                <td>{new Date(request.createdAt).toLocaleString()}</td>
                <td>
                  <Button size="sm" onClick={() => setDecisionTarget(request)}>
                    Review
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableContainer>
      )}

      {decisionTarget && (
        <ApprovalDecisionModal
          request={decisionTarget}
          onClose={() => setDecisionTarget(null)}
          onDone={handleDecided}
        />
      )}
    </PageContainer>
  );
}
