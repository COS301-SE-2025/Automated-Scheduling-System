import React, { useState } from 'react';
import FormContainer from '../ui/FormContainer';
import FormInput from '../ui/FormInput';
import FormButton from '../ui/FormButton';
import FormLink from '../ui/FormLink';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // TODO: Implement actual login logic (e.g., API call)
    console.log('Login attempt with:', { email, password });
  };

  return (
    <FormContainer onSubmit={handleSubmit}>
      <FormInput
        id="email"
        name="email"
        type="email"
        label="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
        autoComplete="email"
      />

      <div>
        <FormInput
          id="password"
          name="password"
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
        <div className="text-right mt-1">
          <FormLink to="/forgot-password">
            Forgot your password?
          </FormLink>
        </div>
      </div>

      <div>
        <FormButton type="submit">
          Sign in
        </FormButton>
      </div>
      <div className="text-center">
        <p className="text-sm text-custom-third">
          Don't have an account?{' '}
          <FormLink to="/signup">
            Sign up
          </FormLink>
        </p>
      </div>
    </FormContainer>
  );
};

export default LoginForm;