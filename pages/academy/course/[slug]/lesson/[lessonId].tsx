import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Layout from '../../../../../components/Layout';
import Link from 'next/link';
import { COURSES_DATA } from '../../../../../lib/academyCourses';

export default function LessonPage() {
  const router = useRouter();
  const { slug, lessonId } = router.query;
  const [isCompleted, setIsCompleted] = useState(false);

  const course = COURSES_DATA.find(c => c.slug === slug);
  const lesson = course?.lessons.find(l => l.id === Number(lessonId));
  const lessonIndex = course?.lessons.findIndex(l => l.id === Number(lessonId)) ?? -1;
  const nextLesson = course?.lessons[lessonIndex + 1];
  const prevLesson = lessonIndex > 0 ? course?.lessons[lessonIndex - 1] : null;

  useEffect(() => {
    if (slug && lessonId) {
      const savedProgress = localStorage.getItem(`course_progress_${slug}`);
      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        setIsCompleted(!!progress[lessonId]);
      }
    }
  }, [slug, lessonId]);

  const markComplete = () => {
    if (!slug || !lessonId) return;
    
    const savedProgress = localStorage.getItem(`course_progress_${slug}`);
    const progress = savedProgress ? JSON.parse(savedProgress) : {};
    progress[lessonId] = true;
    localStorage.setItem(`course_progress_${slug}`, JSON.stringify(progress));
    setIsCompleted(true);
  };

  if (!course || !lesson) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">Lesson Not Found</h1>
            <Link href="/academy" className="text-yellow-400 hover:underline">
              Back to Academy
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Link 
            href={`/academy/course/${slug}`}
            className="inline-flex items-center text-gray-400 hover:text-white mb-8"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {course.title}
          </Link>

          <div className="flex items-center gap-4 text-gray-400 text-sm mb-6">
            <span>{course.title}</span>
            <span>/</span>
            <span>Lesson {lessonIndex + 1} of {course.lessons.length}</span>
          </div>

          <h1 className="text-4xl font-bold text-white mb-8">{lesson.title}</h1>

          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8 mb-8">
            <div className="prose prose-invert max-w-none">
              {lesson.content.split('\n\n').map((paragraph, i) => {
                const formatText = (text: string) => {
                  return text.split(/(\*\*[^*]+\*\*)/).map((part, idx) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return <strong key={idx} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
                    }
                    return part;
                  });
                };
                
                if (paragraph.startsWith('## ')) {
                  return <h2 key={i} className="text-2xl font-bold text-white mt-8 mb-4">{paragraph.replace('## ', '')}</h2>;
                }
                if (paragraph.startsWith('### ')) {
                  return <h3 key={i} className="text-xl font-semibold text-white mt-6 mb-3">{paragraph.replace('### ', '')}</h3>;
                }
                if (paragraph.startsWith('- ')) {
                  const items = paragraph.split('\n').filter(line => line.startsWith('- '));
                  return (
                    <ul key={i} className="list-disc list-inside space-y-2 text-gray-300 my-4">
                      {items.map((item, j) => (
                        <li key={j}>{formatText(item.replace('- ', ''))}</li>
                      ))}
                    </ul>
                  );
                }
                if (paragraph.startsWith('1. ')) {
                  const items = paragraph.split('\n').filter(line => /^\d+\. /.test(line));
                  return (
                    <ol key={i} className="list-decimal list-inside space-y-2 text-gray-300 my-4">
                      {items.map((item, j) => (
                        <li key={j}>{formatText(item.replace(/^\d+\. /, ''))}</li>
                      ))}
                    </ol>
                  );
                }
                if (paragraph.startsWith('> ')) {
                  return (
                    <blockquote key={i} className="border-l-4 border-yellow-500 pl-4 italic text-gray-300 my-4">
                      {formatText(paragraph.replace('> ', ''))}
                    </blockquote>
                  );
                }
                return <p key={i} className="text-gray-300 leading-relaxed my-4">{formatText(paragraph)}</p>;
              })}
            </div>
          </div>

          {lesson.keyTakeaways && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-8">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span>Key Takeaways</span>
              </h3>
              <ul className="space-y-3">
                {lesson.keyTakeaways.map((takeaway, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-300">
                    <span className="text-yellow-400 mt-1">✓</span>
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-800/30 border border-gray-700 rounded-xl p-6">
            <div>
              {prevLesson ? (
                <Link
                  href={`/academy/course/${slug}/lesson/${prevLesson.id}`}
                  className="text-gray-400 hover:text-white flex items-center gap-2"
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
            <div className="mt-4 text-center text-green-400 flex items-center justify-center gap-2">
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
