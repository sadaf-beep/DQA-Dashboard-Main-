
import React, { useState } from 'react';
import { APP_NAME } from '../constants';
import { User, UserRole } from '../types';

interface LoginProps {
  users: User[];
  onLogin: (user: User, remember: boolean) => void;
  onUpdateUser: (user: User) => void;
  onRegister: (user: User) => void;
}

type AuthMode = 'SIGN_IN' | 'SIGN_UP' | 'FORGOT_PASSWORD' | 'RESET_PASSWORD';

const Login: React.FC<LoginProps> = ({ users, onLogin, onUpdateUser, onRegister }) => {
  const [mode, setMode] = useState<AuthMode>('SIGN_IN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Stores the user found during password recovery
  const [recoveryUser, setRecoveryUser] = useState<User | null>(null);

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
    // Don't clear email if switching between related modes for convenience
    if (newMode === 'SIGN_IN') {
        setPassword('');
        setPhone('');
        setFullName('');
    }
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = users.find(u => u.email?.toLowerCase() === normalizedEmail || u.username === normalizedEmail);

    if (existingUser) {
      if (!existingUser.password) {
        // First time login - Setup Password if missing
        const updatedUser = { ...existingUser, password: password };
        onUpdateUser(updatedUser);
      } else if (existingUser.password === password) {
        // Successful login
        onLogin(existingUser, rememberMe);
      } else {
        setError('Incorrect password.');
      }
    } else {
      setError('Account not found. Please check your email or create a new account.');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedEmail = email.toLowerCase().trim();
    if (users.some(u => u.email?.toLowerCase() === normalizedEmail)) {
      setError('An account with this email already exists. Please Sign In.');
      return;
    }

    if (!phone) {
        setError('Phone number is required for account recovery.');
        return;
    }

    // STRICT ROLE ASSIGNMENT LOGIC
    const assignedRole = normalizedEmail === 'sadaf@beamdynamics.io' ? UserRole.MANAGER : UserRole.AGENT;

    const newUser: User = {
      id: `u-${Date.now()}`,
      username: normalizedEmail.split('@')[0],
      name: fullName,
      email: normalizedEmail,
      role: assignedRole,
      password: password,
      phone: phone,
      joiningDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'),
      payRate: 0,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`
    };

    onRegister(newUser);
  };

  const handleVerifyRecovery = (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      const normalizedEmail = email.toLowerCase().trim();
      const user = users.find(u => u.email?.toLowerCase() === normalizedEmail);

      if (!user) {
          setError('No account found with this email.');
          return;
      }

      // Normalize phones for comparison (remove spaces, dashes, parens)
      const inputPhone = phone.replace(/[^0-9+]/g, '');
      const userPhone = (user.phone || '').replace(/[^0-9+]/g, '');

      if (inputPhone && inputPhone === userPhone) {
          setRecoveryUser(user);
          setMode('RESET_PASSWORD');
          setError('');
      } else {
          setError('The phone number does not match the one on file for this email.');
      }
  };

  const handleResetPassword = (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (!recoveryUser) {
          setError('Session invalid. Please try again.');
          setMode('FORGOT_PASSWORD');
          return;
      }

      const updatedUser = { ...recoveryUser, password: password };
      onUpdateUser(updatedUser);
      
      setSuccess('Password has been reset successfully. Redirecting...');
      setTimeout(() => {
          setMode('SIGN_IN');
          setSuccess('');
          setPassword('');
      }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
           <div className="absolute top-0 left-0 w-32 h-32 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-x-10 -translate-y-10"></div>
           <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 translate-x-10 translate-y-10"></div>
           
           <div className="relative z-10">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{APP_NAME}</h1>
              <p className="text-slate-400 text-sm mt-1 font-medium">Data Quality Assurance Team</p>
           </div>
        </div>
        
        {/* Form Area */}
        <div className="p-8 flex-1">
          {/* Tabs for Sign In / Sign Up */}
          {(mode === 'SIGN_IN' || mode === 'SIGN_UP') && (
            <div className="flex justify-center mb-8">
                <div className="bg-slate-100 p-1 rounded-lg inline-flex">
                <button 
                    onClick={() => switchMode('SIGN_IN')}
                    className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${mode === 'SIGN_IN' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Sign In
                </button>
                <button 
                    onClick={() => switchMode('SIGN_UP')}
                    className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${mode === 'SIGN_UP' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Sign Up
                </button>
                </div>
            </div>
          )}

          {/* Title for Forgot/Reset Modes */}
          {mode === 'FORGOT_PASSWORD' && (
              <div className="mb-6 text-center">
                  <h3 className="text-lg font-bold text-slate-800">Password Recovery</h3>
                  <p className="text-xs text-slate-500 mt-1">Verify your identity to reset password</p>
              </div>
          )}
          {mode === 'RESET_PASSWORD' && (
              <div className="mb-6 text-center">
                  <h3 className="text-lg font-bold text-slate-800">Reset Password</h3>
                  <p className="text-xs text-slate-500 mt-1">Create a new password for {recoveryUser?.email}</p>
              </div>
          )}

          <form onSubmit={
              mode === 'SIGN_UP' ? handleRegister : 
              mode === 'FORGOT_PASSWORD' ? handleVerifyRecovery :
              mode === 'RESET_PASSWORD' ? handleResetPassword :
              handleSignIn
          } className="space-y-5">
            
            {error && (
              <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-lg border border-red-100 flex items-start gap-2 animate-fadeIn">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 text-green-600 text-xs font-bold p-3 rounded-lg border border-green-100 flex items-start gap-2 animate-fadeIn">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                {success}
              </div>
            )}
            
            {mode === 'SIGN_UP' && (
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Full Name</label>
                 <input 
                   required
                   type="text" 
                   className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                   value={fullName}
                   onChange={e => setFullName(e.target.value)}
                   placeholder="Sadaf Amrita"
                 />
               </div>
            )}

            {mode !== 'RESET_PASSWORD' && (
                <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Email Address</label>
                <input 
                    required
                    type="email" 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@beamdynamics.io"
                />
                </div>
            )}

            {(mode === 'SIGN_UP' || mode === 'FORGOT_PASSWORD') && (
                <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Phone Number</label>
                <input 
                    required
                    type="tel" 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder={mode === 'SIGN_UP' ? "For account recovery" : "Verify account ownership"}
                />
                <p className="text-[10px] text-slate-400 mt-1">Used for verifying your identity if you forget your password.</p>
                </div>
            )}

            {(mode === 'SIGN_IN' || mode === 'SIGN_UP' || mode === 'RESET_PASSWORD') && (
                <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                    {mode === 'RESET_PASSWORD' ? 'New Password' : 'Password'}
                </label>
                <input 
                    required
                    type="password" 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                />
                {mode === 'SIGN_IN' && (
                    <p className="text-[10px] text-slate-400 mt-1.5 italic">
                    Note: If you haven't set a password yet, entering one here will set it.
                    </p>
                )}
                </div>
            )}

            {mode === 'SIGN_IN' && (
                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={rememberMe} 
                            onChange={e => setRememberMe(e.target.checked)} 
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs text-slate-600 font-medium select-none">Stay signed in for 30 days</span>
                    </label>
                    <button 
                        type="button" 
                        onClick={() => switchMode('FORGOT_PASSWORD')}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
                    >
                        Forgot Password?
                    </button>
                </div>
            )}

            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 mt-2">
              {mode === 'SIGN_IN' ? 'Sign In' : 
               mode === 'SIGN_UP' ? 'Create Account' : 
               mode === 'FORGOT_PASSWORD' ? 'Verify Identity' : 
               'Reset Password'}
            </button>
            
            {(mode === 'FORGOT_PASSWORD' || mode === 'RESET_PASSWORD') && (
                <button 
                    type="button"
                    onClick={() => switchMode('SIGN_IN')}
                    className="w-full text-xs text-slate-500 font-medium hover:text-slate-800 hover:underline mt-2"
                >
                    Back to Sign In
                </button>
            )}

            {mode === 'SIGN_UP' && (
              <p className="text-[10px] text-center text-slate-400">
                Only specific administrative emails will be granted Manager access.
              </p>
            )}
          </form>
        </div>
        
        {/* Footer */}
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
           <p className="text-xs text-slate-400">© 2026 {APP_NAME}. Secure Access Only.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
