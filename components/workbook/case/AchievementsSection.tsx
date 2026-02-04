import { Award, Lock, CheckCircle, Star } from 'lucide-react';

interface AchievementsSectionProps {
  caseId: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
}

export default function AchievementsSection({ caseId }: AchievementsSectionProps) {
  const achievements: Achievement[] = [
    {
      id: '1',
      title: 'First Steps',
      description: 'Complete your first case milestone',
      icon: <Star className="w-6 h-6" />,
      unlocked: true,
    },
    {
      id: '2',
      title: 'Document Hunter',
      description: 'Upload 10 documents to your case',
      icon: <Award className="w-6 h-6" />,
      unlocked: false,
      progress: 3,
      maxProgress: 10,
    },
    {
      id: '3',
      title: 'Family Historian',
      description: 'Add 20 family members to the family tree',
      icon: <CheckCircle className="w-6 h-6" />,
      unlocked: false,
      progress: 8,
      maxProgress: 20,
    },
    {
      id: '4',
      title: 'Legal Eagle',
      description: 'Complete all legal document templates',
      icon: <Award className="w-6 h-6" />,
      unlocked: false,
      progress: 1,
      maxProgress: 5,
    },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="space-y-6">
      <div className="bg-[#1a2942] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Your Progress</h2>
          <span className="text-[#94a3b8]">{unlockedCount} / {achievements.length} Unlocked</span>
        </div>
        <div className="w-full bg-[#0f1a2c] rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-[#f97316] to-[#fb923c] h-3 rounded-full transition-all"
            style={{ width: `${(unlockedCount / achievements.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`bg-[#1a2942] rounded-xl p-6 border transition-all ${
              achievement.unlocked
                ? 'border-[#f97316] shadow-lg shadow-[#f97316]/10'
                : 'border-[#2a3f5f] opacity-75'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${
                achievement.unlocked
                  ? 'bg-gradient-to-br from-[#f97316] to-[#fb923c] text-white'
                  : 'bg-[#0f1a2c] text-[#64748b]'
              }`}>
                {achievement.unlocked ? achievement.icon : <Lock className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium text-white">{achievement.title}</h3>
                  {achievement.unlocked && (
                    <CheckCircle className="w-5 h-5 text-[#22c55e]" />
                  )}
                </div>
                <p className="text-[#94a3b8] text-sm mt-1">{achievement.description}</p>
                {!achievement.unlocked && achievement.progress !== undefined && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-[#64748b] mb-1">
                      <span>Progress</span>
                      <span>{achievement.progress} / {achievement.maxProgress}</span>
                    </div>
                    <div className="w-full bg-[#0f1a2c] rounded-full h-2">
                      <div 
                        className="bg-[#3b82f6] h-2 rounded-full transition-all"
                        style={{ width: `${(achievement.progress / (achievement.maxProgress || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
