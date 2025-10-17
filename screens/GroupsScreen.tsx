import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Group } from '../types';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import GroupCard from '../components/GroupCard';
import { getErrorMessage } from '../utils/errors';
import GroupCardSkeleton from '../components/ui/GroupCardSkeleton';

const GroupsScreen: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'my-groups' | 'joined'>('all');
  const [groups, setGroups] = useState<Group[]>([]);
  const [joinedGroupIds, setJoinedGroupIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);

      try {
        const { data: memberGroupsData, error: memberGroupsError } = await supabase
            .from('group_members')
            .select('group_id')
            .eq('user_id', user.id);

        if (memberGroupsError) throw memberGroupsError;
        
        // FIX: Explicitly create a Set of strings to match the state type.
        // Also handle the case where memberGroupsData is null to prevent runtime errors.
        const joinedIds = new Set<string>((memberGroupsData || []).map(mg => mg.group_id));
        setJoinedGroupIds(joinedIds);

        let query = supabase
          .from('groups')
          .select('id, created_at, name, description, user_id, cover_image_url, is_private');
          
        if (activeTab === 'my-groups') {
            query = query.eq('user_id', user.id);
        } else if (activeTab === 'joined') {
            if (joinedIds.size === 0) {
                setGroups([]);
                setLoading(false);
                return;
            }
            query = query.in('id', Array.from(joinedIds));
        }

        const { data: groupsData, error: groupsError } = await query.order('name', { ascending: true });

        if (groupsError) throw groupsError;
        
        if (!groupsData || groupsData.length === 0) {
            setGroups([]);
            setLoading(false);
            return;
        }

        const groupIds = groupsData.map(g => g.id);
        const { data: membersData, error: membersError } = await supabase
            .from('group_members')
            .select('group_id')
            .in('group_id', groupIds);

        if (membersError) throw membersError;

        const membersByGroup = new Map<string, number>();
        (membersData || []).forEach(member => {
            membersByGroup.set(member.group_id, (membersByGroup.get(member.group_id) || 0) + 1);
        });

        groupsData.forEach((group: any) => {
            group.group_members = [{ count: membersByGroup.get(group.id) || 0 }];
        });

        setGroups(groupsData as Group[]);

      } catch (error: unknown) {
        console.error("Error fetching groups:", error);
        setError(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [activeTab, user]);

  const handleGroupJoined = (groupId: string) => {
    setJoinedGroupIds(prev => new Set(prev).add(groupId));
    setGroups(prevGroups => 
      prevGroups.map(g => 
        g.id === groupId 
          ? { ...g, group_members: [{ count: (g.group_members[0]?.count || 0) + 1 }] }
          : g
      )
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col gap-3">
          <GroupCardSkeleton />
          <GroupCardSkeleton />
          <GroupCardSkeleton />
        </div>
      );
    }

    if (error) {
      return <p className="text-center text-red-400 py-10">{error}</p>;
    }

    if (groups.length === 0) {
      const messages = {
        all: "لا توجد مجموعات حتى الآن. كن أول من ينشئ مجموعة!",
        'my-groups': "لم تقم بإنشاء أي مجموعات بعد.",
        'joined': "أنت لم تنضم إلى أي مجموعات بعد."
      };
      return <p className="text-center text-gray-500 dark:text-zinc-400 py-10">{messages[activeTab]}</p>;
    }

    return (
      <div className="flex flex-col gap-3">
        {groups.map(group => (
          <GroupCard 
            key={group.id} 
            group={group} 
            isMember={joinedGroupIds.has(group.id)}
            onGroupJoined={handleGroupJoined}
          />
        ))}
      </div>
    );
  };
  
  const tabButtonClasses = (tabName: typeof activeTab) => 
    `flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
      activeTab === tabName ? 'bg-teal-500 text-white' : 'text-zinc-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
    }`;

  return (
    <div className="min-h-screen">
      <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-800">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold">المجموعات</h1>
            <Link to="/groups/new">
              <Button className="!w-auto px-4 py-2 text-sm">أنشئ مجموعة</Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
            <div className="bg-gray-100 dark:bg-zinc-900 p-1 rounded-lg flex gap-1 mb-4 border border-gray-200 dark:border-zinc-800">
                <button className={tabButtonClasses('all')} onClick={() => setActiveTab('all')}>كل المجموعات</button>
                <button className={tabButtonClasses('my-groups')} onClick={() => setActiveTab('my-groups')}>مجموعاتي</button>
                <button className={tabButtonClasses('joined')} onClick={() => setActiveTab('joined')}>انضماماتي</button>
            </div>
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default GroupsScreen;
