import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useWallet } from '../components/WalletConnect/WalletContext';
import { WalletConnectButton } from '../components/WalletConnect/WalletConnectButton';
import { NAV_ITEMS } from '../lib/navigation';

function useAccessibleMotion() {
  const shouldReduceMotion = useReducedMotion();
  return {
    shouldReduceMotion,
    getTransition: (duration = 0.6) => 
      shouldReduceMotion ? { duration: 0 } : { duration },
    getAnimation: (animation) => 
      shouldReduceMotion ? {} : animation
  };
}

const JOURNEY_STEPS = [
  {
    icon: '📚',
    step: 1,
    title: 'Learn',
    description: 'Build your financial foundation. Money mindset, discipline, budgeting basics, and community wealth principles.',
    stats: 'Step 1',
    link: '/academy',
    cta: 'Start Learning'
  },
  {
    icon: '🤝',
    step: 2,
    title: 'Connect',
    description: 'Find your community by location and goals. No money required — build trust first with people who share your vision.',
    stats: 'Step 2',
    link: '/susu',
    cta: 'Find Groups'
  },
  {
    icon: '💰',
    step: 3,
    title: 'Save Together',
    description: 'Join SUSU savings circles with clear rules and transparency. Start small, build consistency, grow over time.',
    stats: 'Step 3',
    link: '/susu',
    cta: 'Start Saving'
  }
];

const ADVANCED_MODULES = [
  {
    icon: '🌱',
    title: 'Grow',
    description: 'After you build consistency, explore rent-to-own opportunities and build equity toward home ownership.',
    stats: 'After Step 3',
    link: '/keygrow',
    cta: 'Explore KeyGrow'
  },
  {
    icon: '🔧',
    title: 'Banking Tools',
    description: 'Banking-style coordination tools for advanced members. Payments, credit scoring, and financial products.',
    stats: 'Advanced',
    link: '/bank',
    cta: 'View Tools'
  },
  {
    icon: '🏗️',
    title: 'Node Network',
    description: 'Operate infrastructure nodes and earn rewards. Part of Axiom\'s long-term decentralized buildout.',
    stats: 'Advanced',
    link: '/axiom-nodes',
    cta: 'Learn More'
  },
  {
    icon: '🗳️',
    title: 'Governance',
    description: 'Community-owned and member-governed. Stake AXM tokens, delegate voting power, and shape the future.',
    stats: 'Advanced',
    link: '/governance',
    cta: 'Participate'
  }
];

const CONTRACT_CATEGORIES = [
  { name: 'Core Infrastructure', count: 6, color: '#d97706' },
  { name: 'Real Estate & Rental', count: 3, color: '#059669' },
  { name: 'DeFi & Utilities', count: 3, color: '#2563eb' },
  { name: 'Cross-Chain & DEX', count: 4, color: '#7c3aed' },
  { name: 'Markets & Oracles', count: 2, color: '#ea580c' },
  { name: 'Community & Social', count: 3, color: '#db2777' },
  { name: 'Sustainability', count: 1, color: '#0891b2' }
];

const QUICK_STATS = [
  { label: 'Smart Contracts', value: 23, suffix: 'Deployed' },
  { label: 'Network', value: 'Arbitrum', suffix: 'One (L2)', isText: true },
  { label: 'Total Supply', value: 15, suffix: 'B AXM Tokens' },
  { label: 'Land Area', value: 1000, suffix: 'Acres' }
];

function FloatingOrb({ delay, duration, size, left, top, color }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      className="absolute rounded-full blur-xl opacity-30"
      style={{
        width: size,
        height: size,
        left: left,
        top: top,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`
      }}
      animate={shouldReduceMotion ? {} : {
        y: [0, -30, 0],
        x: [0, 15, 0],
        scale: [1, 1.1, 1],
      }}
      transition={shouldReduceMotion ? { duration: 0 } : {
        duration: duration,
        repeat: Infinity,
        delay: delay,
        ease: "easeInOut"
      }}
    />
  );
}

function NetworkGrid() {
  const shouldReduceMotion = useReducedMotion();
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="absolute w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#f59e0b" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-amber-500 rounded-full"
          style={{
            left: `${15 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
          }}
          animate={shouldReduceMotion ? { opacity: 0.5 } : {
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={shouldReduceMotion ? { duration: 0 } : {
            duration: 2 + i * 0.3,
            repeat: Infinity,
            delay: i * 0.5,
          }}
        />
      ))}
    </div>
  );
}

