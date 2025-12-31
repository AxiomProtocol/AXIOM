import React from "react";
import Head from "next/head";
import Link from "next/link";

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

      <main className="min-h-screen bg-white text-slate-900">
        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div className="space-y-5">
              <p className="inline-flex rounded-full bg-slate-100 px-4 py-1 text-sm text-slate-700">
                Forever free. No credit card required.
              </p>

              <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
                Free Financial Literacy and Blockchain Education, Forever Free
              </h1>

              <p className="text-base leading-relaxed text-slate-700 md:text-lg">
                Axiom Academy is the free learning hub for financial foundations, cryptocurrency basics, blockchain
                fundamentals, DeFi, wallet setup and safety, tokenomics, NFTs, and Web3 community participation.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/academy/free"
                  className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm hover:opacity-90 text-center"
                >
                  Start Learning Free
                </Link>
                <button
                  onClick={onSecondaryCta}
                  className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
                >
                  View Free Courses
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Beginner-friendly. Self-paced lessons. Learn before you invest.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold">What you get</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                <li>Financial Foundations 101 for real-world money clarity</li>
                <li>Cryptocurrency basics and blockchain fundamentals explained simply</li>
                <li>Wallet setup and safety to protect digital assets</li>
                <li>DeFi and tokenomics for modern financial systems</li>
                <li>Web3 community guide and homeownership learning with KeyGrow</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-10">
          <div className="rounded-2xl border border-slate-200 p-8">
            <h2 className="text-2xl font-semibold">
              You were never taught how money works, how ownership is built, or how blockchain actually functions.
            </h2>
            <p className="mt-3 text-slate-700">
              Most people are left with jargon, risky shortcuts, and expensive courses. Axiom Academy fixes the gap with a
              structured beginner path that builds real literacy before participation.
            </p>
          </div>
        </section>

        <section id="free-courses" className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Free courses included</h2>
              <p className="mt-2 text-slate-700">
                Learn financial literacy, crypto basics, wallet safety, blockchain fundamentals, DeFi, tokenomics, NFTs,
                Web3 community, and homeownership frameworks.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <article key={c.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-slate-500">{c.category}</p>
                  <p className="text-xs text-slate-500">{c.duration}</p>
                </div>
                <h3 className="mt-2 text-base font-semibold">{c.title}</h3>
                <p className="mt-2 text-sm text-slate-700">{c.desc}</p>
                <p className="mt-3 text-xs text-slate-500">{c.keywords}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
            <h2 className="text-2xl font-semibold">Start with understanding.</h2>
            <p className="mt-3 text-slate-700">
              Before you invest. Before you participate. Before you commit. Learn financial literacy and blockchain
              fundamentals the right way.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/academy/free"
                className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm hover:opacity-90 text-center"
              >
                Start Learning Free
              </Link>
              <Link
                href="/academy/free"
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-center text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
              >
                Open Free Learning Hub
              </Link>
            </div>
            <p className="mt-3 text-xs text-slate-500">No credit card. No obligation. Forever free.</p>
          </div>
        </section>

        <footer className="mx-auto max-w-6xl px-4 pb-12">
          <p className="text-xs text-slate-500">
            Axiom Academy provides foundational education for finance, blockchain, and community-driven ownership within
            the Axiom Protocol ecosystem.
          </p>
        </footer>
      </main>
    </>
  );
}
