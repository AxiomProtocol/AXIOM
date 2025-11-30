import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';

interface Course {
  id: number;
  title: string;
  description: string;
  instructor: string;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  price: string;
  rating: number;
  students: number;
  image: string;
  category: string;
  tokens: number;
  isEnrolled: boolean;
}

const PremiumCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  useEffect(() => {
    // Mock course data
    const mockCourses: Course[] = [
      {
        id: 1,
        title: 'Blockchain Fundamentals for Wealth Building',
        description: 'Learn the basics of blockchain technology and how it can revolutionize your financial strategy.',
        instructor: 'Dr. Sarah Chen',
        duration: '8 hours',
        level: 'Beginner',
        price: 'Free',
        rating: 4.8,
        students: 2847,
        image: '🎓',
        category: 'blockchain',
        tokens: 500,
        isEnrolled: false
      },
      {
        id: 2,
        title: 'Advanced DeFi Investment Strategies',
        description: 'Master sophisticated DeFi protocols and yield optimization techniques for maximum returns.',
        instructor: 'Michael Rodriguez',
        duration: '12 hours',
        level: 'Advanced',
        price: '$199',
        rating: 4.9,
        students: 1234,
        image: '📈',
        category: 'defi',
        tokens: 1000,
        isEnrolled: true
      },
      {
        id: 3,
        title: 'Real Estate Tokenization Masterclass',
        description: 'Discover how to invest in and create tokenized real estate opportunities.',
        instructor: 'Jennifer Park',
        duration: '10 hours',
        level: 'Intermediate',
        price: '$149',
        rating: 4.7,
        students: 892,
        image: '🏢',
        category: 'real-estate',
        tokens: 750,
        isEnrolled: false
      },
      {
        id: 4,
        title: 'Community Savings Circle Leadership',
        description: 'Learn to create and manage successful SouSou circles for community wealth building.',
        instructor: 'David Thompson',
        duration: '6 hours',
        level: 'Intermediate',
        price: '$99',
        rating: 4.6,
        students: 567,
        image: '🤝',
        category: 'community',
        tokens: 400,
        isEnrolled: false
      },
      {
        id: 5,
        title: 'Precious Metals & Digital Gold',
        description: 'Understanding gold certificates, storage, and digital precious metal investments.',
        instructor: 'Robert Kim',
        duration: '7 hours',
        level: 'Beginner',
        price: '$129',
        rating: 4.5,
        students: 445,
        image: '🥇',
        category: 'precious-metals',
        tokens: 600,
        isEnrolled: false
      },
      {
        id: 6,
        title: 'Risk Management in Digital Assets',
        description: 'Comprehensive guide to managing and mitigating risks in cryptocurrency investments.',
        instructor: 'Lisa Wang',
        duration: '9 hours',
        level: 'Advanced',
        price: '$179',
        rating: 4.8,
        students: 723,
        image: '🛡️',
        category: 'risk-management',
        tokens: 850,
        isEnrolled: false
      }
    ];
    
    setCourses(mockCourses);
  }, []);

  const categories = [
    { id: 'all', name: 'All Courses' },
    { id: 'blockchain', name: 'Blockchain' },
    { id: 'defi', name: 'DeFi' },
    { id: 'real-estate', name: 'Real Estate' },
    { id: 'community', name: 'Community' },
    { id: 'precious-metals', name: 'Precious Metals' },
    { id: 'risk-management', name: 'Risk Management' }
  ];

  const filteredCourses = courses.filter(course => 
    selectedCategory === 'all' || course.category === selectedCategory
  );

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner': return 'text-green-400 bg-green-500';
      case 'Intermediate': return 'text-yellow-400 bg-yellow-500';
      case 'Advanced': return 'text-red-400 bg-red-500';
      default: return 'text-gray-400 bg-gray-500';
    }
  };

  return (
    <Layout title="SWF Learning Hub" themeColor="blue">
      <div className="bg-gradient-to-br from-white via-blue-50 to-white min-h-screen">
        {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-6 text-blue-800">
            Premium <span className="text-blue-600">Educational Courses</span>
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Master blockchain, DeFi, and wealth-building strategies with expert-led courses. 
            Earn SWF tokens as you learn and advance your financial knowledge.
          </p>
        </div>

        {/* Learning Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 text-center shadow-lg">
            <div className="text-2xl font-bold text-blue-600 mb-2">25+</div>
            <div className="text-gray-700">Expert Courses</div>
          </div>
          <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 text-center shadow-lg">
            <div className="text-2xl font-bold text-blue-600 mb-2">12,847</div>
            <div className="text-gray-700">Active Students</div>
          </div>
          <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 text-center shadow-lg">
            <div className="text-2xl font-bold text-blue-600 mb-2">500</div>
            <div className="text-gray-700">Tokens Per Course</div>
          </div>
          <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-6 text-center shadow-lg">
            <div className="text-2xl font-bold text-blue-600 mb-2">4.8/5</div>
            <div className="text-gray-700">Average Rating</div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex justify-center mb-8">
          <div className="bg-white border-2 border-blue-300 rounded-lg p-1 flex flex-wrap gap-1 shadow-lg">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                    : 'text-gray-700 hover:text-blue-800 hover:bg-blue-100'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className={`bg-gradient-to-br from-white to-blue-50 border-2 rounded-xl overflow-hidden hover:border-blue-400 hover:shadow-xl transition-all shadow-lg ${
                course.isEnrolled ? 'border-blue-500' : 'border-blue-300'
              }`}
            >
              {/* Course Image */}
              <div className="h-40 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                <span className="text-6xl">{course.image}</span>
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium bg-opacity-20 ${getLevelColor(course.level)}`}>
                    {course.level}
                  </span>
                  {course.isEnrolled && (
                    <span className="px-2 py-1 bg-green-500 rounded text-xs font-medium">
                      Enrolled
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-bold mb-2 text-blue-800">{course.title}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Instructor:</span>
                    <span className="font-semibold text-blue-700">{course.instructor}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-semibold text-blue-700">{course.duration}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Students:</span>
                    <span className="font-semibold text-blue-700">{course.students.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Earn:</span>
                    <span className="font-semibold text-blue-600">{course.tokens} SWF</span>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-400">⭐</span>
                    <span className="font-semibold text-blue-700">{course.rating}</span>
                  </div>
                  <div className="font-bold text-blue-600">{course.price}</div>
                </div>
                
                <button 
                  className={`w-full px-4 py-2 rounded-lg font-medium shadow-lg transition-all duration-200 ${
                    course.isEnrolled 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white' 
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                  }`}
                  onClick={() => setSelectedCourse(course)}
                >
                  {course.isEnrolled ? 'Continue Learning' : 'Enroll Now'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Learning Path */}
        <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-8 mb-12 shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-center text-blue-800">Recommended Learning Path</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 border-2 border-blue-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-blue-800">Foundation</h3>
              <p className="text-gray-600">Start with blockchain fundamentals and basic wealth-building concepts</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 border-2 border-blue-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📚</span>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-blue-800">Specialization</h3>
              <p className="text-gray-600">Choose your focus: DeFi, real estate, community building, or precious metals</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 border-2 border-blue-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-blue-800">Mastery</h3>
              <p className="text-gray-600">Advanced strategies, risk management, and portfolio optimization</p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 border-2 border-blue-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">👨‍🏫</span>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-blue-800">Expert Instructors</h3>
            <p className="text-gray-600">Learn from industry professionals and thought leaders</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 border-2 border-blue-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎖️</span>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-blue-800">Earn While Learning</h3>
            <p className="text-gray-600">Receive SWF tokens for completing courses and assessments</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 border-2 border-blue-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📱</span>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-blue-800">Mobile Access</h3>
            <p className="text-gray-600">Learn on-the-go with mobile-optimized content</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 border-2 border-blue-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🏆</span>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-blue-800">Certificates</h3>
            <p className="text-gray-600">Earn blockchain-verified completion certificates</p>
          </div>
        </div>
      </div>
      </div>

      {/* Course Detail Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-blue-800">{selectedCourse.title}</h2>
              <button
                onClick={() => setSelectedCourse(null)}
                className="text-gray-600 hover:text-blue-700 text-2xl transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-blue-800">Course Description</h3>
                <p className="text-gray-700">{selectedCourse.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600">Instructor:</span>
                  <div className="font-semibold text-blue-700">{selectedCourse.instructor}</div>
                </div>
                <div>
                  <span className="text-gray-600">Duration:</span>
                  <div className="font-semibold text-blue-700">{selectedCourse.duration}</div>
                </div>
                <div>
                  <span className="text-gray-600">Level:</span>
                  <div className="font-semibold text-blue-700">{selectedCourse.level}</div>
                </div>
                <div>
                  <span className="text-gray-600">Price:</span>
                  <div className="font-semibold text-blue-600">{selectedCourse.price}</div>
                </div>
                <div>
                  <span className="text-gray-600">Rating:</span>
                  <div className="font-semibold text-blue-700">⭐ {selectedCourse.rating}/5</div>
                </div>
                <div>
                  <span className="text-gray-600">Students:</span>
                  <div className="font-semibold text-blue-700">{selectedCourse.students.toLocaleString()}</div>
                </div>
              </div>
              
              <div className="bg-blue-100 border-2 border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-blue-600 text-lg">🎁</span>
                  <span className="font-semibold text-blue-700">Earn {selectedCourse.tokens} SWF tokens upon completion!</span>
                </div>
              </div>
              
              <button className={`w-full px-6 py-4 font-bold rounded-lg shadow-lg transition-all duration-200 ${
                selectedCourse.isEnrolled 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
              }`}>
                {selectedCourse.isEnrolled ? 'Continue Learning' : 'Enroll Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default PremiumCoursesPage;
