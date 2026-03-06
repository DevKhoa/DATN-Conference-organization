import React, { useState, useEffect } from 'react';
import { X, Mail, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import Button from './ui/Button';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthStep = 'login' | 'sending' | 'verify' | 'success';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<AuthStep>('login');
  const [email, setEmail] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [serverCode, setServerCode] = useState('');
  const [expiryTime, setExpiryTime] = useState<number>(0);
  const [error, setError] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('login');
      setEmail('');
      setInputCode('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleGoogleSignIn = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address to simulate the Google account selection.');
      return;
    }

    setStep('sending');
    setError('');
    
    const code = generateCode();
    setServerCode(code);
    const expireAt = Date.now() + 5 * 60 * 1000; // 5 minutes from now
    setExpiryTime(expireAt);

    const BASE_URL = "https://conference-backend-api-220969899128.us-central1.run.app";
    const url = `${BASE_URL}/send-email`;

    const payload = {
      "recipient_email": email,
      "subject": "Conf-Org Verification Code",
      "body": `
      Thankyou for signing up in Conference Organization
      Your verification code is: ${code}. 
      The code will expires in 5 minutes.
      `
    };

    // --- DEBUG: LOG REQUEST ---
    console.group('🚀 [API Request] Sending Email');
    console.log('URL:', url);
    console.log('Payload:', payload);
    console.groupEnd();
    // --------------------------

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // --- DEBUG: LOG RESPONSE ---
      console.group('📩 [API Response] Received');
      console.log('Status Code:', response.status);
      console.log('Status Text:', response.statusText);
      
      // Cố gắng đọc body trả về để debug (nếu server có trả về JSON)
      try {
        // Clone response để không ảnh hưởng luồng chính nếu cần dùng response gốc
        const responseClone = response.clone(); 
        const responseBody = await responseClone.json();
        console.log('Response Body:', responseBody);
      } catch (e) {
        console.log('Response Body: (Không thể parse JSON hoặc body rỗng)');
      }
      console.groupEnd();
      // ---------------------------

      if (response.ok) {
        setStep('verify');
      } else {
        console.warn('❌ Request failed with status:', response.status);
        setError('Failed to send verification email. Please try again.');
        setStep('login');
      }
    } catch (err) {
      // --- DEBUG: LOG ERROR ---
      console.group('🔥 [API Error] Network/Exception');
      console.error('Error Details:', err);
      console.groupEnd();
      // ------------------------

      setError('Network error occurred. Please try again.');
      setStep('login');
    }
  };

  const handleVerify = () => {
    // --- DEBUG: LOG VERIFICATION ---
    console.log(`🔍 [Verify] Input: ${inputCode} | Server: ${serverCode}`);
    // -------------------------------

    if (Date.now() > expiryTime) {
      setError('Verification code has expired. Please sign in again.');
      return;
    }

    if (inputCode === serverCode) {
      setStep('success');
      setError('');
    } else {
      setError('Invalid verification code. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-lg font-semibold text-slate-900">
            {step === 'login' && 'Sign in to Conf-Org'}
            {step === 'sending' && 'Contacting Google...'}
            {step === 'verify' && 'Verify Identity'}
            {step === 'success' && 'Welcome!'}
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8">
          
          {/* STEP: LOGIN */}
          {step === 'login' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center mx-auto">
                   <Mail className="w-6 h-6 text-brand-600" />
                </div>
                <p className="text-slate-600 text-sm">
                  Please enter your email to continue with your secure Google account.
                </p>
              </div>

              <div className="space-y-3">
                 <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email Address</label>
                 <input 
                   type="email" 
                   id="email"
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   placeholder="name@example.com"
                   className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                 />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <button 
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2.5 rounded-lg transition-all shadow-sm group"
              >
                <img 
                  src="https://www.svgrepo.com/show/475656/google-color.svg" 
                  alt="Google" 
                  className="w-5 h-5 group-hover:scale-110 transition-transform" 
                />
                Sign in with Google
              </button>
              
              <p className="text-xs text-center text-slate-500 mt-4">
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          )}

          {/* STEP: SENDING */}
          {step === 'sending' && (
            <div className="text-center py-8">
               <Loader2 className="w-12 h-12 text-brand-600 animate-spin mx-auto mb-4" />
               <p className="text-slate-600 font-medium">Authenticating...</p>
               <p className="text-slate-400 text-sm mt-2">Sending verification code to your email.</p>
            </div>
          )}

          {/* STEP: VERIFY */}
          {step === 'verify' && (
            <div className="space-y-6">
               <div className="text-center">
                 <p className="text-slate-600 text-sm mb-1">We sent a 6-digit code to</p>
                 <p className="font-semibold text-slate-900">{email}</p>
                 <p className="text-xs text-slate-500 mt-2">Code expires in 5 minutes.</p>
               </div>

               <div className="flex justify-center">
                  <input
                    type="text"
                    maxLength={6}
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.replace(/[^0-9]/g, ''))}
                    className="text-center text-3xl tracking-widest font-mono w-48 border-b-2 border-slate-300 focus:border-brand-600 outline-none py-2 bg-transparent transition-colors"
                    placeholder="000000"
                    autoFocus
                  />
               </div>

               {error && (
                <div className="text-center text-red-600 text-sm">
                  {error}
                </div>
              )}

               <Button 
                onClick={handleVerify} 
                className="w-full"
                disabled={inputCode.length !== 6}
               >
                 Verify Code
               </Button>
               
               <button 
                 onClick={() => setStep('login')}
                 className="w-full text-center text-sm text-brand-600 hover:text-brand-700 mt-2"
               >
                 Change Email / Resend
               </button>
            </div>
          )}

          {/* STEP: SUCCESS */}
          {step === 'success' && (
            <div className="text-center py-6 space-y-4">
               <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                 <CheckCircle className="w-10 h-10 text-green-600" />
               </div>
               <h2 className="text-2xl font-bold text-slate-900">Login Successful</h2>
               <p className="text-slate-600">
                 You have successfully authenticated with your secure code.
               </p>
               <div className="pt-4">
                 <Button onClick={onClose} className="w-full bg-green-600 hover:bg-green-700 border-transparent">
                   Continue to Dashboard
                 </Button>
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AuthModal;