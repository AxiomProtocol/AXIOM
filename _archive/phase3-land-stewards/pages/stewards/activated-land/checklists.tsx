import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { trackActivatedLand, ActivatedLandEvents } from '../../../lib/stewards/activatedLandAnalytics';

const checklists = [
  {
    id: 'intake',
    title: 'Land Intake Checklist',
    description: 'Complete when onboarding a new landowner',
    items: [
      { text: 'Owner full legal name confirmed', category: 'contact' },
      { text: 'Primary contact method established (phone/email)', category: 'contact' },
      { text: 'Property address or parcel number recorded', category: 'property' },
      { text: 'Acreage confirmed', category: 'property' },
      { text: 'Current land use documented', category: 'property' },
      { text: 'Owner goals and vision discussed', category: 'goals' },
      { text: 'Any restrictions or concerns noted', category: 'goals' },
      { text: 'Photos of property obtained (if available)', category: 'documentation' },
      { text: 'Next steps communicated to owner', category: 'follow-up' },
      { text: 'Intake form saved to dashboard', category: 'follow-up' }
    ]
  },
  {
    id: 'access-safety',
    title: 'Access & Safety Checklist',
    description: 'Verify before starting any activities',
    items: [
      { text: 'Legal access route confirmed', category: 'access' },
      { text: 'Gate/key arrangements made with owner', category: 'access' },
      { text: 'Parking area identified', category: 'access' },
      { text: 'Emergency vehicle access verified', category: 'safety' },
      { text: 'Water source identified and tested', category: 'utilities' },
      { text: 'Hazards identified and marked (holes, debris, etc.)', category: 'safety' },
      { text: 'Property boundaries clearly understood', category: 'safety' },
      { text: 'Cell service or communication plan established', category: 'safety' },
      { text: 'First aid kit location designated', category: 'safety' },
      { text: 'Emergency contact list created', category: 'safety' }
    ]
  },
  {
    id: 'stewardship-plan',
    title: 'Stewardship Plan Checklist',
    description: 'Ensure plan is complete before owner review',
    items: [
      { text: 'Proposed activities clearly described', category: 'activities' },
      { text: 'Seasonal calendar/schedule included', category: 'activities' },
      { text: 'Participant guidelines documented', category: 'participants' },
      { text: 'Maximum participant count defined', category: 'participants' },
      { text: 'Communication frequency agreed (weekly/monthly)', category: 'communication' },
      { text: 'Preferred update method documented (text/email/call)', category: 'communication' },
      { text: 'Access hours and days specified', category: 'operations' },
      { text: 'Tool/equipment storage arrangements made', category: 'operations' },
      { text: 'Insurance acknowledgment included', category: 'legal' },
      { text: 'Stop/pause procedures documented', category: 'legal' },
      { text: 'Plan shared with owner for review', category: 'approval' },
      { text: 'Owner questions addressed', category: 'approval' },
      { text: 'Written approval obtained', category: 'approval' }
    ]
  },
  {
    id: 'activation-readiness',
    title: 'Activation Cycle Readiness Checklist',
    description: 'Verify before launching the first cycle',
    items: [
      { text: 'Stewardship plan approved by owner', category: 'plan' },
      { text: 'Site prepared (cleared, marked, ready)', category: 'site' },
      { text: 'Water access confirmed working', category: 'site' },
      { text: 'Tools and equipment staged', category: 'site' },
      { text: 'Participants recruited and briefed', category: 'participants' },
      { text: 'Participant waiver/agreement signed', category: 'participants' },
      { text: 'First activity scheduled', category: 'schedule' },
      { text: 'Owner notified of start date', category: 'owner' },
      { text: 'Emergency plan in place', category: 'safety' },
      { text: 'Documentation system ready (photos, logs)', category: 'tracking' }
    ]
  },
  {
    id: 'weekly-ops',
    title: 'Weekly Operations Checklist',
    description: 'Complete each week during active cycles',
    items: [
      { text: 'Activity log updated with this week\'s work', category: 'logging' },
      { text: 'Attendance recorded for all participants', category: 'logging' },
      { text: 'Photos taken of progress', category: 'logging' },
      { text: 'Any issues or incidents documented', category: 'issues' },
      { text: 'Owner update sent (if weekly cadence)', category: 'communication' },
      { text: 'Upcoming week activities confirmed', category: 'planning' },
      { text: 'Participant needs addressed', category: 'participants' },
      { text: 'Site condition checked (safety, cleanliness)', category: 'site' },
      { text: 'Dashboard updated with current status', category: 'dashboard' }
    ]
  }
];

export default function ActivatedLandChecklistsPage() {
  const [activeChecklist, setActiveChecklist] = useState('intake');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    trackActivatedLand(ActivatedLandEvents.CHECKLISTS_VIEW);
  }, []);

  const handleCheck = (checklistId: string, itemIndex: number) => {
    const key = `${checklistId}-${itemIndex}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const currentChecklist = checklists.find(c => c.id === activeChecklist);
  const completedCount = currentChecklist
    ? currentChecklist.items.filter((_, idx) => checkedItems[`${activeChecklist}-${idx}`]).length
    : 0;

  return (
    <>
      <Head>
        <title>Checklists | Activated Land | Stewards | Axiom Protocol</title>
        <meta name="description" content="Operational checklists for the Steward-Activated Land Program." />
      </Head>
      
      <main className="min-h-screen bg-gray-50">
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <Link href="/stewards/activated-land" className="text-amber-600 hover:underline text-sm mb-4 inline-block">
            ← Back to Activated Land Overview
          </Link>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">Operational Checklists</h1>
          <p className="text-lg text-gray-600 mb-8">
            Use these checklists to ensure thorough and consistent execution of the activation process.
          </p>

          <div className="grid md:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="space-y-2">
              {checklists.map(checklist => (
                <button
                  key={checklist.id}
                  onClick={() => setActiveChecklist(checklist.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    activeChecklist === checklist.id
                      ? 'bg-amber-100 text-amber-800 font-medium'
                      : 'bg-white hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {checklist.title}
                </button>
              ))}
            </div>

            {/* Checklist Content */}
            <div className="md:col-span-3">
              {currentChecklist && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{currentChecklist.title}</h2>
                      <p className="text-gray-600">{currentChecklist.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-amber-600">
                        {completedCount}/{currentChecklist.items.length}
                      </div>
                      <div className="text-sm text-gray-500">completed</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 transition-all"
                        style={{ width: `${(completedCount / currentChecklist.items.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {currentChecklist.items.map((item, idx) => {
                      const isChecked = checkedItems[`${activeChecklist}-${idx}`];
                      return (
                        <label 
                          key={idx}
                          className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            isChecked ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked || false}
                            onChange={() => handleCheck(activeChecklist, idx)}
                            className="mt-0.5 w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                          />
                          <span className={isChecked ? 'text-gray-500 line-through' : 'text-gray-700'}>
                            {item.text}
                          </span>
                          <span className="ml-auto text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded">
                            {item.category}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {completedCount === currentChecklist.items.length && (
                    <div className="mt-6 p-4 bg-green-100 border border-green-300 rounded-lg text-center">
                      <span className="text-green-800 font-semibold">✓ Checklist Complete!</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <Link href="/stewards/activated-land/scripts" className="text-amber-600 hover:underline">
              ← View Scripts
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
