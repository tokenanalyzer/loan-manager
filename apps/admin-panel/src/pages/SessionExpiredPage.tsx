import { useNavigate } from 'react-router-dom';

import { FullPageState } from '../components/states/FullPageState';
import { Button } from '../components/ui/Button';

export function SessionExpiredPage(): JSX.Element {
  const navigate = useNavigate();
  return (
    <FullPageState
      icon="clock"
      title="Session expired"
      message="You've been signed out for your security. Please sign in again to continue."
      action={<Button onClick={() => navigate('/login', { replace: true })}>Sign in again</Button>}
    />
  );
}
