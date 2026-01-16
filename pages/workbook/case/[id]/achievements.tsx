import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'research' | 'family' | 'records' | 'progress';
  requirement: (stats: Stats) => boolean;
  points: number;
}

interface Stats {
  personsCount: number;
  recordsCount: number;
  notesCount: number;
  relationshipsCount: number;
  landRecordsCount: number;
  checklistsCompleted: number;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-person',
    title: 'First Steps',
    description: 'Add your first family member to the tree',
    icon: '👣',
    category: 'family',
    requirement: (stats) => stats.personsCount >= 1,
    points: 10,
  },
  {
    id: 'family-tree',
    title: 'Growing Tree',
    description: 'Add 5 family members',
    icon: '🌱',
    category: 'family',
    requirement: (stats) => stats.personsCount >= 5,
    points: 25,
  },
  {
    id: 'family-forest',
    title: 'Family Forest',
    description: 'Add 10 or more family members',
    icon: '🌳',
    category: 'family',
    requirement: (stats) => stats.personsCount >= 10,
    points: 50,
  },
  {
    id: 'connected',
    title: 'Connected',
    description: 'Create your first family relationship',
    icon: '🔗',
    category: 'family',
    requirement: (stats) => stats.relationshipsCount >= 1,
    points: 15,
  },
  {
    id: 'family-web',
    title: 'Family Web',
    description: 'Create 10 or more relationships',
    icon: '🕸️',
    category: 'family',
    requirement: (stats) => stats.relationshipsCount >= 10,
    points: 40,
  },
  {
    id: 'first-record',
    title: 'Record Keeper',
    description: 'Save your first historical record',
    icon: '📋',
    category: 'records',
    requirement: (stats) => stats.recordsCount >= 1,
    points: 10,
  },
  {
    id: 'record-collector',
    title: 'Record Collector',
    description: 'Save 10 historical records',
    icon: '📚',
    category: 'records',
    requirement: (stats) => stats.recordsCount >= 10,
    points: 35,
  },
  {
    id: 'archivist',
    title: 'Archivist',
    description: 'Save 25 or more records',
    icon: '🏛️',
    category: 'records',
    requirement: (stats) => stats.recordsCount >= 25,
    points: 75,
  },
  {
    id: 'land-hunter',
    title: 'Land Hunter',
    description: 'Find your first land record',
    icon: '🏠',
    category: 'records',
    requirement: (stats) => stats.landRecordsCount >= 1,
    points: 20,
  },
  {
    id: 'deed-detective',
    title: 'Deed Detective',
    description: 'Find 5 land records',
    icon: '🔍',
    category: 'records',
    requirement: (stats) => stats.landRecordsCount >= 5,
    points: 50,
  },
  {
    id: 'first-note',
    title: 'Researcher',
    description: 'Write your first research note',
    icon: '📝',
    category: 'research',
    requirement: (stats) => stats.notesCount >= 1,
    points: 10,
  },
  {
    id: 'note-taker',
    title: 'Detailed Notes',
    description: 'Write 5 research notes',
    icon: '✍️',
    category: 'research',
    requirement: (stats) => stats.notesCount >= 5,
    points: 25,
  },
  {
    id: 'scholar',
    title: 'Scholar',
    description: 'Write 10 or more research notes',
    icon: '🎓',
    category: 'research',
    requirement: (stats) => stats.notesCount >= 10,
    points: 50,
  },
  {
    id: 'checklist-starter',
    title: 'Checklist Champion',
    description: 'Complete your first checklist step',
    icon: '✅',
    category: 'progress',
    requirement: (stats) => stats.checklistsCompleted >= 1,
    points: 10,
  },
  {
    id: 'methodical',
    title: 'Methodical',
    description: 'Complete 10 checklist steps',
    icon: '📊',
    category: 'progress',
    requirement: (stats) => stats.checklistsCompleted >= 10,
    points: 40,
  },
  {
    id: 'thorough',
    title: 'Thorough',
    description: 'Complete 25 checklist steps',
    icon: '🏆',
    category: 'progress',
    requirement: (stats) => stats.checklistsCompleted >= 25,
    points: 100,
  },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  family: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  records: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  research: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  progress: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
};

