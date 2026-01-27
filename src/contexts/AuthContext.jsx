import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check local storage for token on mount
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');
        const dept = localStorage.getItem('dept');

        if (token && role) {
            setUser({ token, role, dept });
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        // Mock Login Logic
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (email === 'principal@gmail.com' && password === 'admin') {
                    const userData = { role: 'principal', token: 'mock-jwt-principal', dept: null };
                    setUser(userData);
                    localStorage.setItem('token', userData.token);
                    localStorage.setItem('role', userData.role);
                    resolve(userData);
                } else if (email === 'aimlhod@gmail.com' && password === 'admin') {
                    const userData = { role: 'hod', token: 'mock-jwt-hod', dept: 'AIML' };
                    setUser(userData);
                    localStorage.setItem('token', userData.token);
                    localStorage.setItem('role', userData.role);
                    localStorage.setItem('dept', userData.dept);
                    resolve(userData);
                } else {
                    reject('Invalid credentials');
                }
            }, 500);
        });
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('dept');
    };

    const value = {
        user,
        login,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
