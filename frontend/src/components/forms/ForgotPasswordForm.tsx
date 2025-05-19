import React, { useState } from 'react';
import FormContainer from '../ui/FormContainer';
import FormInput from '../ui/FormInput';
import FormButton from '../ui/FormButton';
import FormLink from '../ui/FormLink';
import MessageBox from '../ui/MessageBox';

const ForgotPasswordForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // TODO: Implement actual password reset logic (e.g., API call)
    console.log('Password reset requested for:', email);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <MessageBox title="Check your email">
        <p>
          We've sent a password reset link to <span className="font-medium">{email}</span>.
          Please check your inbox and follow the instructions.
        </p>
        <div className="mt-6">
          <FormLink to="/login">
            Return to login
          </FormLink>
        </div>
      </MessageBox>
    );
  }

  return (
    <FormContainer onSubmit={handleSubmit}>
      <div>
        <h3 className="text-lg font-medium text-custom-primary">Reset your password</h3>
        <p className="mt-1 text-sm text-custom-third">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

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
        <FormButton type="submit">
          Send reset link
        </FormButton>
      </div>
      <div className="text-center">
        <p className="text-sm text-custom-third">
          Remember your password?{' '}
          <FormLink to="/login">
            Back to login
          </FormLink>
        </p>
      </div>
    </FormContainer>
  );
};

export default ForgotPasswordForm;