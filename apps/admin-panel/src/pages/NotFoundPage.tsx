import { useNavigate } from 'react-router-dom';

import { FullPageState } from '../components/states/FullPageState';
import { Button } from '../components/ui/Button';

export function NotFoundPage(): JSX.Element {
  const navigate = useNavigate();
  return (
    <FullPageState
      icon="inbox"
      title="Page not found"
      message="The page you're looking for doesn't exist or may have been moved."
      action={<Button onClick={() => navigate('/', { replace: true })}>Back to dashboard</Button>}
    />
  );
}
