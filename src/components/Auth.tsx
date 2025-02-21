import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';

type AuthProps = {
  onClose?: () => void;
};

export function Auth({ onClose }: AuthProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        await signUp(email, password);
        setIsVerifying(true);
        setMessage('Please check your email for a verification link to complete your registration.');
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      if (errorMessage.includes('email_not_confirmed')) {
        setIsVerifying(true);
        setMessage('Please check your email for a verification link to complete your registration.');
      } else {
        setError(errorMessage);
      }
    }
  };

  const handleResendVerification = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });
      if (error) throw error;
      setMessage('Verification email resent! Please check your inbox.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend verification email');
    }
  };

  if (isVerifying) {
    return (
      <div className="relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        )}
        <div className="space-y-8 text-center">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900">Verify your email</h2>
            <p className="mt-2 text-gray-600">
              We've sent a verification link to {email}. Please check your email to continue.
            </p>
          </div>
          <div className="mt-4">
            <button
              onClick={handleResendVerification}
              className="text-green-600 hover:text-green-500"
            >
              Didn't receive the email? Click to resend
            </button>
          </div>
          <div className="mt-4">
            <button
              onClick={() => {
                setIsVerifying(false);
                setMessage(null);
                setError(null);
              }}
              className="text-gray-600 hover:text-gray-500"
            >
              ← Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>
      )}
      <div className="space-y-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            {isSignUp ? 'Create an account' : 'Sign in to your account'}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          {message && (
            <div className="text-green-500 text-sm text-center">{message}</div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              {isSignUp ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </form>

        <div className="text-center">
          <button
            className="text-green-600 hover:text-green-500"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setMessage(null);
            }}
          >
            {isSignUp
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
