import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Profile, Post, Product } from '../types';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import { getErrorMessage } from '../utils/errors';
import PostCard from '../components/PostCard';

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 pointer-events-none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);

const ClearIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

const PeopleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-teal-400"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);


interface SearchResults {
    profiles: Profile[];
    posts: Post[];
    products: Product[];
}

const SearchScreen: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults>({ profiles: [], posts: [], products: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            if (query.trim().length > 1) {
                performSearch();
            } else {
                setResults({ profiles: [], posts: [], products: [] });
                setHasSearched(false);
            }
        }, 500); // Debounce search by 500ms

        return () => clearTimeout(debounceTimer);
    }, [query]);

    const performSearch = async () => {
        setLoading(true);
        setError(null);
        setHasSearched(true);
        try {
            const searchTerm = `%${query.trim()}%`;
            
            // First, get post IDs that match the search term
            const { data: postIdsData, error: postIdsError } = await supabase
                .from('posts')
                .select('id')
                .ilike('content', searchTerm)
                .limit(10);
            
            if (postIdsError) throw postIdsError;
            const postIds = postIdsData?.map(p => p.id) || [];

            // Now, fetch the full augmented post data for those IDs
            let augmentedPosts: Post[] = [];
            if (postIds.length > 0) {
                 const { data: postsData, error: postsError } = await supabase
                    .from('posts')
                    .select('*, profiles!user_id(full_name, avatar_url), groups!group_id(name), likes(user_id), comments(count)')
                    .in('id', postIds);
                if(postsError) throw postsError;
                augmentedPosts = postsData as Post[];
            }
            
            const [profilesRes, productsRes] = await Promise.all([
                supabase.from('profiles').select('id, full_name, avatar_url').ilike('full_name', searchTerm).limit(10),
                supabase.from('products').select('id, name, price, stores(name)').ilike('name', searchTerm).limit(10)
            ]);

            if (profilesRes.error) throw profilesRes.error;
            if (productsRes.error) throw productsRes.error;

            setResults({
                profiles: (profilesRes.data as Profile[]) || [],
                posts: augmentedPosts,
                products: (productsRes.data as any[]) || [],
            });

        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };
    
    const ResultSection: React.FC<{ title: string; children: React.ReactNode; hasResults: boolean }> = ({ title, children, hasResults }) => {
        if (!hasResults) return null;
        return (
             <div className="mb-6">
                <h2 className="text-xl font-bold mb-3 text-teal-400">{title}</h2>
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg">
                    {children}
                </div>
            </div>
        )
    };

    const handlePostDeleted = (postId: string) => {
        setResults(prev => ({
            ...prev,
            posts: prev.posts.filter(p => p.id !== postId),
        }));
    };

    const handlePostUpdated = (updatedPost: Post) => {
        setResults(prev => ({
            ...prev,
            posts: prev.posts.map(p => p.id === updatedPost.id ? updatedPost : p),
        }));
    };

    const noResults = !results.profiles.length && !results.posts.length && !results.products.length;

    return (
        <div className="min-h-screen">
            <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-800">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16 gap-4">
                        <h1 className="text-xl font-bold">بحث</h1>
                        <div className="relative flex-1">
                            <Input
                                type="text"
                                placeholder="ابحث عن مستخدمين، منشورات، منتجات..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="pl-10 pr-10 w-full !bg-gray-100 dark:!bg-zinc-800 !border-gray-200 dark:!border-zinc-700 rounded-full"
                                autoFocus
                            />
                            <SearchIcon />
                            {query && (
                                <button
                                    onClick={() => setQuery('')}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white focus:outline-none"
                                    aria-label="مسح البحث"
                                >
                                    <ClearIcon />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                    <Link to="/suggestions" className="block bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4 mb-6 hover:border-teal-500 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="bg-gray-100 dark:bg-zinc-800 p-3 rounded-full">
                                <PeopleIcon />
                            </div>
                            <div>
                                <h2 className="font-bold text-zinc-900 dark:text-white">أشخاص قد تعرفهم</h2>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">ابحث عن أصدقاء جدد بناءً على متابعاتك.</p>
                            </div>
                        </div>
                    </Link>

                    {loading && <div className="text-center py-10"><Spinner /></div>}
                    {error && <p className="text-center text-red-400 py-10">{error}</p>}
                    
                    {!loading && !error && (
                        <div>
                             {hasSearched && noResults && (
                                <p className="text-center text-zinc-500 dark:text-zinc-400 py-10">
                                    لم يتم العثور على نتائج لـ "{query}"
                                </p>
                            )}

                            <ResultSection title="المستخدمون" hasResults={results.profiles.length > 0}>
                               <div className="divide-y divide-gray-200 dark:divide-zinc-800">
                                {results.profiles.map(profile => (
                                    <Link key={profile.id} to={`/user/${profile.id}`} className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-zinc-800/50 transition-colors">
                                        <Avatar url={profile.avatar_url} size={40} />
                                        <span className="font-semibold">{profile.full_name}</span>
                                    </Link>
                                ))}
                               </div>
                            </ResultSection>

                             {results.posts.length > 0 && (
                                <div className="mb-6">
                                    <h2 className="text-xl font-bold mb-3 text-teal-400">المنشورات</h2>
                                    {results.posts.map(post => (
                                        <PostCard 
                                            key={post.id} 
                                            post={post} 
                                            onPostDeleted={handlePostDeleted} 
                                            onPostUpdated={handlePostUpdated} 
                                        />
                                    ))}
                                </div>
                            )}
                            
                             <ResultSection title="المنتجات" hasResults={results.products.length > 0}>
                                <div className="divide-y divide-gray-200 dark:divide-zinc-800">
                                {results.products.map(product => (
                                    <Link key={product.id} to={`/product/${product.id}`} className="block p-3 hover:bg-gray-100 dark:hover:bg-zinc-800/50 transition-colors">
                                        <div className="flex justify-between">
                                           <div>
                                               <p className="font-semibold">{product.name}</p>
                                               <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">في متجر {(product as any).stores?.name || 'متجر'}</p>
                                           </div>
                                           <p className="font-semibold text-teal-400">{product.price.toFixed(2)}$</p>
                                        </div>
                                    </Link>
                                ))}
                                </div>
                            </ResultSection>

                        </div>
                    )}

                </div>
            </main>
        </div>
    );
};

export default SearchScreen;