import LoginForm from '../Components/LoginForm';
import { getAuthentication } from '../util.ts';
import { useNavigate } from 'react-router';

export default function LoginPage() {
  const authentication = getAuthentication();
  const navigator = useNavigate();
  if (authentication) {
    navigator('/dashboard');
  }
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8">
      <LoginForm />
    </div>
  );
}