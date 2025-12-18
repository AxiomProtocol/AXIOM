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
  const [hasMembership, setHasMembership] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const course = COURSES_DATA.find(c => c.slug === slug);
  const requiresProMembership = course?.requiredTier === 'pro';

  useEffect(() => {
    const checkMembership = async () => {
      if (!requiresProMembership) {
        setHasMembership(true);
        setIsLoading(false);
        return;
      }

      const savedMembership = localStorage.getItem('axiom_academy_membership');
      if (savedMembership) {
        try {
          const membership = JSON.parse(savedMembership);
          const expiresAt = new Date(membership.expiresAt);
          if (expiresAt > new Date() && (membership.tier === 'pro' || membership.tier === 'enterprise')) {
            setHasMembership(true);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.error('Error parsing membership:', e);
        }
      }

      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      
      if (sessionId) {
        try {
          const response = await fetch('/api/academy/check-membership', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          });
          const data = await response.json();
          
          if (data.hasMembership) {
            localStorage.setItem('axiom_academy_membership', JSON.stringify({
              tier: data.tier,
              expiresAt: data.expiresAt,
              status: data.status
            }));
            setHasMembership(true);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.error('Error checking session:', e);
        }
      }

      setHasMembership(false);
      setIsLoading(false);
    };

    if (slug) {
      checkMembership();
      
      const savedProgress = localStorage.getItem(`course_progress_${slug}`);
      if (savedProgress) {
        setProgress(JSON.parse(savedProgress));
        setIsEnrolled(true);
      }
    }
  }, [slug, requiresProMembership]);

  const handleEnroll = () => {
    setIsEnrolled(true);
    localStorage.setItem(`course_progress_${slug}`, JSON.stringify({}));
  };

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    try {
      const response = await fetch('/api/academy/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'pro' })
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setCheckoutLoading(false);
    }
  };

  if (!course) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Course Not Found</h1>
            <Link href="/academy" className="text-yellow-600 hover:underline">
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
      case 'beginner': return 'bg-green-100 text-green-700';
      case 'intermediate': return 'bg-yellow-100 text-yellow-700';
      case 'advanced': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-gray-100 via-white to-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading course...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-100 via-white to-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Link 
            href="/academy" 
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Academy
          </Link>

          <div className="bg-white border border-gray-200 rounded-2xl p-8 mb-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className={`text-sm px-3 py-1 rounded-full ${getDifficultyColor(course.difficulty)}`}>
                {course.difficulty}
              </span>
              <span className="text-gray-400 text-sm">{course.category}</span>
              {requiresProMembership && (
                <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">PRO</span>
              )}
            </div>

            <h1 className="text-4xl font-bold text-gray-900 mb-4">{course.title}</h1>
            <p className="text-xl text-gray-600 mb-6">{course.description}</p>

            <div className="flex flex-wrap gap-6 text-gray-500 mb-8">
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

            {requiresProMembership && !hasMembership ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Pro Membership Required</h3>
                    <p className="text-gray-600">Unlock this course and 6 more with Pro</p>
                  </div>
                </div>
                <button
                  onClick={handleUpgrade}
                  disabled={checkoutLoading}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {checkoutLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>Upgrade to Pro - $25/month</>
                  )}
                </button>
              </div>
            ) : !isEnrolled ? (
              <button
                onClick={handleEnroll}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-3 px-8 rounded-lg transition-all"
              >
                Start Course
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 font-medium">Your Progress</span>
                  <span className="text-yellow-600">{progressPercent}% Complete</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {progressPercent === 100 && (
                  <div className="bg-green-100 border border-green-300 rounded-lg p-4 text-center">
                    <span className="text-green-700 font-medium">Course Completed! Certificate Available</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Course Content</h2>
            
            {course.lessons.map((lesson, index) => {
              const isCompleted = progress[lesson.id];
              const isLockedByEnrollment = !isEnrolled && index > 0;
              const isLockedByMembership = requiresProMembership && !hasMembership;
              const isLocked = isLockedByEnrollment || isLockedByMembership;

              return (
                <div
                  key={lesson.id}
                  className={`bg-white border rounded-xl p-6 transition-all shadow-sm ${
                    isCompleted 
                      ? 'border-green-300 bg-green-50' 
                      : isLocked 
                        ? 'border-gray-200 opacity-60' 
                        : 'border-gray-200 hover:border-yellow-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        isCompleted 
                          ? 'bg-green-500 text-white' 
                          : isLocked
                            ? 'bg-gray-300 text-gray-500'
                            : 'bg-gray-200 text-gray-600'
                      }`}>
                        {isCompleted ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : isLocked ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{lesson.title}</h3>
                        <p className="text-gray-500 text-sm">{lesson.duration} min</p>
                      </div>
                    </div>
                    
                    {isLockedByMembership ? (
                      <div className="text-yellow-600 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span className="text-sm font-medium">Pro Required</span>
                      </div>
                    ) : isLockedByEnrollment ? (
                      <div className="text-gray-400 flex items-center gap-2">
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
                            ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
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
