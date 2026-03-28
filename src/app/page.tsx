'use client';
import { useGoogleLogin } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { LogIn, Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const user = useAppStore(state => state.user);
  const setUser = useAppStore(state => state.setUser);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isResetState, setIsResetState] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await res.json();
        
        setUser({
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
        });
        
        router.push('/dashboard');
      } catch (error) {
        console.error("Failed to fetch user profile", error);
      }
    },
    onError: error => console.error("Login Failed", error)
  });

  const handleEmailSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    // Mock Authentication
    setUser({
      email,
      name: email.split('@')[0], // Mock name
    });
    router.push('/dashboard');
  };

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    // Mock Password Reset
    setResetSent(true);
    setTimeout(() => {
      setIsResetState(false);
      setResetSent(false);
    }, 3000);
  };

  if (user) return null; // Prevent flash of login page if already cached

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 md:py-12 relative overflow-x-hidden overflow-y-auto custom-scrollbar bg-black text-white">
      {/* Background ambient light effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[100px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="glass-panel w-full max-w-md p-8 sm:p-10 flex flex-col relative z-10 my-auto"
      >
        <div className="mb-6 flex flex-col items-center justify-center pointer-events-none shrink-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.8, ease: "easeOut" }}
            className="relative w-full drop-shadow-[0_0_40px_rgba(0,212,255,0.25)]"
          >
            <img 
               src="/banner_wide.png" 
               alt="ReportMe Debugging Agent" 
               className="w-full h-auto object-contain rounded-xl"
            />
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          {!isResetState ? (
            <motion.div 
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col gap-4"
            >
              <form onSubmit={handleEmailSignIn} className="flex flex-col gap-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full bg-black/40 border border-white/20 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    required 
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full bg-black/40 border border-white/20 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    required 
                  />
                </div>

                <div className="flex justify-end">
                  <button 
                    type="button" 
                    onClick={() => setIsResetState(true)}
                    className="text-xs text-gray-400 hover:text-primary transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-primary text-black font-bold py-3 px-6 rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,212,255,0.4)]"
                >
                  Sign In <ArrowRight size={18} />
                </button>
              </form>

              <div className="relative flex items-center py-4">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-gray-500 text-xs text-uppercase tracking-wider">OR</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              <button 
                onClick={() => loginWithGoogle()}
                className="flex items-center gap-3 w-full justify-center bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-medium py-3 px-6 rounded-xl transition-all shadow-lg backdrop-blur-sm"
              >
                <LogIn size={18} />
                Continue with Google
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="reset"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-4 text-center"
            >
              <h2 className="text-xl font-bold mb-2">Reset Password</h2>
              <p className="text-sm text-gray-400 mb-4">Enter your email and we'll send you a link to reset your password.</p>
              
              <form onSubmit={handlePasswordReset} className="flex flex-col gap-4">
                <div className="relative text-left">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full bg-black/40 border border-white/20 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    required 
                  />
                </div>

                {resetSent ? (
                  <div className="flex items-center gap-2 justify-center text-green-400 bg-green-400/10 py-3 rounded-xl border border-green-400/20">
                    <CheckCircle2 size={18} />
                    <span className="text-sm font-medium">Reset link sent!</span>
                  </div>
                ) : (
                  <button 
                    type="submit"
                    className="w-full bg-primary text-black font-bold py-3 px-6 rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,212,255,0.4)]"
                  >
                    Send Reset Link
                  </button>
                )}

                <button 
                  type="button" 
                  onClick={() => setIsResetState(false)}
                  className="text-sm text-gray-400 hover:text-white transition-colors mt-2"
                >
                  Back to login
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
        
        <p className="mt-8 text-xs text-gray-600 text-center">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </main>
  );
}
