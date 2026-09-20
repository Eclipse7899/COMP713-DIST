import LoginForm from '../Components/Forms/LoginForm.tsx';
import { getAuthentication } from '../util.ts';
import { useNavigate } from 'react-router';
import { useEffect } from 'react';

export default function LoginPage() {
  const authentication = getAuthentication();
  const navigator = useNavigate();
  useEffect(() => {
    if (authentication !== null) {
      navigator('/dashboard', { replace: true });
    }
  }, [authentication, navigator]);
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8">
      <LoginForm />
    </div>
  );
}