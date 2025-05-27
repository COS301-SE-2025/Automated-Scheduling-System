import { useContext } from 'react';
// Import the AuthContext object and its type from the definition file
import { AuthContext, type AuthContextType } from '../contexts/AuthContextDefinition'; // <--- IMPORT THESE

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext); // Uses AuthContext from AuthContextDefinition.ts
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider. Ensure AuthProvider wraps your component tree and uses the AuthContext from AuthContextDefinition.ts.');
    }
    return context;
};