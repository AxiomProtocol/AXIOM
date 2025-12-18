import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

interface Course {
  id: number;
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  category: string;
  difficulty: string;
  durationMinutes: number;
  lessonsCount: number;
  requiredTier: string;
  isFeatured: boolean;
}

const STARTER_COURSES: Course[] = [
  {
    id: 1,
    slug: 'smart-city-101',
    title: 'Smart City 101',
    description: 'Understand the fundamentals of smart city technology, infrastructure, and how blockchain enables transparent governance.',
    thumbnailUrl: '/images/courses/smart-city.jpg',
    category: 'Smart City',
    difficulty: 'beginner',
    durationMinutes: 45,
    lessonsCount: 6,
    requiredTier: 'free',
    isFeatured: true
  },
  {
    id: 2,
    slug: 'keygrow-rent-to-own',
    title: 'KeyGrow: Path to Homeownership',
    description: 'Learn how rent-to-own works, how equity builds with each payment, and strategies to accelerate your path to ownership.',
    thumbnailUrl: '/images/courses/keygrow.jpg',
    category: 'Real Estate',
    difficulty: 'beginner',
    durationMinutes: 60,
    lessonsCount: 8,
    requiredTier: 'free',
    isFeatured: true
  },
  {
    id: 3,
    slug: 'financial-literacy',
    title: 'Financial Literacy Fundamentals',
    description: 'Master budgeting, saving, credit management, and wealth building strategies for long-term financial health.',
    thumbnailUrl: '/images/courses/finance.jpg',
    category: 'Finance',
    difficulty: 'beginner',
    durationMinutes: 90,
    lessonsCount: 12,
    requiredTier: 'free',
    isFeatured: true
  },
  {
    id: 4,
    slug: 'depin-explained',
    title: 'DePIN: Decentralized Infrastructure',
    description: 'Discover how DePIN (Decentralized Physical Infrastructure Networks) works and how to participate in the network.',
    thumbnailUrl: '/images/courses/depin.jpg',
    category: 'Blockchain',
    difficulty: 'intermediate',
    durationMinutes: 75,
    lessonsCount: 10,
    requiredTier: 'free',
    isFeatured: false
  },
  {
    id: 5,
    slug: 'susu-community-savings',
    title: 'SUSU: Community Savings Circles',
    description: 'Learn the traditional rotating savings method modernized with blockchain for trust, transparency, and efficiency.',
    thumbnailUrl: '/images/courses/susu.jpg',
    category: 'Community',
    difficulty: 'beginner',
    durationMinutes: 30,
    lessonsCount: 4,
    requiredTier: 'free',
    isFeatured: false
  },
  {
    id: 6,
    slug: 'governance-dao-participation',
    title: 'DAO Governance Participation',
    description: 'Understand how to participate in community governance, vote on proposals, and shape the future of Axiom.',
    thumbnailUrl: '/images/courses/governance.jpg',
    category: 'Governance',
    difficulty: 'intermediate',
    durationMinutes: 45,
    lessonsCount: 6,
    requiredTier: 'basic',
    isFeatured: false
  }
];

const MEMBERSHIP_TIERS = [
  {
    name: 'Free',
    price: 0,
    features: [
      'Access to 5 foundational courses',
      'Community forum access',
      'Monthly newsletter',
      'Certificate of completion'
    ],
    buttonText: 'Get Started Free',
    highlighted: false
  },
  {
    name: 'Pro',
    price: 25,
    features: [
      'All Free features',
      'Access to ALL courses',
      'Live weekly workshops',
      'Priority support',
      'Exclusive community channels',
      'Early access to new features'
    ],
    buttonText: 'Start Pro Trial',
    highlighted: true
  },
  {
    name: 'Enterprise',
    price: 99,
    features: [
      'All Pro features',
      '1-on-1 mentorship sessions',
      'Custom learning paths',
      'Team training options',
      'API access',
      'White-label certificates'
    ],
    buttonText: 'Contact Sales',
    highlighted: false
  }
];

