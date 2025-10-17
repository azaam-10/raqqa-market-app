import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import MultiImageInput from '../components/ui/MultiImageInput';
import { getErrorMessage } from '../utils/errors';
import { PaymentTerm } from '../types';

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
);

const CreateRentalScreen: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [region, setRegion] = useState('');
    const [address, setAddress] = useState('');
    const [streetName, setStreetName] = useState('');
    const [roomCount, setRoomCount] = useState('');
    const [condition, setCondition] = useState('');
    const [rentAmount, setRentAmount] = useState('');
    const [paymentTerm, setPaymentTerm] = useState<PaymentTerm>('monthly');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [mapLink, setMapLink] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (latitude && longitude) {
            const lat = parseFloat(latitude);
            const lon = parseFloat(longitude);
            if (!isNaN(lat) && !isNaN(lon)) {
                setMapLink(`https://www.google.com/maps?q=${lat},${lon}`);
            }
        } else {
            setMapLink('');
        }
    }, [latitude, longitude]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || imageFiles.length === 0 || !region || !address || !roomCount || !condition || !rentAmount) {
            setError('الرجاء إدخال جميع الحقول المطلوبة وإضافة صورة واحدة على الأقل.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 1. Upload images
            const imageUrls: string[] = await Promise.all(
                imageFiles.map(async (file) => {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${user.id}/rentals/${Date.now()}-${Math.random()}.${fileExt}`;
                    const { error: uploadError } = await supabase.storage
                        .from('uploads')
                        .upload(fileName, file, {
                            contentType: file.type,
                            upsert: true,
                        });
                    if (uploadError) throw uploadError;
                    return fileName;
                })
            );

            // 2. Insert post data
            const { data, error: insertError } = await supabase
                .from('rental_posts')
                .insert([{
                    user_id: user.id,
                    image_urls: imageUrls,
                    region: region.trim(),
                    address: address.trim(),
                    street_name: streetName.trim(),
                    room_count: parseInt(roomCount, 10),
                    condition: condition.trim(),
                    rent_amount: parseFloat(rentAmount),
                    payment_term: paymentTerm,
                    latitude: latitude ? parseFloat(latitude) : null,
                    longitude: longitude ? parseFloat(longitude) : null,
                    map_link: mapLink.trim() || null,
                }])
                .select('id')
                .single();
            
            if (insertError) throw insertError;

            // 3. Navigate to new post
            navigate(`/rental/${data.id}`);

        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="min-h-screen">
            <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-800">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="absolute right-0 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800">
                            <BackIcon />
                        </button>
                        <h1 className="text-xl font-bold text-center w-full">إضافة عرض إيجار جديد</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                    <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">صور المنزل (مطلوبة)</label>
                            <MultiImageInput onFilesSelect={setImageFiles} />
                        </div>

                        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-zinc-800">
                            <h3 className="text-lg font-semibold">المعلومات الأساسية</h3>
                            <LabeledInput label="المنطقة" value={region} onChange={e => setRegion(e.target.value)} required />
                            <LabeledInput label="العنوان" value={address} onChange={e => setAddress(e.target.value)} required />
                            <LabeledInput label="اسم الشارع" value={streetName} onChange={e => setStreetName(e.target.value)} required />
                        </div>

                        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-zinc-800">
                             <h3 className="text-lg font-semibold">تفاصيل العقار</h3>
                             <LabeledInput label="عدد الغرف" type="number" value={roomCount} onChange={e => setRoomCount(e.target.value)} required />
                             <LabeledSelect label="حالة البيت" value={condition} onChange={e => setCondition(e.target.value)} required>
                                <option value="" disabled>اختر الحالة</option>
                                <option value="جديد">جديد</option>
                                <option value="مستخدم">مستخدم</option>
                                <option value="مجدد">مجدد</option>
                             </LabeledSelect>
                        </div>
                        
                        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-zinc-800">
                             <h3 className="text-lg font-semibold">التفاصيل المالية</h3>
                             <LabeledInput label="أجور البيت للشهر ($)" type="number" value={rentAmount} onChange={e => setRentAmount(e.target.value)} required />
                             <LabeledSelect label="نظام الدفع" value={paymentTerm} onChange={e => setPaymentTerm(e.target.value as PaymentTerm)} required>
                                <option value="monthly">شهري</option>
                                <option value="quarterly">كل 3 أشهر</option>
                                <option value="semi_annually">كل 6 أشهر</option>
                             </LabeledSelect>
                        </div>
                        
                        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-zinc-800">
                             <h3 className="text-lg font-semibold">الموقع على الخريطة (اختياري)</h3>
                             <p className="text-sm text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800/50 p-3 rounded-md">
                                <strong>للحصول على الإحداثيات:</strong>
                                <br />1. افتح تطبيق خرائط جوجل.
                                <br />2. اضغط مطولاً على الموقع المطلوب.
                                <br />3. سيتم نسخ الإحداثيات، الصقها في الحقول أدناه.
                            </p>
                             <div className="flex gap-4">
                                <LabeledInput label="خط العرض (Latitude)" type="number" step="any" value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="مثال: 35.9531" />
                                <LabeledInput label="خط الطول (Longitude)" type="number" step="any" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="مثال: 39.0192" />
                             </div>
                             <LabeledInput label="رابط الموقع (يتم إنشاؤه تلقائياً)" type="url" value={mapLink} readOnly disabled className="!bg-gray-200 dark:!bg-zinc-800 cursor-not-allowed" />
                        </div>
                        
                        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                        <div className="pt-4">
                            <Button type="submit" loading={loading} disabled={imageFiles.length === 0}>
                                نشر العرض
                            </Button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

// Helper components for labeled inputs
const Labeled: React.FC<{label: string, children: React.ReactNode}> = ({ label, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">{label}</label>
        {children}
    </div>
);

const LabeledInput: React.FC<React.ComponentProps<typeof Input> & {label: string}> = ({ label, ...props }) => (
    <Labeled label={label}><Input {...props} /></Labeled>
);

const LabeledSelect: React.FC<React.ComponentProps<typeof Select> & {label: string}> = ({ label, ...props }) => (
    <Labeled label={label}><Select {...props} /></Labeled>
);

export default CreateRentalScreen;
