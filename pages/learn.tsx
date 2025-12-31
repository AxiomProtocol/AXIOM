import React from "react";
import Head from "next/head";
import Link from "next/link";
import { 
  Wallet, 
  TrendingUp, 
  Shield, 
  Blocks, 
  Coins, 
  Image, 
  Users, 
  Home,
  BookOpen,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  GraduationCap,
  Lock,
  Globe,
  Zap
} from "lucide-react";


const courseIcons: Record<string, React.ReactNode> = {
  "Financial Foundations 101": <TrendingUp className="w-6 h-6" />,
  "Cryptocurrency Basics": <Coins className="w-6 h-6" />,
  "Wallet Setup and Safety": <Wallet className="w-6 h-6" />,
  "Blockchain Fundamentals": <Blocks className="w-6 h-6" />,
  "Introduction to DeFi": <Zap className="w-6 h-6" />,
  "Tokenomics 101": <TrendingUp className="w-6 h-6" />,
  "NFT Essentials": <Image className="w-6 h-6" />,
  "Web3 Community Guide": <Users className="w-6 h-6" />,
  "KeyGrow Path to Homeownership": <Home className="w-6 h-6" />,
};

const categoryColors: Record<string, string> = {
  "Finance": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Blockchain": "bg-purple-100 text-purple-700 border-purple-200",
  "Finance and Web3": "bg-amber-100 text-amber-700 border-amber-200",
  "Token Economics": "bg-blue-100 text-blue-700 border-blue-200",
  "Community": "bg-pink-100 text-pink-700 border-pink-200",
  "Real Estate": "bg-orange-100 text-orange-700 border-orange-200",
};

const categoryIconBg: Record<string, string> = {
  "Finance": "bg-emerald-500",
  "Blockchain": "bg-purple-500",
  "Finance and Web3": "bg-amber-500",
  "Token Economics": "bg-blue-500",
  "Community": "bg-pink-500",
  "Real Estate": "bg-orange-500",
};

const courses = [
  {
    title: "Financial Foundations 101",
    desc: "Budgeting, saving, credit basics, and building stability.",
    keywords: "financial literacy course, budgeting, credit basics",
    duration: "45 minutes",
    category: "Finance",
  },
  {
    title: "Cryptocurrency Basics",
    desc: "What crypto is, how it works, and where it fits in modern finance.",
    keywords: "beginner crypto course, cryptocurrency basics",
    duration: "35 minutes",
    category: "Blockchain",
  },
  {
    title: "Wallet Setup and Safety",
    desc: "How to set up a wallet, avoid common mistakes, and secure digital assets.",
    keywords: "crypto wallet safety, how to set up a crypto wallet",
    duration: "40 minutes",
    category: "Blockchain",
  },
  {
    title: "Blockchain Fundamentals",
    desc: "How blockchains work, why decentralization matters, and what smart contracts do.",
    keywords: "blockchain fundamentals course, how blockchain works",
    duration: "45 minutes",
    category: "Blockchain",
  },
  {
    title: "Introduction to DeFi",
    desc: "DeFi basics for beginners and how financial services can run without traditional intermediaries.",
    keywords: "learn DeFi, DeFi basics for beginners",
    duration: "40 minutes",
    category: "Finance and Web3",
  },
  {
    title: "Tokenomics 101",
    desc: "Supply, distribution, utility, incentives, and what drives token value.",
    keywords: "tokenomics course, what is tokenomics",
    duration: "40 minutes",
    category: "Token Economics",
  },
  {
    title: "NFT Essentials",
    desc: "What NFTs are used for beyond art, including real-world digital ownership use cases.",
    keywords: "NFT essentials, what are NFTs used for",
    duration: "35 minutes",
    category: "Blockchain",
  },
  {
    title: "Web3 Community Guide",
    desc: "How to engage with Web3 communities, DAOs, and governance participation.",
    keywords: "Web3 education, DAO governance basics",
    duration: "35 minutes",
    category: "Community",
  },
  {
    title: "KeyGrow Path to Homeownership",
    desc: "Rent-to-own fundamentals, equity building concepts, and an accelerated path to ownership.",
    keywords: "rent to own education, path to homeownership course",
    duration: "60 minutes",
    category: "Real Estate",
  },
];

