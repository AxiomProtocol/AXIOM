import Link from 'next/link';
import Head from 'next/head';
import Layout from '../components/Layout';
import { SUSU_ROUTES } from '../lib/susuRoutes';

export default function SusuStartPage() {
  return (
    <Layout showWallet={false}>
      <Head>
        <title>The Wealth Practice | Save Money with People You Trust</title>
        <meta name="description" content="The Wealth Practice is a structured savings practice built with others. Connect with a group, agree on the amount and schedule, and take turns receiving the pooled money." />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center text-4xl shadow-lg mx-auto mb-6">
              🤝
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Save money with people you trust.
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8 leading-relaxed">
              The Wealth Practice is a structured savings practice built with others. You connect with a group, agree on the amount and schedule, and take turns receiving the pooled money. Clear rules. Shared accountability. No middleman.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Link
                href={SUSU_ROUTES.GROUPS_NEARBY_PATH}
                className="px-8 py-4 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors text-lg"
              >
                Find a Group Near You
              </Link>
              <Link
                href={SUSU_ROUTES.START_CIRCLE_PATH}
                className="px-8 py-4 bg-white/10 text-white border border-white/30 rounded-xl font-semibold hover:bg-white/20 transition-colors text-lg"
              >
                Start a Wealth Practice
              </Link>
            </div>
            <p className="text-sm text-gray-400">
              Not a bank. Not an investment. No promises. Just disciplined group saving.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            The simple 3-step journey
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                📚
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">1. Learn</h3>
              <p className="text-gray-600">
                Understand how disciplined saving works and why consistency matters.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                🤝
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">2. Connect</h3>
              <p className="text-gray-600">
                Join Interest Groups by location or goal. No money required. Build trust first.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                💰
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">3. Practice Wealth</h3>
              <p className="text-gray-600">
                Form a Wealth Practice Group once the group agrees on the amount, schedule, and rules.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 py-16">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              How it works
            </h2>
            <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold flex-shrink-0">1</div>
                <p className="text-gray-700">Your group agrees on an amount and a schedule</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold flex-shrink-0">2</div>
                <p className="text-gray-700">Everyone contributes the same amount consistently</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold flex-shrink-0">3</div>
                <p className="text-gray-700">One person receives the pooled amount per cycle</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold flex-shrink-0">4</div>
                <p className="text-gray-700">The rotation continues until everyone has received once</p>
              </div>
            </div>
            <p className="text-center text-gray-600 mt-6 font-medium">Simple. Structured. Transparent.</p>
          </div>
        </div>

        <div className="py-16">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              Real examples
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Example 1</h3>
                <p className="text-gray-700 mb-2">10 people practice saving $50 weekly</p>
                <p className="text-amber-600 font-semibold text-xl">Each week, one person receives $500</p>
              </div>
              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Example 2</h3>
                <p className="text-gray-700 mb-2">8 people practice saving $100 monthly</p>
                <p className="text-amber-600 font-semibold text-xl">Each month, one person receives $800</p>
              </div>
            </div>
            <p className="text-center text-gray-600 mt-6">Your group defines the pace and structure.</p>
          </div>
        </div>

        <div className="py-16 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="text-4xl">🏠</span>
              <h2 className="text-3xl md:text-4xl font-bold text-center">
                Can You Use The Wealth Practice for Big Purchases Like a Home?
              </h2>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8">
              <p className="text-lg text-blue-100 mb-6">
                You may hear people say community savings or SUSU money can't be used to buy a house.
              </p>
              <p className="text-2xl font-bold text-white mb-6">
                The truth is simple:
              </p>
              <div className="bg-amber-500/20 border border-amber-400/30 rounded-xl p-6 mb-6">
                <p className="text-xl font-semibold text-amber-300">
                  Banks don't reject savings.<br/>
                  They reject money they can't trace.
                </p>
              </div>
              <p className="text-blue-100 mb-4">
                Traditional savings circles are often informal. Contributions may be made in cash or loosely tracked, which makes it hard for lenders to verify where the money came from or how long it existed.
              </p>
            </div>

            <div className="bg-amber-500 text-gray-900 rounded-2xl p-8 mb-8">
              <h3 className="text-2xl font-bold mb-4">The Wealth Practice is different.</h3>
              <p className="text-lg font-semibold mb-4">
                It turns community savings into documented savings.
              </p>
              <p className="text-gray-800">
                Contributions happen on a clear schedule, follow agreed rules, and are recorded over time. Funds are classified as member savings — not income, not a loan, and not an investment.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8">
              <p className="text-blue-100 mb-6">
                Because savings are built consistently and documented, participants create a visible history instead of a sudden lump-sum deposit.
              </p>
              <div className="border-l-4 border-amber-400 pl-6">
                <p className="text-blue-200 italic">
                  The Wealth Practice does not replace banks and does not guarantee loan approval.
                </p>
                <p className="text-white font-semibold mt-2">
                  What it provides is something traditional savings circles often lack: clear records.
                </p>
              </div>
            </div>

            <div className="text-center">
              <p className="text-2xl font-bold text-amber-400 mb-2">Community savings, with documentation.</p>
              <p className="text-2xl font-bold text-white">Discipline, with proof.</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 py-16">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              Why people choose it
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-gray-700">Builds real financial discipline</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-gray-700">Accountability makes consistency easier</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-gray-700">Clear rules remove confusion</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-gray-700">Community replaces guesswork</p>
              </div>
            </div>
            <p className="text-center text-gray-600 mt-8 font-medium">Wealth grows through habits, not shortcuts.</p>
          </div>
        </div>

        <div className="py-16">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
              Can't find a group nearby?
            </h2>
            <p className="text-gray-600 text-center mb-12">That's normal early on.</p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:border-amber-300 transition-all">
                <div className="text-3xl mb-4">🎯</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Join a Goal Group</h3>
                <p className="text-gray-600 text-sm mb-4">Connect with people practicing toward the same goal.</p>
                <Link
                  href={SUSU_ROUTES.GOAL_GROUPS_PATH}
                  className="inline-block px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors text-sm"
                >
                  Browse Goal Groups
                </Link>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:border-amber-300 transition-all">
                <div className="text-3xl mb-4">➕</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Start a Group</h3>
                <p className="text-gray-600 text-sm mb-4">Invite friends, family, or coworkers and define the practice together.</p>
                <Link
                  href={SUSU_ROUTES.CREATE_GROUP_PATH}
                  className="inline-block px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm"
                >
                  Start a Group
                </Link>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:border-amber-300 transition-all">
                <div className="text-3xl mb-4">📖</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Learn How The Wealth Practice Works</h3>
                <p className="text-gray-600 text-sm mb-4">A short guide to the Learn, Connect, Practice flow.</p>
                <Link
                  href={SUSU_ROUTES.LEARN_PATH}
                  className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
                >
                  Start Learning
                </Link>
              </div>
            </div>
            <p className="text-center text-gray-600 mt-8">Most circles form after the group agrees on the amount and schedule.</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-50 to-amber-100 py-16">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Manifestation, Grounded.</h2>
            <div className="space-y-2 text-gray-700 text-lg">
              <p>Belief sets intention.</p>
              <p>Practice creates results.</p>
              <p>The Wealth Practice turns intention into consistent action.</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 text-white py-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to build consistency with a group?</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link
                href={SUSU_ROUTES.GROUPS_NEARBY_PATH}
                className="px-8 py-4 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors text-lg"
              >
                Find a Group Near You
              </Link>
              <Link
                href={SUSU_ROUTES.START_CIRCLE_PATH}
                className="px-8 py-4 bg-white/10 text-white border border-white/30 rounded-xl font-semibold hover:bg-white/20 transition-colors text-lg"
              >
                Start a Wealth Practice
              </Link>
            </div>
            <Link href={SUSU_ROUTES.SUSU_FAQ_PATH} className="text-amber-400 hover:text-amber-300 underline">
              Read The Wealth Practice FAQ
            </Link>
          </div>
        </div>

        <div className="bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center text-sm text-gray-500 space-y-2">
              <p>The Wealth Practice is a savings discipline system, not an investment product.</p>
              <p>This page is informational only and not financial or legal advice.</p>
              <p>Participation involves risk.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
