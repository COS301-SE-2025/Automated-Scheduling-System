import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string()
        .min(1, { message: "Email is required." })
        .email({ message: "Invalid email address." }),
    password: z.string()
        .min(1, { message: "Password is required." })
        .min(6, { message: "Password must be at least 6 characters long." }) 
});

export const signupSchema = z.object({
    name: z.string()
        .min(1, { message: "Full name is required." })
        .min(2, { message: "Name must be at least 2 characters." }),
    email: z.string()
        .min(1, { message: "Email is required." })
        .email({ message: "Invalid email address." }),
    password: z.string()
        .min(1, { message: "Password is required." })
        .min(8, { message: "Password must be at least 8 characters long." })
        .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter." })
        .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter." })
        .regex(/[0-9]/, { message: "Password must contain at least one number." })
        .regex(/[^a-zA-Z0-9]/, { message: "Password must contain at least one special character." }),
    confirmPassword: z.string()
        .min(1, { message: "Confirm password is required." })
})
.refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
});


export const forgotPasswordSchema = z.object({
    email: z.string()
        .min(1, { message: "Email is required." })
        .email({ message: "Invalid email address." }),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;