export default function AchievementsPage() {
  const router = useRouter();
  const { id } = router.query;

  const [stats, setStats] = useState<Stats>({
    personsCount: 0,
    recordsCount: 0,
    notesCount: 0,
    relationshipsCount: 0,
    landRecordsCount: 0,
    checklistsCompleted: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchStats = async () => {
      try {
        const [treeRes, recordsRes, notesRes, checklistsRes] = await Promise.all([
          fetch(`/api/workbook/family-tree/persons?caseId=${id}`),
          fetch(`/api/workbook/saved-records?caseId=${id}`),
          fetch(`/api/workbook/notes?caseId=${id}`),
          fetch(`/api/workbook/checklists?caseId=${id}`),
        ]);

        const [treeData, recordsData, notesData, checklistsData] = await Promise.all([
          treeRes.json(),
          recordsRes.json(),
          notesRes.json(),
          checklistsRes.json(),
        ]);

        const records = recordsData.records || [];
        const landRecords = records.filter((r: any) => r.is_land_record);
        const completedChecklists = (checklistsData.progress || []).filter((p: any) => p.completed);

        setStats({
          personsCount: treeData.persons?.length || 0,
          recordsCount: records.length,
          notesCount: notesData.notes?.length || 0,
          relationshipsCount: treeData.relationships?.length || 0,
          landRecordsCount: landRecords.length,
          checklistsCompleted: completedChecklists.length,
        });
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [id]);

  const earnedAchievements = ACHIEVEMENTS.filter(a => a.requirement(stats));
  const lockedAchievements = ACHIEVEMENTS.filter(a => !a.requirement(stats));
  const totalPoints = earnedAchievements.reduce((sum, a) => sum + a.points, 0);
  const maxPoints = ACHIEVEMENTS.reduce((sum, a) => sum + a.points, 0);

  const getLevel = (points: number) => {
    if (points >= 400) return { level: 5, title: 'Master Genealogist', color: 'text-purple-600' };
    if (points >= 250) return { level: 4, title: 'Expert Researcher', color: 'text-blue-600' };
    if (points >= 150) return { level: 3, title: 'Skilled Investigator', color: 'text-green-600' };
    if (points >= 75) return { level: 2, title: 'Budding Historian', color: 'text-amber-600' };
    return { level: 1, title: 'Beginner', color: 'text-gray-600' };
  };

  const levelInfo = getLevel(totalPoints);

  return (
    <>
      <Head>
        <title>Achievements | Land Reclamation Workbook</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-gradient-to-r from-amber-600 to-orange-600 text-white">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <Link href={`/workbook/case/${id}`} className="text-amber-100 hover:text-white text-sm mb-2 inline-block">
              ← Back to Case
            </Link>
            <h1 className="text-2xl font-bold">Research Achievements</h1>
            <p className="text-amber-100 mt-1">Track your progress and earn badges</p>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border p-6 mb-8">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-3xl font-bold">
                    {levelInfo.level}
                  </div>
                  <div className="flex-1">
                    <div className={`text-xl font-bold ${levelInfo.color}`}>{levelInfo.title}</div>
                    <p className="text-gray-600 text-sm mt-1">
                      {earnedAchievements.length} of {ACHIEVEMENTS.length} achievements earned
                    </p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{totalPoints} points</span>
                        <span>{maxPoints} total</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full">
                        <div 
                          className="h-3 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all"
                          style={{ width: `${(totalPoints / maxPoints) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.personsCount}</div>
                  <div className="text-xs text-green-700">Family Members</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.recordsCount}</div>
                  <div className="text-xs text-blue-700">Records Saved</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.notesCount}</div>
                  <div className="text-xs text-purple-700">Research Notes</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">{stats.checklistsCompleted}</div>
                  <div className="text-xs text-amber-700">Steps Completed</div>
                </div>
              </div>

              {earnedAchievements.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Earned Achievements</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {earnedAchievements.map(achievement => {
                      const colors = CATEGORY_COLORS[achievement.category];
                      return (
                        <div 
                          key={achievement.id}
                          className={`${colors.bg} ${colors.border} border rounded-xl p-4 flex items-center gap-4`}
                        >
                          <div className="text-4xl">{achievement.icon}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${colors.text}`}>{achievement.title}</span>
                              <span className="text-xs px-2 py-0.5 bg-white/50 rounded-full">
                                +{achievement.points} pts
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{achievement.description}</p>
                          </div>
                          <div className="text-2xl text-green-500">✓</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {lockedAchievements.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Locked Achievements</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {lockedAchievements.map(achievement => (
                      <div 
                        key={achievement.id}
                        className="bg-gray-100 border border-gray-200 rounded-xl p-4 flex items-center gap-4 opacity-60"
                      >
                        <div className="text-4xl grayscale">{achievement.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-500">{achievement.title}</span>
                            <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full text-gray-500">
                              +{achievement.points} pts
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{achievement.description}</p>
                        </div>
                        <div className="text-2xl text-gray-300">🔒</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
