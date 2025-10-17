import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { getErrorMessage } from '../utils/errors';
import { PaymentTerm, RentalPost } from '../types';
import Spinner from '../components/ui/Spinner';

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
);
const UploadIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-gray-400 dark:text-zinc-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg> );
const CloseIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> );

const EditRentalScreen: React.FC = () => {
    const { rentalId } = useParams<{ rentalId: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [post, setPost] = useState<RentalPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
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

    // Image state
    const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
    const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
    const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
    const [imagePathsToRemove, setImagePathsToRemove] = useState<string[]>([]);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchPost = async () => {
            if (!rentalId || !user) return;
            try {
                const { data, error } = await supabase.from('rental_posts').select('*').eq('id', rentalId).single();
                if (error) throw error;
                if (data.user_id !== user.id) {
                    setError('ليس لديك الصلاحية لتعديل هذا العرض.');
                    setTimeout(() => navigate('/rentals'), 2000);
                    return;
                }
                setPost(data);
                setRegion(data.region);
                setAddress(data.address);
                setStreetName(data.street_name);
                setRoomCount(data.room_count.toString());
                setCondition(data.condition);
                setRentAmount(data.rent_amount.toString());
                setPaymentTerm(data.payment_term);
                setLatitude(data.latitude?.toString() || '');
                setLongitude(data.longitude?.toString() || '');
                setMapLink(data.map_link || '');
                setExistingImageUrls(data.image_urls || []);

            } catch (err) {
                setError(getErrorMessage(err));
            } finally {
                setLoading(false);
            }
        };
        fetchPost();
    }, [rentalId, user, navigate]);

    useEffect(() => {
        if (latitude && longitude) {
            setMapLink(`https://www.google.com/maps?q=${latitude},${longitude}`);
        }
    }, [latitude, longitude]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setNewImageFiles(prev => [...prev, ...files]);

        files.forEach((file: File) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewImagePreviews(prev => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeNewImage = (index: number) => {
        setNewImageFiles(prev => prev.filter((_, i) => i !== index));
        setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingImage = (url: string) => {
        setImagePathsToRemove(prev => [...prev, url]);
        setExistingImageUrls(prev => prev.filter(u => u !== url));
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !rentalId) return;
        setUpdating(true);
        setError(null);

        try {
            // 1. Delete removed images from storage
            if (imagePathsToRemove.length > 0) {
                const { error: removeError } = await supabase.storage.from('uploads').remove(imagePathsToRemove);
                if (removeError) throw removeError;
            }

            // 2. Upload new images
            const newUploadedUrls = await Promise.all(
                newImageFiles.map(async (file) => {
                    const fileName = `${user.id}/rentals/${Date.now()}-${file.name}`;
                    const { error } = await supabase.storage
                        .from('uploads')
                        .upload(fileName, file, {
                            contentType: file.type,
                            upsert: true,
                        });
                    if (error) throw error;
                    return fileName;
                })
            );

            // 3. Combine image URLs and update post
            const finalImageUrls = [...existingImageUrls, ...newUploadedUrls];

            const { error: updateError } = await supabase
                .from('rental_posts')
                .update({
                    region, address, street_name: streetName,
                    room_count: parseInt(roomCount),
                    condition, rent_amount: parseFloat(rentAmount),
                    payment_term: paymentTerm,
                    latitude: latitude ? parseFloat(latitude) : null,
                    longitude: longitude ? parseFloat(longitude) : null,
                    map_link: mapLink,
                    image_urls: finalImageUrls,
                })
                .eq('id', rentalId);

            if (updateError) throw updateError;

            navigate(`/rental/${rentalId}`);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setUpdating(false);
        }
    };
    
    if (loading) return <div className="flex h-screen w-full items-center justify-center"><Spinner /></div>;
    if (error && !post) return <div className="flex h-screen w-full items-center justify-center text-red-400">{error}</div>;

    return (
        <div className="min-h-screen">
            <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-800">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="absolute right-0 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800">
                            <BackIcon />
                        </button>
                        <h1 className="text-xl font-bold text-center w-full">تعديل عرض الإيجار</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                    <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6 space-y-6">
                        {/* Image Editor */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">صور المنزل</label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                {existingImageUrls.map((url) => {
                                    const publicUrl = supabase.storage.from('uploads').getPublicUrl(url).data.publicUrl;
                                    return (
                                        <div key={url} className="relative aspect-square w-full rounded-lg overflow-hidden group">
                                            <img src={publicUrl} className="w-full h-full object-cover" />
                                            <button type="button" onClick={() => removeExistingImage(url)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1.5 hover:bg-red-500"><CloseIcon /></button>
                                        </div>
                                    );
                                })}
                                {newImagePreviews.map((src, index) => (
                                    <div key={index} className="relative aspect-square w-full rounded-lg overflow-hidden group">
                                        <img src={src} className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => removeNewImage(index)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1.5 hover:bg-red-500"><CloseIcon /></button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square w-full bg-gray-100 dark:bg-zinc-800/50 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-teal-500">
                                    <UploadIcon /><span className="text-xs text-gray-500 dark:text-zinc-400 mt-1">إضافة صور</span>
                                </button>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" multiple />
                            </div>
                        </div>

                        {/* Form Fields */}
                        <LabeledInput label="المنطقة" value={region} onChange={e => setRegion(e.target.value)} required />
                        <LabeledInput label="العنوان" value={address} onChange={e => setAddress(e.target.value)} required />
                        <LabeledInput label="عدد الغرف" type="number" value={roomCount} onChange={e => setRoomCount(e.target.value)} required />
                        <LabeledSelect label="حالة البيت" value={condition} onChange={e => setCondition(e.target.value)} required>
                            <option value="" disabled>اختر الحالة</option>
                            <option value="جديد">جديد</option><option value="مستخدم">مستخدم</option><option value="مجدد">مجدد</option>
                        </LabeledSelect>
                        <LabeledInput label="أجور البيت للشهر ($)" type="number" value={rentAmount} onChange={e => setRentAmount(e.target.value)} required />
                        <LabeledSelect label="نظام الدفع" value={paymentTerm} onChange={e => setPaymentTerm(e.target.value as PaymentTerm)} required>
                            <option value="monthly">شهري</option>
                            <option value="quarterly">كل 3 أشهر</option>
                            <option value="semi_annually">كل 6 أشهر</option>
                        </LabeledSelect>
                        <LabeledInput label="خط العرض (Latitude)" type="number" step="any" value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="مثال: 35.9531" />
                        <LabeledInput label="خط الطول (Longitude)" type="number" step="any" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="مثال: 39.0192" />
                        <LabeledInput label="رابط الموقع (يتم إنشاؤه تلقائياً)" type="url" value={mapLink} readOnly disabled className="!bg-gray-200 dark:!bg-zinc-800 cursor-not-allowed" />
                        
                        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                        <div className="pt-4">
                            <Button type="submit" loading={updating}>
                                حفظ التعديلات
                            </Button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

// FIX: Added missing helper components Labeled, LabeledInput, and LabeledSelect.
// Helper components for labeled inputs
const Labeled: React.FC<{label: string, children: React.ReactNode}> = ({ label, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{label}</label>
        {children}
    </div>
);

const LabeledInput: React.FC<React.ComponentProps<typeof Input> & {label: string}> = ({ label, ...props }) => (
    <Labeled label={label}><Input {...props} /></Labeled>
);

const LabeledSelect: React.FC<React.ComponentProps<typeof Select> & {label: string}> = ({ label, ...props }) => (
    <Labeled label={label}><Select {...props} /></Labeled>
);

export default EditRentalScreen;
