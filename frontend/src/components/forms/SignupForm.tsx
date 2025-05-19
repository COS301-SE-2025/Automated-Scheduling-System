import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormContainer from '../ui/FormContainer';
import FormInput from '../ui/FormInput';
import FormButton from '../ui/FormButton';
import FormLink from '../ui/FormLink';

const SignupForm: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        // Validate passwords
        if (password !== confirmPassword) {
            alert("Passwords don't match!");
            return;
        }
        console.log('Signup attempt with:', { name, email, password });
        
        //redirect to login, will change later
        navigate('/login');
    };

    return (
        <FormContainer onSubmit={handleSubmit}>
            <FormInput
                id="name"
                name="name"
                type="text"
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                autoComplete="name"
            />

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

            <FormInput
                id="password"
                name="password"
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
            />

            <FormInput
                id="confirm-password"
                name="confirm-password"
                type="password"
                label="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
            />

            <div>
                <FormButton type="submit">
                    Sign up
                </FormButton>
            </div>
            <div className="text-center">
                <p className="text-sm text-custom-third">
                    Already have an account?{' '}
                    <FormLink to="/login">
                        Sign in
                    </FormLink>
                </p>
            </div>
        </FormContainer>
    );
};

export default SignupForm;