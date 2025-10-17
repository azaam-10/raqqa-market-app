
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AuthLayout from './AuthLayout';
import Button from '../components/ui/Button';

const VerificationScreen: React.FC = () => {
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  useEffect(() => {
    if (!email) {
      // If no email is passed, redirect to signup
      navigate('/signup');
    }
  }, [email, navigate]);

  const handleChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return;

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

    // Focus next input
    if (element.nextSibling && element.value) {
      (element.nextSibling as HTMLInputElement).focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    // Focus previous input on backspace
    if (e.key === "Backspace" && !otp[index] && e.currentTarget.previousSibling) {
      (e.currentTarget.previousSibling as HTMLInputElement).focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const token = otp.join("");
    if (token.length !== 6) {
        setError("الرجاء إدخال الرمز المكون من 6 أرقام.");
        setLoading(false);
        return;
    }

    const { error } = await verifyOtp(email, token);

    if (error) {
      setError("الرمز غير صالح أو منتهي الصلاحية. حاول مرة أخرى.");
    } else {
      // On successful verification, Supabase auth state will change,
      // and the user will be redirected to the home screen.
      navigate('/home');
    }
    setLoading(false);
  };

  return (
    <AuthLayout title="التحقق من الحساب" description={`أدخلنا الرمز المكون من 6 أرقام الذي أرسلناه إلى ${email}`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center gap-2" dir="ltr">
          {otp.map((data, index) => {
            return (
              <input
                key={index}
                type="text"
                maxLength={1}
                value={data}
                onChange={e => handleChange(e.target, index)}
                onKeyDown={e => handleKeyDown(e, index)}
                onFocus={e => e.target.select()}
                className="w-12 h-14 text-center text-2xl font-bold bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            );
          })}
        </div>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <Button type="submit" loading={loading} variant="primary">تحقق</Button>
      </form>
    </AuthLayout>
  );
};

export default VerificationScreen;