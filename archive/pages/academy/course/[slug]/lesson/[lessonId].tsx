import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Layout from '../../../../../components/Layout';
import Link from 'next/link';
import { COURSES_DATA } from '../../../../../lib/academyCourses';

export default function LessonPage() {
  const router = useRouter();
  const { slug, lessonId } = router.query;
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasMembership, setHasMembership] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const course = COURSES_DATA.find(c => c.slug === slug);
  const lesson = course?.lessons.find(l => l.id === Number(lessonId));
  const lessonIndex = course?.lessons.findIndex(l => l.id === Number(lessonId)) ?? -1;
  const nextLesson = course?.lessons[lessonIndex + 1];
  const prevLesson = lessonIndex > 0 ? course?.lessons[lessonIndex - 1] : null;

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

    if (slug && lessonId) {
      checkMembership();
      
      const savedProgress = localStorage.getItem(`course_progress_${slug}`);
      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        setIsCompleted(!!progress[lessonId]);
      }
    }
  }, [slug, lessonId, requiresProMembership]);

  const markComplete = () => {
    if (!slug || !lessonId) return;
    
    const savedProgress = localStorage.getItem(`course_progress_${slug}`);
    const progress = savedProgress ? JSON.parse(savedProgress) : {};
    progress[lessonId] = true;
    localStorage.setItem(`course_progress_${slug}`, JSON.stringify(progress));
    setIsCompleted(true);
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

  if (!course || !lesson) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Lesson Not Found</h1>
            <Link href="/academy" className="text-yellow-600 hover:underline">
              Back to Academy
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-gray-100 via-white to-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Checking access...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (requiresProMembership && !hasMembership) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-gray-100 via-white to-gray-100">
          <div className="max-w-2xl mx-auto px-4 py-16">
            <Link 
              href={`/academy/course/${slug}`}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to {course.title}
            </Link>

            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-lg text-center">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">Pro Content</h1>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                This lesson is part of the <span className="font-semibold text-yellow-600">{course.title}</span> course, 
                which requires a Pro membership to access.
              </p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
                <h3 className="font-bold text-gray-900 mb-4">What you get with Pro:</h3>
                <ul className="text-left space-y-3 max-w-sm mx-auto">
                  <li className="flex items-center gap-3 text-gray-700">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Access to ALL 9 courses
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Live weekly workshops
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Certificates of completion
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Exclusive community access
                  </li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleUpgrade}
                  disabled={checkoutLoading}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-4 px-8 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {checkoutLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      Upgrade to Pro - $25/month
                    </>
                  )}
                </button>
                <Link
                  href="/academy"
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-4 px-8 rounded-xl transition-all text-center"
                >
                  Browse Free Courses
                </Link>
              </div>
            </div>
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
            href={`/academy/course/${slug}`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {course.title}
          </Link>

          <div className="flex items-center gap-4 text-gray-500 text-sm mb-6">
            <span>{course.title}</span>
            <span>/</span>
            <span>Lesson {lessonIndex + 1} of {course.lessons.length}</span>
            {requiresProMembership && (
              <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">PRO</span>
            )}
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-8">{lesson.title}</h1>

          <div className="bg-white border border-gray-200 rounded-2xl p-8 mb-8 shadow-sm">
            <div className="prose max-w-none">
              {lesson.content.split('\n\n').map((paragraph, i) => {
                const formatText = (text: string) => {
                  return text.split(/(\*\*[^*]+\*\*)/).map((part, idx) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return <strong key={idx} className="text-gray-900 font-semibold">{part.slice(2, -2)}</strong>;
                    }
                    return part;
                  });
                };
                
                if (paragraph.startsWith('## ')) {
                  return <h2 key={i} className="text-2xl font-bold text-gray-900 mt-8 mb-4">{paragraph.replace('## ', '')}</h2>;
                }
                if (paragraph.startsWith('### ')) {
                  return <h3 key={i} className="text-xl font-semibold text-gray-800 mt-6 mb-3">{paragraph.replace('### ', '')}</h3>;
                }
                if (paragraph.startsWith('- ')) {
                  const items = paragraph.split('\n').filter(line => line.startsWith('- '));
                  return (
                    <ul key={i} className="list-disc list-inside space-y-2 text-gray-700 my-4">
                      {items.map((item, j) => (
                        <li key={j}>{formatText(item.replace('- ', ''))}</li>
                      ))}
                    </ul>
                  );
                }
                if (paragraph.startsWith('1. ')) {
                  const items = paragraph.split('\n').filter(line => /^\d+\. /.test(line));
                  return (
                    <ol key={i} className="list-decimal list-inside space-y-2 text-gray-700 my-4">
                      {items.map((item, j) => (
                        <li key={j}>{formatText(item.replace(/^\d+\. /, ''))}</li>
                      ))}
                    </ol>
                  );
                }
                if (paragraph.startsWith('> ')) {
                  return (
                    <blockquote key={i} className="border-l-4 border-yellow-500 pl-4 italic text-gray-600 my-4">
                      {formatText(paragraph.replace('> ', ''))}
                    </blockquote>
                  );
                }
                return <p key={i} className="text-gray-700 leading-relaxed my-4">{formatText(paragraph)}</p>;
              })}
            </div>
          </div>

          {lesson.keyTakeaways && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-6 mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>Key Takeaways</span>
              </h3>
              <ul className="space-y-3">
                {lesson.keyTakeaways.map((takeaway, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-700">
                    <span className="text-yellow-600 mt-1">✓</span>
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div>
              {prevLesson ? (
                <Link
                  href={`/academy/course/${slug}/lesson/${prevLesson.id}`}
                  className="text-gray-500 hover:text-gray-900 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous: {prevLesson.title}
                </Link>
              ) : (
                <div />
              )}
            </div>

            <div className="flex gap-4">
              {!isCompleted && (
                <button
                  onClick={markComplete}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Mark Complete
                </button>
              )}
              
              {nextLesson ? (
                <Link
                  href={`/academy/course/${slug}/lesson/${nextLesson.id}`}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg transition-all flex items-center gap-2"
                >
                  Next Lesson
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ) : (
                <Link
                  href={`/academy/course/${slug}`}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg transition-all"
                >
                  Complete Course
                </Link>
              )}
            </div>
          </div>

          {isCompleted && (
            <div className="mt-4 text-center text-green-600 flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Lesson completed
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