export default function Academy() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const handleMembershipClick = async (tierName: string) => {
    if (tierName === 'Free') {
      (document.querySelector('input[type="email"]') as HTMLInputElement)?.focus();
      return;
    }
    
    if (tierName === 'Enterprise') {
      window.location.href = 'mailto:support@axiomprotocol.io?subject=Axiom Academy Enterprise';
      return;
    }

    setCheckoutLoading(tierName);
    try {
      const response = await fetch('/api/academy/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: tierName.toLowerCase(),
          email: email || undefined
        })
      });

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.message || 'Failed to start checkout');
      }
    } catch (error) {
      toast.error('Failed to start checkout');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const categories = ['all', 'Smart City', 'Real Estate', 'Finance', 'Blockchain', 'Community', 'Governance'];

  const filteredCourses = selectedCategory === 'all' 
    ? STARTER_COURSES 
    : STARTER_COURSES.filter(c => c.category === selectedCategory);

  const featuredCourses = STARTER_COURSES.filter(c => c.isFeatured);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/leads/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'academy'
        })
      });

      if (response.ok) {
        toast.success('Welcome to Axiom Academy! Check your email.');
        setEmail('');
      } else {
        const data = await response.json();
        if (data.isExisting) {
          toast.success('Welcome back to the Academy!');
        } else {
          throw new Error(data.message);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/20 text-green-400';
      case 'intermediate': return 'bg-yellow-500/20 text-yellow-400';
      case 'advanced': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getTierBadge = (tier: string) => {
    if (tier === 'free') return null;
    return (
      <span className="absolute top-4 right-4 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">
        PRO
      </span>
    );
  };

  return (
    <Layout>
      <Toaster position="top-right" />
      
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900">
        
        <div className="relative py-20 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-transparent"></div>
          <div className="max-w-6xl mx-auto relative z-10">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                Axiom Academy
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mb-8">
              Master smart city technology, financial literacy, and blockchain fundamentals. 
              Build real skills for the digital economy.
            </p>
            
            <form onSubmit={handleEnroll} className="flex flex-col sm:flex-row gap-4 max-w-md">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-yellow-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Joining...' : 'Start Learning'}
              </button>
            </form>
          </div>
        </div>

        <div className="py-16 px-4 bg-gray-900/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8">Featured Courses</h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              {featuredCourses.map((course) => (
                <Link
                  href={`/academy/course/${course.slug}`}
                  key={course.id}
                  className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden hover:border-yellow-500/50 transition-all group block"
                >
                  <div className="h-40 bg-gradient-to-br from-yellow-500/20 to-gray-800 flex items-center justify-center relative">
                    <span className="text-6xl">📚</span>
                    {getTierBadge(course.requiredTier)}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-xs px-2 py-1 rounded ${getDifficultyColor(course.difficulty)}`}>
                        {course.difficulty}
                      </span>
                      <span className="text-xs text-gray-500">{course.category}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-yellow-400 transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {course.description}
                    </p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{course.lessonsCount} lessons</span>
                      <span>{course.durationMinutes} min</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8">All Courses</h2>
            
            <div className="flex flex-wrap gap-2 mb-8">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-yellow-500 text-black'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {cat === 'all' ? 'All Categories' : cat}
                </button>
              ))}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <Link
                  href={`/academy/course/${course.slug}`}
                  key={course.id}
                  className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6 hover:border-yellow-500/30 transition-all relative block"
                >
                  {getTierBadge(course.requiredTier)}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs px-2 py-1 rounded ${getDifficultyColor(course.difficulty)}`}>
                      {course.difficulty}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 hover:text-yellow-400 transition-colors">{course.title}</h3>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{course.description}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{course.lessonsCount} lessons</span>
                    <span>{course.durationMinutes} min</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="py-20 px-4 bg-gradient-to-b from-gray-900/50 to-black">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">Membership Plans</h2>
              <p className="text-gray-400 max-w-xl mx-auto">
                Choose the plan that fits your learning goals. Upgrade anytime.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {MEMBERSHIP_TIERS.map((tier) => (
                <div
                  key={tier.name}
                  className={`rounded-2xl p-8 ${
                    tier.highlighted
                      ? 'bg-gradient-to-b from-yellow-500/20 to-yellow-600/10 border-2 border-yellow-500'
                      : 'bg-gray-800/50 border border-gray-700'
                  }`}
                >
                  {tier.highlighted && (
                    <span className="bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full mb-4 inline-block">
                      MOST POPULAR
                    </span>
                  )}
                  <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-white">${tier.price}</span>
                    {tier.price > 0 && <span className="text-gray-400">/month</span>}
                  </div>
                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-300">
                        <span className="text-yellow-400 mt-1">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleMembershipClick(tier.name)}
                    disabled={checkoutLoading === tier.name}
                    className={`w-full py-3 px-6 rounded-lg font-bold transition-all disabled:opacity-50 ${
                      tier.highlighted
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                  >
                    {checkoutLoading === tier.name ? 'Loading...' : tier.buttonText}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div>
                <p className="text-4xl font-bold text-yellow-400 mb-2">6+</p>
                <p className="text-gray-400">Courses Available</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-yellow-400 mb-2">50+</p>
                <p className="text-gray-400">Video Lessons</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-yellow-400 mb-2">1,000+</p>
                <p className="text-gray-400">Students Enrolled</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-yellow-400 mb-2">100%</p>
                <p className="text-gray-400">Free to Start</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