export default function AxiomAcademyFreeLanding() {
  const onSecondaryCta = () => {
    const el = document.getElementById("free-courses");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <Head>
        <title>Axiom Academy Free Learning Hub | Free Financial Literacy and Blockchain Education</title>
        <meta
          name="description"
          content="Learn financial literacy, cryptocurrency basics, blockchain fundamentals, DeFi, wallet safety, tokenomics, NFTs, and a path to homeownership. Forever free. No credit card required."
        />
        <link rel="canonical" href="https://axiomprotocol.app/learn" />
        <meta property="og:title" content="Axiom Academy Free Learning Hub" />
        <meta
          property="og:description"
          content="Free financial literacy and blockchain education: crypto basics, wallet safety, DeFi, tokenomics, NFTs, Web3 community, and homeownership learning."
        />
        <meta property="og:url" content="https://axiomprotocol.app/learn" />
        <meta name="robots" content="index,follow" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Course",
              name: "Axiom Academy Free Learning Hub",
              description:
                "Free self-paced courses in financial literacy, cryptocurrency basics, blockchain fundamentals, wallet setup and safety, DeFi, tokenomics, NFTs, Web3 community, and path to homeownership.",
              provider: {
                "@type": "Organization",
                name: "Axiom Academy",
                url: "https://axiomprotocol.app/academy/free",
              },
            }),
          }}
        />
      </Head>

      <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute top-40 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-40 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        </div>

        <section className="relative mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="mb-12 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl shadow-amber-500/10">
            <img
              src="/images/web3_education_hero_image.png"
              alt="Web3 Education - Blockchain learning with glowing nodes and digital books"
              className="w-full h-48 md:h-64 object-cover"
            />
          </div>
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 border border-amber-500/30 px-4 py-2 text-sm text-amber-300">
                <Sparkles className="w-4 h-4" />
                Forever free. No credit card required.
              </div>

              <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                Free Financial Literacy & <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Blockchain Education</span>
              </h1>

              <p className="text-lg leading-relaxed text-slate-300 md:text-xl">
                Axiom Academy is your free learning hub for financial foundations, cryptocurrency basics, blockchain fundamentals, DeFi, wallet safety, and Web3 mastery.
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/academy/free"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-4 text-base font-semibold text-slate-900 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all hover:scale-105"
                >
                  <GraduationCap className="w-5 h-5" />
                  Start Learning Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={onSecondaryCta}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800/50 px-8 py-4 text-base font-medium text-white hover:bg-slate-700/50 transition-all"
                >
                  <BookOpen className="w-5 h-5" />
                  View Free Courses
                </button>
              </div>

              <p className="flex items-center gap-2 text-sm text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Beginner-friendly. Self-paced lessons. Learn before you invest.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold">What you get</h2>
              </div>
              <ul className="space-y-4">
                {[
                  { icon: <TrendingUp className="w-5 h-5" />, text: "Financial Foundations 101 for real-world money clarity", color: "text-emerald-400" },
                  { icon: <Coins className="w-5 h-5" />, text: "Cryptocurrency basics and blockchain fundamentals explained simply", color: "text-purple-400" },
                  { icon: <Shield className="w-5 h-5" />, text: "Wallet setup and safety to protect digital assets", color: "text-blue-400" },
                  { icon: <Zap className="w-5 h-5" />, text: "DeFi and tokenomics for modern financial systems", color: "text-amber-400" },
                  { icon: <Home className="w-5 h-5" />, text: "Web3 community guide and homeownership learning with KeyGrow", color: "text-orange-400" },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`${item.color} mt-0.5`}>{item.icon}</span>
                    <span className="text-slate-300">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="relative mx-auto max-w-6xl px-4 pb-12">
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-8 md:p-10">
            <div className="flex items-start gap-4">
              <div className="hidden md:block p-4 rounded-2xl bg-amber-500/20">
                <Lock className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  You were never taught how money works, how ownership is built, or how blockchain actually functions.
                </h2>
                <p className="text-lg text-slate-300">
                  Most people are left with jargon, risky shortcuts, and expensive courses. Axiom Academy fixes the gap with a structured beginner path that builds real literacy before participation.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative py-4">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { value: "9", label: "Free Courses", icon: <BookOpen className="w-6 h-6" /> },
                { value: "40+", label: "Lessons", icon: <GraduationCap className="w-6 h-6" /> },
                { value: "100%", label: "Free Forever", icon: <Sparkles className="w-6 h-6" /> },
                { value: "24/7", label: "AI Tutor", icon: <Globe className="w-6 h-6" /> },
              ].map((stat, i) => (
                <div key={i} className="p-6 rounded-2xl border border-slate-700 bg-slate-800/30">
                  <div className="flex justify-center mb-3 text-amber-400">{stat.icon}</div>
                  <div className="text-3xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="free-courses" className="relative mx-auto max-w-6xl px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Free Courses Included</h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              Learn financial literacy, crypto basics, wallet safety, blockchain fundamentals, DeFi, tokenomics, NFTs, Web3 community, and homeownership frameworks.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <article 
                key={c.title} 
                className="group rounded-2xl border border-slate-700 bg-slate-800/50 p-6 shadow-lg hover:border-amber-500/50 hover:shadow-amber-500/10 transition-all duration-300"
              >
                <div className="flex items-center justify-between gap-3 mb-4">
                  <span className={`text-xs font-medium px-3 py-1 rounded-full border ${categoryColors[c.category] || 'bg-slate-100 text-slate-700'}`}>
                    {c.category}
                  </span>
                  <span className="text-xs text-slate-400">{c.duration}</span>
                </div>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${categoryIconBg[c.category] || 'bg-slate-600'} text-white shrink-0`}>
                    {courseIcons[c.title]}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-amber-400 transition-colors">{c.title}</h3>
                    <p className="mt-2 text-sm text-slate-400">{c.desc}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="relative mx-auto max-w-6xl px-4 py-12">
          <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
            <div className="relative h-32 md:h-48">
              <img
                src="/images/financial_growth_abstract_visual.png"
                alt="Financial growth - ascending chart with golden light and blockchain elements"
                className="w-full h-full object-cover opacity-60 absolute inset-0"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900" />
            </div>
            <div className="p-8 md:p-12 text-center -mt-8 relative">
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 mb-6">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Start with understanding.</h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8">
              Before you invest. Before you participate. Before you commit. Learn financial literacy and blockchain fundamentals the right way.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/academy/free"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-4 text-base font-semibold text-slate-900 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all hover:scale-105"
              >
                <GraduationCap className="w-5 h-5" />
                Start Learning Free
              </Link>
              <Link
                href="/academy/free"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800/50 px-8 py-4 text-base font-medium text-white hover:bg-slate-700/50 transition-all"
              >
                Open Free Learning Hub
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate-400">No credit card. No obligation. Forever free.</p>
            </div>
          </div>
        </section>

        <footer className="relative mx-auto max-w-6xl px-4 py-12 border-t border-slate-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-white">Axiom Academy</span>
            </div>
            <p className="text-sm text-slate-500 text-center">
              Foundational education for finance, blockchain, and community-driven ownership within the Axiom Protocol ecosystem.
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
