import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AuthLayout from './AuthLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { getErrorMessage } from '../utils/errors';


const SignUpScreen: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signUpWithPassword, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/home');
    }
  }, [user, navigate]);
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const fullName = `${firstName} ${lastName}`.trim();

    // 1. Sign up the user and pass the full name in the metadata
    const { error: signUpError } = await signUpWithPassword(email, password, fullName);
    
    if (signUpError) {
      const message = getErrorMessage(signUpError);
      if (message.includes('User already registered')) {
        setError('هذا الحساب مسجل بالفعل.');
      } else {
        setError(message);
      }
      setLoading(false);
      return;
    }

    // 2. Redirect to verification. Profile will be created automatically by AuthContext
    // after the user confirms their email and logs in.
    navigate('/verify', { state: { email } });

    setLoading(false);
  };

  return (
    <AuthLayout title="إنشاء حساب جديد" description="انضم إلينا اليوم! أدخل بياناتك لتبدأ.">
      <form onSubmit={handleSignUp} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
            <Input type="text" placeholder="الاسم الأول" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            <Input type="text" placeholder="الاسم الأخير" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>
         <div>
            <label className="text-sm text-zinc-400 mb-2 block">تاريخ الميلاد</label>
            <div className="flex gap-2">
                <Select value={day} onChange={e => setDay(e.target.value)} required>
                    <option value="" disabled>اليوم</option>
                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
                <Select value={month} onChange={e => setMonth(e.target.value)} required>
                    <option value="" disabled>الشهر</option>
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                </Select>
                <Select value={year} onChange={e => setYear(e.target.value)} required>
                    <option value="" disabled>السنة</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </Select>
            </div>
        </div>
        <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        {error && <p className="text-red-400 text-sm text-center pt-2">{error}</p>}
        <div className="pt-2">
            <Button type="submit" loading={loading} variant="primary">إنشاء حساب</Button>
        </div>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-400">
        لديك حساب بالفعل؟{' '}
        <Link to="/login" className="font-medium text-teal-400 hover:text-teal-500">
          سجل الدخول
        </Link>
      </p>
    </AuthLayout>
  );
};

export default SignUpScreen;