import Link from 'next/link';
import Head from 'next/head';
import Layout from '../components/Layout';
import { SUSU_ROUTES } from '../lib/susuRoutes';

export default function SusuStartPage() {
  return (
    <Layout>
      <Head>
        <title>Axiom SUSU | Save Money with People You Trust</title>
        <meta name="description" content="Axiom SUSU is a modern savings circle. Connect with a group, agree on the amount and schedule, and take turns receiving the pooled money." />
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
              Axiom SUSU is a modern savings circle. You connect with a group, agree on the amount and schedule, and take turns receiving the pooled money. Clear rules. Shared accountability. No middleman.
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
                Start a Savings Circle
              </Link>
            </div>
            <p className="text-sm text-gray-400">
              Not a bank. Not an investment. No promises. Just structured group saving.
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
                Understand how group saving works and why consistency matters.
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
              <h3 className="text-xl font-bold text-gray-900 mb-2">3. Save Together</h3>
              <p className="text-gray-600">
                Form a SUSU circle once the group agrees on the rules, amount, and schedule.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 py-16">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              How SUSU works (no jargon)
            </h2>
            <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold flex-shrink-0">1</div>
                <p className="text-gray-700">A group agrees on a contribution amount and schedule</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold flex-shrink-0">2</div>
                <p className="text-gray-700">Everyone contributes the same amount each cycle</p>
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
            <p className="text-center text-gray-600 mt-6 font-medium">That's it.</p>
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
                <p className="text-gray-700 mb-2">10 people contribute $50 weekly</p>
                <p className="text-amber-600 font-semibold text-xl">Each week, one person receives $500</p>
              </div>
              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Example 2</h3>
                <p className="text-gray-700 mb-2">8 people contribute $100 monthly</p>
                <p className="text-amber-600 font-semibold text-xl">Each month, one person receives $800</p>
              </div>
            </div>
            <p className="text-center text-gray-600 mt-6">Your group decides the amount, schedule, and order.</p>
          </div>
        </div>

        <div className="bg-gray-50 py-16">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              Why people use SUSU
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-gray-700">Saving feels easier with structure</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-gray-700">Groups help people stay consistent</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-gray-700">Everyone knows the rules upfront</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-gray-700">It supports real goals without speculation</p>
              </div>
            </div>
            <p className="text-center text-gray-600 mt-8 font-medium">SUSU is about discipline, not shortcuts.</p>
          </div>
        </div>

        <div className="py-16">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
              Can't find a group nearby?
            </h2>
            <p className="text-gray-600 text-center mb-12">That's okay. You still have options.</p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:border-amber-300 transition-all">
                <div className="text-3xl mb-4">🎯</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Join a Goal Group</h3>
                <p className="text-gray-600 text-sm mb-4">Connect with people saving for the same goal, regardless of location.</p>
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
                <p className="text-gray-600 text-sm mb-4">Invite friends, family, or coworkers and set the goal together.</p>
                <Link
                  href={SUSU_ROUTES.CREATE_GROUP_PATH}
                  className="inline-block px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm"
                >
                  Start a Group
                </Link>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:border-amber-300 transition-all">
                <div className="text-3xl mb-4">📖</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Learn How Group Saving Works</h3>
                <p className="text-gray-600 text-sm mb-4">A short guide to the Learn, Connect, Save Together process.</p>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Manifestation, grounded.</h2>
            <div className="space-y-2 text-gray-700 text-lg">
              <p>Belief matters.</p>
              <p>Structure makes it real.</p>
              <p>Saving works best when intention is backed by consistency and community.</p>
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
                Start a Savings Circle
              </Link>
            </div>
            <Link href={SUSU_ROUTES.SUSU_FAQ_PATH} className="text-amber-400 hover:text-amber-300 underline">
              Read the SUSU FAQ
            </Link>
          </div>
        </div>

        <div className="bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center text-sm text-gray-500 space-y-2">
              <p>Axiom SUSU is a coordination tool for group saving.</p>
              <p>This page is informational only and does not constitute financial or legal advice.</p>
              <p>Participation involves risk. Only join groups you understand and trust.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
