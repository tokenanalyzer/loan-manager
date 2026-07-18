import { useNavigate } from 'react-router-dom';

import { FullPageState } from '../components/states/FullPageState';
import { Button } from '../components/ui/Button';

export function AccessDeniedPage(): JSX.Element {
  const navigate = useNavigate();
  return (
    <FullPageState
      icon="lock"
      title="Access denied"
      message="Your account doesn't have permission to view this page."
      action={
        <Button onClick={() => navigate('/', { replace: true })}>Back to dashboard</Button>
      }
    />
  );
}