function AnimatedCounter({ value, suffix, isText }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const shouldReduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView && !isText) {
      if (shouldReduceMotion) {
        setDisplayValue(parseInt(value));
        return;
      }
      let start = 0;
      const end = parseInt(value);
      const duration = 2000;
      const increment = end / (duration / 16);
      
      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setDisplayValue(end);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(start));
        }
      }, 16);
      
      return () => clearInterval(timer);
    }
  }, [isInView, value, isText, shouldReduceMotion]);

  return (
    <motion.div
      ref={ref}
      initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.6 }}
    >
      <div className="text-3xl lg:text-4xl font-bold text-amber-600">
        {isText ? value : displayValue.toLocaleString()}
      </div>
      <div className="text-sm text-gray-600">{suffix}</div>
    </motion.div>
  );
}

function TokenOrbit() {
  const shouldReduceMotion = useReducedMotion();
  return (
    <div className="relative w-64 h-64 lg:w-80 lg:h-80">
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(245,158,11,0.3) 0%, transparent 70%)'
        }}
        animate={shouldReduceMotion ? {} : {
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={shouldReduceMotion ? { duration: 0 } : {
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <motion.div
        className="absolute inset-4 rounded-full border-2 border-dashed border-amber-300/50"
        animate={shouldReduceMotion ? {} : { rotate: 360 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 20, repeat: Infinity, ease: "linear" }}
      />
      
      <motion.div
        className="absolute inset-8 rounded-full border border-amber-400/30"
        animate={shouldReduceMotion ? {} : { rotate: -360 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 15, repeat: Infinity, ease: "linear" }}
      />
      
      {!shouldReduceMotion && (
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        >
          {[0, 120, 240].map((angle, i) => (
            <motion.div
              key={i}
              className="absolute w-4 h-4 bg-amber-400 rounded-full shadow-lg shadow-amber-500/50"
              style={{
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(100px)`,
              }}
            />
          ))}
        </motion.div>
      )}
      
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={shouldReduceMotion ? {} : {
          rotateY: [0, 360],
        }}
        transition={shouldReduceMotion ? { duration: 0 } : {
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div className="relative">
          <motion.img
            src="/images/axiom-token.png"
            alt="AXM Token"
            className="w-48 h-48 lg:w-56 lg:h-56 rounded-full object-cover shadow-2xl shadow-amber-500/40"
            animate={shouldReduceMotion ? {} : { scale: [1, 1.05, 1] }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 2, repeat: Infinity }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/images/axiom-token-fallback.svg';
            }}
            loading="eager"
          />
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-500 rounded-full text-white font-bold text-sm shadow-lg">
            AXM
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function PillarCard({ pillar, index }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <motion.div
      ref={ref}
      initial={shouldReduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 50, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={shouldReduceMotion ? { duration: 0 } : { 
        duration: 0.6, 
        delay: index * 0.15,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={shouldReduceMotion ? {} : { 
        y: -8, 
        boxShadow: "0 20px 40px rgba(245, 158, 11, 0.15)",
        transition: { duration: 0.3 }
      }}
      className="group relative bg-white border border-gray-200 rounded-2xl p-8 hover:border-amber-300 transition-colors"
    >
      <motion.div
        className="absolute top-0 right-0 w-32 h-32 bg-amber-100 rounded-full blur-2xl"
        initial={{ opacity: 0 }}
        whileHover={shouldReduceMotion ? {} : { opacity: 0.5 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
      />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <motion.div 
            className="text-5xl"
            whileHover={shouldReduceMotion ? {} : { scale: 1.2, rotate: [0, -10, 10, 0] }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.4 }}
          >
            {pillar.icon}
          </motion.div>
          <motion.div
            className="px-3 py-1 bg-amber-100 border border-amber-200 rounded-full text-amber-700 text-sm font-medium"
            whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
          >
            {pillar.stats}
          </motion.div>
        </div>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-3">{pillar.title}</h3>
        <p className="text-gray-600 mb-6 leading-relaxed">{pillar.description}</p>
        
        <Link 
          href={pillar.link}
          className="inline-flex items-center gap-2 text-amber-600 font-semibold hover:text-amber-700 transition-colors group/link"
        >
          {pillar.cta}
          <motion.svg 
            className="w-4 h-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            whileHover={shouldReduceMotion ? {} : { x: 5 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </motion.svg>
        </Link>
      </div>
    </motion.div>
  );
}

function ContractCard({ cat, index }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-30px" });
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <motion.div
      ref={ref}
      initial={shouldReduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={shouldReduceMotion ? { duration: 0 } : { 
        duration: 0.4, 
        delay: index * 0.08,
        type: "spring",
        stiffness: 200
      }}
      whileHover={shouldReduceMotion ? {} : { 
        scale: 1.05,
        borderColor: '#f59e0b',
        transition: { duration: 0.2 }
      }}
      className="bg-white border border-gray-200 rounded-xl p-4 text-center cursor-default"
    >
      <motion.div 
        className="text-3xl font-bold mb-1"
        style={{ color: cat.color }}
        initial={shouldReduceMotion ? { scale: 1 } : { scale: 0 }}
        animate={isInView ? { scale: 1 } : {}}
        transition={shouldReduceMotion ? { duration: 0 } : { 
          delay: index * 0.08 + 0.2,
          type: "spring",
          stiffness: 300
        }}
      >
        {cat.count}
      </motion.div>
      <div className="text-xs text-gray-500 leading-tight">{cat.name}</div>
    </motion.div>
  );
}

export default function Home() {
  const { walletState, connectMetaMask } = useWallet();
  const [mounted, setMounted] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Desktop Header Row */}
          <div className="hidden md:flex justify-between items-center h-16">
            <Link href="/">
              <motion.div 
                className="flex items-center gap-2 cursor-pointer"
                whileHover={{ scale: 1.02 }}
              >
                <motion.img
                  src="/images/axiom-token.png"
                  alt="Axiom Token"
                  className="w-10 h-10 rounded-full object-cover shadow-lg"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                />
                <span className="text-xl font-bold text-gray-900">AXIOM</span>
              </motion.div>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="flex items-center gap-6">
              {NAV_ITEMS.map((item, i) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i + 0.3 }}
                >
                  <Link 
                    href={item.href}
                    className="text-gray-600 hover:text-amber-600 transition-colors text-sm font-medium relative group"
                  >
                    {item.name}
                    <motion.span
                      className="absolute -bottom-1 left-0 w-0 h-0.5 bg-amber-500 group-hover:w-full transition-all duration-300"
                    />
                  </Link>
                </motion.div>
              ))}
            </nav>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              {mounted && <WalletConnectButton />}
            </motion.div>
          </div>

          {/* Mobile Header - Shows only on mobile */}
          <div className="md:hidden">
            {/* Row 1: Logo + Wallet Button */}
            <div className="flex justify-between items-center h-14">
              <Link href="/">
                <motion.div 
                  className="flex items-center gap-2 cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                >
                  <img
                    src="/images/axiom-token.png"
                    alt="Axiom Token"
                    className="w-8 h-8 rounded-full object-cover shadow-lg"
                  />
                  <span className="text-lg font-bold text-gray-900">AXIOM</span>
                </motion.div>
              </Link>
              {mounted && <WalletConnectButton />}
            </div>

            {/* Row 2: Navigation Pills */}
            <div className="pb-3">
              <div className="flex overflow-x-auto gap-2 -mx-4 px-4" style={{ WebkitOverflowScrolling: 'touch' }}>
                {NAV_ITEMS.map((item) => (
                  <Link 
                    key={item.name}
                    href={item.href}
                    className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition-colors"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      <motion.section 
        className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-white min-h-[90vh] flex items-center"
        style={{ opacity: heroOpacity, scale: heroScale }}
      >
        <NetworkGrid />
        
        <FloatingOrb delay={0} duration={8} size={300} left="10%" top="20%" color="#f59e0b" />
        <FloatingOrb delay={2} duration={10} size={200} left="70%" top="60%" color="#fbbf24" />
        <FloatingOrb delay={4} duration={12} size={250} left="80%" top="10%" color="#f59e0b" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-32">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 border border-amber-200 mb-8"
              whileHover={{ scale: 1.05 }}
            >
              <motion.span
                className="w-2 h-2 rounded-full bg-green-500"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-sm text-amber-700 font-medium">Live on Arbitrum One</span>
              <span className="text-gray-400">•</span>
              <span className="text-sm text-gray-600">23 Contracts Deployed</span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 text-gray-900"
            >
              <motion.span
                animate={{ 
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{ duration: 5, repeat: Infinity }}
                style={{
                  background: 'linear-gradient(90deg, #1f2937, #d97706, #1f2937)',
                  backgroundSize: '200% 100%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                AXIOM
              </motion.span>
            </motion.h1>
            
            <motion.p
              variants={itemVariants}
              className="text-2xl sm:text-3xl text-amber-600 font-semibold mb-4"
            >
              Build wealth through discipline, structure, and community.
            </motion.p>
            
            <motion.p
              variants={itemVariants}
              className="text-lg text-gray-600 max-w-2xl mx-auto mb-10"
            >
              Learn. Connect. Save together — with clear rules and transparency.
              Start your journey with financial education, find your community, 
              and grow together through structured savings circles.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Link 
                  href="/susu"
                  className="inline-block px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/25"
                >
                  Start a Savings Circle
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Link 
                  href="/academy"
                  className="inline-block px-8 py-4 bg-white border-2 border-amber-500 text-amber-600 font-bold rounded-lg hover:bg-amber-50 transition-all"
                >
                  Learn First
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
        
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.div>
      </motion.section>

      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-gray-900">
              Discover <span className="text-amber-600">Axiom</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Watch our introduction video to learn how Axiom helps communities build wealth together
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative rounded-2xl overflow-hidden shadow-2xl shadow-amber-500/20 border border-amber-200"
          >
            <div className="aspect-video">
              <iframe
                src="https://www.youtube.com/embed/TbdIulFg1hA"
                title="Axiom Introduction"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-y border-gray-200 bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {QUICK_STATS.map((stat, i) => (
              <AnimatedCounter key={i} {...stat} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-gray-900">
              Your <span className="text-amber-600">Journey</span> to Financial Freedom
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Three simple steps to build wealth through discipline, community, and structured savings
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-16">
            {JOURNEY_STEPS.map((pillar, i) => (
              <PillarCard key={i} pillar={pillar} index={i} />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8 mt-16"
          >
            <h3 className="text-xl font-semibold mb-2 text-gray-700">
              Ready for more? <span className="text-amber-600">Advanced Modules</span>
            </h3>
            <p className="text-gray-500 text-sm max-w-xl mx-auto">
              After building consistency with Steps 1-3, explore these advanced opportunities
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {ADVANCED_MODULES.map((pillar, i) => (
              <PillarCard key={i} pillar={pillar} index={i} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-gray-900">
              <span className="text-amber-600">23 Smart Contracts</span> Deployed & Verified
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Complete infrastructure deployed on Arbitrum One. All contracts verified and auditable on Blockscout.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {CONTRACT_CATEGORIES.map((cat, i) => (
              <ContractCard key={i} cat={cat} index={i} />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-center"
          >
            <motion.a
              href="https://arbitrum.blockscout.com/address/0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-gray-700 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>View on Blockscout</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </motion.a>
          </motion.div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="bg-gradient-to-br from-amber-50 via-white to-white border border-amber-200 rounded-3xl p-8 lg:p-12 overflow-hidden relative"
          >
            <motion.div
              className="absolute -top-20 -right-20 w-64 h-64 bg-amber-200/30 rounded-full blur-3xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            
            <div className="grid lg:grid-cols-2 gap-12 items-center relative">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <motion.div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-medium mb-6"
                  whileHover={{ scale: 1.05 }}
                >
                  Governance Token
                </motion.div>
                <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-gray-900">
                  AXM Protocol Token
                </h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  The native governance and coordination token of Axiom Protocol. 
                  Stake to participate in governance, earn protocol rewards, and access community services.
                </p>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {[
                    { label: 'Total Supply', value: '15 Billion' },
                    { label: 'Network', value: 'Arbitrum One' },
                    { label: 'TGE Date', value: 'Jan 2026' },
                    { label: 'Token Type', value: 'ERC-20' },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      whileHover={{ scale: 1.02, borderColor: '#f59e0b' }}
                      className="bg-white border border-gray-200 rounded-xl p-4 transition-colors"
                    >
                      <div className="text-sm text-gray-500 mb-1">{item.label}</div>
                      <div className="text-xl font-bold text-gray-900">{item.value}</div>
                    </motion.div>
                  ))}
                </div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                  <Link 
                    href="/tokenomics"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-all"
                  >
                    View Tokenomics
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="flex justify-center"
              >
                <TokenOrbit />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto px-4 sm:px-6 text-center"
        >
          <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-gray-900">
            Ready to Build the Future?
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Join community members who are building wealth through discipline, 
            structure, and transparent savings circles.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {mounted && !walletState.isConnected ? (
              <motion.button
                onClick={connectMetaMask}
                className="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/25"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                Connect Wallet to Get Started
              </motion.button>
            ) : (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Link 
                  href="/axiom-nodes"
                  className="inline-block px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/25"
                >
                  Register Your Node
                </Link>
              </motion.div>
            )}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Link 
                href="/about-us"
                className="inline-block px-8 py-4 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-all"
              >
                Learn About Axiom
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <section id="token-contract" className="py-16 bg-gradient-to-br from-gray-900 to-gray-800">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-5xl mx-auto px-4 sm:px-6"
        >
          <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
            <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
              <img src="/images/axiom-token.png" alt="AXM" className="w-14 h-14 rounded-full" onError={(e) => { e.target.onerror = null; e.target.src = '/images/axiom-token-fallback.svg'; }} />
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-2xl lg:text-3xl font-bold text-white">Official AXM Token Contract</h2>
              <p className="text-amber-400">Verified on Arbitrum One | Chain ID: 42161</p>
            </div>
          </div>
          
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700 mb-6">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex-1 w-full">
                <div className="text-gray-400 text-sm mb-2">Contract Address</div>
                <code className="text-amber-400 font-mono text-sm md:text-lg break-all block">
                  0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D
                </code>
              </div>
              <div className="flex flex-wrap gap-3">
                <a 
                  href="https://arbitrum.blockscout.com/address/0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D?tab=contract" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Verified
                </a>
                <a 
                  href="https://arbitrum.blockscout.com/token/0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
                >
                  View Token
                </a>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800/30 rounded-xl p-4 text-center border border-gray-700/50">
              <div className="text-gray-400 text-xs mb-1">Token</div>
              <div className="text-white font-bold">AXM</div>
            </div>
            <div className="bg-gray-800/30 rounded-xl p-4 text-center border border-gray-700/50">
              <div className="text-gray-400 text-xs mb-1">Standard</div>
              <div className="text-white font-bold">ERC-20</div>
            </div>
            <div className="bg-gray-800/30 rounded-xl p-4 text-center border border-gray-700/50">
              <div className="text-gray-400 text-xs mb-1">Total Supply</div>
              <div className="text-white font-bold">15B</div>
            </div>
            <div className="bg-gray-800/30 rounded-xl p-4 text-center border border-gray-700/50">
              <div className="text-gray-400 text-xs mb-1">Decimals</div>
              <div className="text-white font-bold">18</div>
            </div>
          </div>
          
          <div className="text-center">
            <Link 
              href="/tokenomics#token-contract"
              className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors text-sm"
            >
              View Full Tokenomics
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-gray-200 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <Link href="/">
                <motion.div 
                  className="flex items-center gap-2 mb-4 cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                >
                  <img 
                    src="/images/axiom-token.png" 
                    alt="Axiom Token"
                    className="w-8 h-8 rounded-full object-cover shadow-md"
                  />
                  <span className="font-bold text-gray-900">AXIOM</span>
                </motion.div>
              </Link>
              <p className="text-sm text-gray-500">
                Build wealth through discipline, structure, and community.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Your Journey</h4>
              <div className="space-y-2">
                <Link href="/academy" className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">Learn (Academy)</Link>
                <Link href="/susu" className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">Connect & Save Together (SUSU)</Link>
                <Link href="/keygrow" className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">Grow (KeyGrow)</Link>
                <Link href="/bank" className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">Banking Tools</Link>
                <Link href="/dex" className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">DEX Exchange</Link>
                <Link href="/launchpad" className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">Launchpad (TGE)</Link>
                <Link href="/axiom-nodes" className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">DePIN Network</Link>
                <Link href="/nodes/marketplace" className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">Node Marketplace</Link>
                <Link href="/pma" className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">PMA Trust</Link>
                <Link href="/governance" className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">Governance</Link>
                <Link href="/governance/grants" className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">Treasury Grants</Link>
                <Link href="/tokenomics" className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">Tokenomics</Link>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Resources</h4>
              <div className="space-y-2">
                <Link href="/whitepaper" className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">Whitepaper</Link>
                <Link href="/keygrow" className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">KeyGrow Rent-to-Own</Link>
                <Link href="/transparency" className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">Trust & Transparency</Link>
                <Link href="/transparency-reports" className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">Financial Reports</Link>
                <Link href="/security" className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">Security</Link>
                <Link href="/faq" className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">FAQ</Link>
                <Link href="/roadmap" className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">Roadmap</Link>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
              <div className="space-y-2">
                <Link href="/about-us" className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">About Us</Link>
                <Link href="/team" className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">Team</Link>
                <Link href="/terms-and-conditions" className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">Terms of Service</Link>
                <Link href="/privacy-policy" className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">Privacy Policy</Link>
                <Link href="/compliance" className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">Compliance</Link>
                <Link href="/admin/treasury" className="block text-sm text-gray-500 hover:text-amber-600 transition-colors">Admin Dashboard</Link>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              © 2025 Axiom Protocol. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">Deployed on</span>
              <motion.span
                className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-blue-600 text-sm font-medium"
                whileHover={{ scale: 1.05 }}
              >
                Arbitrum One
              </motion.span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
