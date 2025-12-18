import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import Link from 'next/link';
import { COURSES_DATA } from '../../../lib/academyCourses';

export default function CoursePage() {
  const router = useRouter();
  const { slug } = router.query;
  const [progress, setProgress] = useState<Record<number, boolean>>({});
  const [isEnrolled, setIsEnrolled] = useState(false);

  const course = COURSES_DATA.find(c => c.slug === slug);

  useEffect(() => {
    if (slug) {
      const savedProgress = localStorage.getItem(`course_progress_${slug}`);
      if (savedProgress) {
        setProgress(JSON.parse(savedProgress));
        setIsEnrolled(true);
      }
    }
  }, [slug]);

  const handleEnroll = () => {
    setIsEnrolled(true);
    localStorage.setItem(`course_progress_${slug}`, JSON.stringify({}));
  };

  if (!course) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">Course Not Found</h1>
            <Link href="/academy" className="text-yellow-400 hover:underline">
              Back to Academy
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const completedLessons = Object.values(progress).filter(Boolean).length;
  const progressPercent = course.lessons.length > 0 
    ? Math.round((completedLessons / course.lessons.length) * 100) 
    : 0;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/20 text-green-400';
      case 'intermediate': return 'bg-yellow-500/20 text-yellow-400';
      case 'advanced': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Link 
            href="/academy" 
            className="inline-flex items-center text-gray-400 hover:text-white mb-8"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Academy
          </Link>

          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className={`text-sm px-3 py-1 rounded-full ${getDifficultyColor(course.difficulty)}`}>
                {course.difficulty}
              </span>
              <span className="text-gray-400 text-sm">{course.category}</span>
            </div>

            <h1 className="text-4xl font-bold text-white mb-4">{course.title}</h1>
            <p className="text-xl text-gray-300 mb-6">{course.description}</p>

            <div className="flex flex-wrap gap-6 text-gray-400 mb-8">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>{course.lessons.length} lessons</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{course.durationMinutes} minutes</span>
              </div>
            </div>

            {!isEnrolled ? (
              <button
                onClick={handleEnroll}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-3 px-8 rounded-lg transition-all"
              >
                Start Course
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">Your Progress</span>
                  <span className="text-yellow-400">{progressPercent}% Complete</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {progressPercent === 100 && (
                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 text-center">
                    <span className="text-green-400 font-medium">Course Completed! Certificate Available</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-6">Course Content</h2>
            
            {course.lessons.map((lesson, index) => {
              const isCompleted = progress[lesson.id];
              const isLocked = !isEnrolled && index > 0;

              return (
                <div
                  key={lesson.id}
                  className={`bg-gray-800/30 border rounded-xl p-6 transition-all ${
                    isCompleted 
                      ? 'border-green-500/30 bg-green-500/5' 
                      : isLocked 
                        ? 'border-gray-700/50 opacity-60' 
                        : 'border-gray-700/50 hover:border-yellow-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        isCompleted 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-700 text-gray-300'
                      }`}>
                        {isCompleted ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{lesson.title}</h3>
                        <p className="text-gray-400 text-sm">{lesson.duration} min</p>
                      </div>
                    </div>
                    
                    {isLocked ? (
                      <div className="text-gray-500 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Enroll to unlock</span>
                      </div>
                    ) : (
                      <Link
                        href={`/academy/course/${slug}/lesson/${lesson.id}`}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          isCompleted
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-yellow-500 text-black hover:bg-yellow-600'
                        }`}
                      >
                        {isCompleted ? 'Review' : 'Start'}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
