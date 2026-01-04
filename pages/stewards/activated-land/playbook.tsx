import React, { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { RebuildNav } from '../../../components/axiomRebuild/RebuildNav';
import { trackActivatedLand, ActivatedLandEvents } from '../../../lib/stewards/activatedLandAnalytics';

const playbookSections = [
  {
    id: 'identify',
    title: 'Identify Underutilized Land',
    content: `Look for properties that show signs of underutilization:
    
• Vacant lots with overgrown vegetation
• Inherited land with absentee owners
• Agricultural land not in active production
• Properties listed for sale for extended periods
• Owner-financed listings (often indicate motivated sellers)

Sources to search:
• County tax records (look for land-only parcels)
• Craigslist and Facebook Marketplace land listings
• Local real estate agents who specialize in land
• Community bulletin boards and word of mouth
• Driving for dollars in target areas`
  },
  {
    id: 'qualify',
    title: 'Qualify Land Quickly',
    content: `Before investing time in outreach, quickly assess:

✓ Size: Minimum 1 acre for meaningful activation
✓ Access: Road access or legal easement
✓ Zoning: Agricultural or rural residential typically best
✓ Utilities: Water access (well, municipal, or natural source)
✓ Condition: Clear of hazardous materials or structures

Red flags to watch for:
• Environmental contamination history
• Active legal disputes or liens
• HOA restrictions on land use
• Wetland or floodplain designations (may limit activities)
• Owner unwilling to communicate`
  },
  {
    id: 'approach',
    title: 'Approach the Owner',
    content: `Initial outreach should be professional and low-pressure:

1. Start with a letter or postcard (physical mail has higher response rates)
2. Follow up with a phone call if number is available
3. Be transparent about who you are and what the program offers
4. Focus on THEIR goals for the property
5. Never promise financial returns or pressure quick decisions

Key talking points:
• You retain full ownership
• Community coordination, not a lease or sale
• You can stop anytime
• We handle the organizing work`
  },
  {
    id: 'onboard',
    title: 'Onboard the Owner',
    content: `Once an owner expresses interest:

1. Complete the formal intake (gather property details)
2. Schedule a site visit to assess readiness
3. Discuss their vision and any restrictions
4. Document everything in writing
5. Get their preferred communication method and frequency

During intake, capture:
• Owner contact information
• Property details (acreage, utilities, access)
• Current use and history
• Owner goals and preferences
• Any restrictions or concerns`
  },
  {
    id: 'stewardship-plan',
    title: 'Build the Stewardship Plan',
    content: `Work with the owner to create a clear plan:

Plan should include:
• Proposed activities (food production, restoration, etc.)
• Schedule of activities (seasonal calendar)
• Participant guidelines and expectations
• Communication protocols with owner
• Access and key/gate arrangements
• Emergency contacts and procedures
• Insurance and liability acknowledgments

Get written approval before proceeding. The owner should:
• Review the plan fully
• Ask questions and request modifications
• Sign or acknowledge approval
• Receive a copy for their records`
  },
  {
    id: 'launch-cycle',
    title: 'Launch the Activation Cycle',
    content: `With an approved plan, begin activation:

Pre-launch:
• Prepare the site (clear debris, mark boundaries)
• Recruit and brief participants
• Set up any needed infrastructure (water access, tools storage)
• Notify owner of start date

During activation:
• Follow the approved plan
• Provide regular updates to owner
• Document activities with photos
• Track participation and outputs
• Address any issues immediately`
  },
  {
    id: 'track-outcomes',
    title: 'Track Outcomes',
    content: `Maintain thorough records:

Weekly:
• Activity log (who, what, when)
• Photos of progress
• Any issues or incidents
• Participant attendance

Monthly:
• Summary report for owner
• Produce or output tracking
• Participant feedback
• Plan adjustments if needed

End of cycle:
• Full cycle report
• Owner satisfaction survey
• Lessons learned
• Plans for next cycle`
  },
  {
    id: 'optional-acquisition',
    title: 'Optional Acquisition Pathways',
    content: `IMPORTANT: Acquisition is completely optional and separate from activation.

Some owners, after successful activation, may express interest in:
• Continued long-term activation
• Formal land partnership arrangements
• Seller financing options
• Traditional sale to Axiom or community

If an owner raises this topic:
• Listen without making promises
• Document their interest level
• Refer to the appropriate Axiom team
• Continue activation as normal - don't let acquisition discussions disrupt the relationship

Never:
• Promise specific purchase prices
• Guarantee future acquisition
• Pressure owners toward sale
• Mix activation duties with acquisition negotiations`
  }
];

export default function ActivatedLandPlaybookPage() {
  useEffect(() => {
    trackActivatedLand(ActivatedLandEvents.PLAYBOOK_VIEW, { page: 'playbook' });
  }, []);

  return (
    <>
      <Head>
        <title>Playbook | Activated Land | Stewards | Axiom Protocol</title>
        <meta name="description" content="Complete playbook for the Steward-Activated Land Program." />
      </Head>
      <RebuildNav />
      
      <main className="min-h-screen bg-white pt-20">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
          <Link href="/stewards/activated-land" className="text-amber-600 hover:underline text-sm mb-4 inline-block">
            ← Back to Activated Land Overview
          </Link>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">Activation Playbook</h1>
          <p className="text-lg text-gray-600 mb-8">
            Step-by-step guide to activating underutilized land through community stewardship.
          </p>

          {/* Table of Contents */}
          <div className="bg-gray-50 rounded-xl p-6 mb-12">
            <h3 className="font-semibold text-gray-900 mb-4">Contents</h3>
            <nav className="space-y-2">
              {playbookSections.map((section, idx) => (
                <a 
                  key={section.id} 
                  href={`#${section.id}`}
                  className="block text-gray-600 hover:text-amber-600 transition-colors"
                >
                  {idx + 1}. {section.title}
                </a>
              ))}
            </nav>
          </div>

          {/* Sections */}
          <div className="space-y-12">
            {playbookSections.map((section, idx) => (
              <div key={section.id} id={section.id} className="scroll-mt-24">
                <div className="flex items-center gap-4 mb-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>
                </div>
                <div className="pl-12">
                  <pre className="whitespace-pre-wrap font-sans text-gray-600 leading-relaxed">
                    {section.content}
                  </pre>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 flex justify-between">
            <Link href="/stewards/activated-land" className="text-amber-600 hover:underline">
              ← Back to Overview
            </Link>
            <Link href="/stewards/activated-land/scripts" className="text-amber-600 hover:underline">
              View Scripts →
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
