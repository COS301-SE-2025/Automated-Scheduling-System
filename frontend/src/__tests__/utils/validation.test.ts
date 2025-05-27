import { describe, it, expect } from 'vitest';
import {
    loginSchema,
    signupSchema,
    forgotPasswordSchema,
    type LoginFormData,
    type SignupFormData,
    type ForgotPasswordFormData
} from '../../utils/validation';

describe('Validation Schemas', () => {
    describe('loginSchema', () => {
        describe('Valid inputs', () => {
            it('should validate correct login data', () => {
                const validData: LoginFormData = {
                    email: 'test@example.com',
                    password: 'password123'
                };

                const result = loginSchema.safeParse(validData);
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data).toEqual(validData);
                }
            });

            it('should validate minimum password length', () => {
                const validData = {
                    email: 'test@example.com',
                    password: '123456'
                };

                const result = loginSchema.safeParse(validData);
                expect(result.success).toBe(true);
            });
        });

        describe('Invalid inputs', () => {
            it('should reject empty email', () => {
                const invalidData = {
                    email: '',
                    password: 'password123'
                };

                const result = loginSchema.safeParse(invalidData);
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].message).toBe('Email is required.');
                }
            });

            it('should reject invalid email format', () => {
                const invalidData = {
                    email: 'invalid-email',
                    password: 'password123'
                };

                const result = loginSchema.safeParse(invalidData);
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].message).toBe('Invalid email address.');
                }
            });

            it('should reject empty password', () => {
                const invalidData = {
                    email: 'test@example.com',
                    password: ''
                };

                const result = loginSchema.safeParse(invalidData);
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].message).toBe('Password is required.');
                }
            });

            it('should reject password shorter than 6 characters', () => {
                const invalidData = {
                    email: 'test@example.com',
                    password: '12345'
                };

                const result = loginSchema.safeParse(invalidData);
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].message).toBe('Password must be at least 6 characters long.');
                }
            });
        });
    });

    describe('signupSchema', () => {
        describe('Valid inputs', () => {
            it('should validate correct signup data', () => {
                const validData: SignupFormData = {
                    name: 'John Doe',
                    email: 'john@example.com',
                    password: 'Password123!',
                    confirmPassword: 'Password123!'
                };

                const result = signupSchema.safeParse(validData);
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data).toEqual(validData);
                }
            });

            it('should validate minimum name length', () => {
                const validData = {
                    name: 'Jo',
                    email: 'jo@example.com',
                    password: 'Password123!',
                    confirmPassword: 'Password123!'
                };

                const result = signupSchema.safeParse(validData);
                expect(result.success).toBe(true);
            });
        });

        describe('Invalid inputs', () => {
            it('should reject empty name', () => {
                const invalidData = {
                    name: '',
                    email: 'test@example.com',
                    password: 'Password123!',
                    confirmPassword: 'Password123!'
                };

                const result = signupSchema.safeParse(invalidData);
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].message).toBe('Full name is required.');
                }
            });

            it('should reject name shorter than 2 characters', () => {
                const invalidData = {
                    name: 'J',
                    email: 'test@example.com',
                    password: 'Password123!',
                    confirmPassword: 'Password123!'
                };

                const result = signupSchema.safeParse(invalidData);
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].message).toBe('Name must be at least 2 characters.');
                }
            });

            it('should reject password without lowercase letter', () => {
                const invalidData = {
                    name: 'John Doe',
                    email: 'john@example.com',
                    password: 'PASSWORD123!',
                    confirmPassword: 'PASSWORD123!'
                };

                const result = signupSchema.safeParse(invalidData);
                expect(result.success).toBe(false);
                if (!result.success) {
                    const lowercaseError = result.error.issues.find(
                        issue => issue.message === 'Password must contain at least one lowercase letter.'
                    );
                    expect(lowercaseError).toBeDefined();
                }
            });

            it('should reject password without uppercase letter', () => {
                const invalidData = {
                    name: 'John Doe',
                    email: 'john@example.com',
                    password: 'password123!',
                    confirmPassword: 'password123!'
                };

                const result = signupSchema.safeParse(invalidData);
                expect(result.success).toBe(false);
                if (!result.success) {
                    const uppercaseError = result.error.issues.find(
                        issue => issue.message === 'Password must contain at least one uppercase letter.'
                    );
                    expect(uppercaseError).toBeDefined();
                }
            });

            it('should reject password without number', () => {
                const invalidData = {
                    name: 'John Doe',
                    email: 'john@example.com',
                    password: 'Password!',
                    confirmPassword: 'Password!'
                };

                const result = signupSchema.safeParse(invalidData);
                expect(result.success).toBe(false);
                if (!result.success) {
                    const numberError = result.error.issues.find(
                        issue => issue.message === 'Password must contain at least one number.'
                    );
                    expect(numberError).toBeDefined();
                }
            });

            it('should reject password without special character', () => {
                const invalidData = {
                    name: 'John Doe',
                    email: 'john@example.com',
                    password: 'Password123',
                    confirmPassword: 'Password123'
                };

                const result = signupSchema.safeParse(invalidData);
                expect(result.success).toBe(false);
                if (!result.success) {
                    const specialCharError = result.error.issues.find(
                        issue => issue.message === 'Password must contain at least one special character.'
                    );
                    expect(specialCharError).toBeDefined();
                }
            });

            it('should reject password shorter than 8 characters', () => {
                const invalidData = {
                    name: 'John Doe',
                    email: 'john@example.com',
                    password: 'Pass1!',
                    confirmPassword: 'Pass1!'
                };

                const result = signupSchema.safeParse(invalidData);
                expect(result.success).toBe(false);
                if (!result.success) {
                    const lengthError = result.error.issues.find(
                        issue => issue.message === 'Password must be at least 8 characters long.'
                    );
                    expect(lengthError).toBeDefined();
                }
            });

            it('should reject mismatched passwords', () => {
                const invalidData = {
                    name: 'John Doe',
                    email: 'john@example.com',
                    password: 'Password123!',
                    confirmPassword: 'DifferentPassword123!'
                };

                const result = signupSchema.safeParse(invalidData);
                expect(result.success).toBe(false);
                if (!result.success) {
                    const mismatchError = result.error.issues.find(
                        issue => issue.message === "Passwords don't match."
                    );
                    expect(mismatchError).toBeDefined();
                    expect(mismatchError?.path).toEqual(['confirmPassword']);
                }
            });

            it('should reject empty confirm password', () => {
                const invalidData = {
                    name: 'John Doe',
                    email: 'john@example.com',
                    password: 'Password123!',
                    confirmPassword: ''
                };

                const result = signupSchema.safeParse(invalidData);
                expect(result.success).toBe(false);
                if (!result.success) {
                    const confirmError = result.error.issues.find(
                        issue => issue.message === 'Confirm password is required.'
                    );
                    expect(confirmError).toBeDefined();
                }
            });
        });

        describe('Password complexity edge cases', () => {
            it('should accept various special characters', () => {
                const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '+', '='];
                
                specialChars.forEach(char => {
                    const validData = {
                        name: 'John Doe',
                        email: 'john@example.com',
                        password: `Password123${char}`,
                        confirmPassword: `Password123${char}`
                    };

                    const result = signupSchema.safeParse(validData);
                    expect(result.success).toBe(true);
                });
            });
        });
    });

    describe('forgotPasswordSchema', () => {
        describe('Valid inputs', () => {
            it('should validate correct email', () => {
                const validData: ForgotPasswordFormData = {
                    email: 'test@example.com'
                };

                const result = forgotPasswordSchema.safeParse(validData);
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data).toEqual(validData);
                }
            });

            it('should validate various email formats', () => {
                const validEmails = [
                    'user@domain.com',
                    'user.name@domain.com',
                    'user+tag@domain.co.uk',
                    'user123@domain-name.org'
                ];

                validEmails.forEach(email => {
                    const result = forgotPasswordSchema.safeParse({ email });
                    expect(result.success).toBe(true);
                });
            });
        });

        describe('Invalid inputs', () => {
            it('should reject empty email', () => {
                const invalidData = {
                    email: ''
                };

                const result = forgotPasswordSchema.safeParse(invalidData);
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].message).toBe('Email is required.');
                }
            });

            it('should reject invalid email formats', () => {
                const invalidEmails = [
                    'invalid-email',
                    '@domain.com',
                    'user@',
                    'user.domain.com',
                    'user@domain'
                ];

                invalidEmails.forEach(email => {
                    const result = forgotPasswordSchema.safeParse({ email });
                    expect(result.success).toBe(false);
                    if (!result.success) {
                        expect(result.error.issues[0].message).toBe('Invalid email address.');
                    }
                });
            });
        });
    });

    describe('Type inference', () => {
        it('should infer correct types from schemas', () => {
            const loginData: LoginFormData = {
                email: 'test@example.com',
                password: 'password123'
            };

            const signupData: SignupFormData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'Password123!',
                confirmPassword: 'Password123!'
            };

            const forgotData: ForgotPasswordFormData = {
                email: 'test@example.com'
            };

            expect(loginData.email).toBeDefined();
            expect(signupData.name).toBeDefined();
            expect(forgotData.email).toBeDefined();
        });
    });
});