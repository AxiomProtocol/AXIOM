/**
 * Steward Outreach Scripts - Compliant Templates
 * For Steward-Activated Land Program
 */

export const complianceDos = [
  "Emphasize landowner retains full ownership at all times",
  "Describe activation as coordination for land use, not investment",
  "Explain steward role as community coordination, not property management",
  "Be transparent about the voluntary nature of participation",
  "Clearly state that future acquisition is optional and separate",
  "Provide written materials for landowner review",
  "Allow time for questions and independent consultation",
  "Document all communications"
];

export const complianceDonts = [
  "Never promise financial returns, yields, or profits",
  "Never imply ownership transfer through activation",
  "Never use terms like ROI, dividends, or guaranteed appreciation",
  "Never pressure landowners into quick decisions",
  "Never discuss tokenized deeds or ownership via tokens",
  "Never make verbal promises not in writing",
  "Never represent Axiom as a financial investment opportunity",
  "Never discuss specific dollar amounts for land value increases"
];

export const smsTemplate = `Hi [Name], I'm [Your Name] with Axiom's land stewardship program. We help landowners activate underutilized property through community coordination. Would you be open to a brief call to learn more? No obligation.`;

export const facebookDMTemplate = `Hi [Name],

I noticed you have property in [County]. I work with a community land stewardship program that helps landowners put underutilized land to productive use while retaining full ownership.

We coordinate community food production and land care activities. Landowners maintain complete control and can pause or stop anytime.

Would you be interested in learning more? Happy to share information with no pressure.

Best,
[Your Name]`;

export const emailOutreachTemplate = `Subject: Land Stewardship Opportunity in [County]

Dear [Landowner Name],

My name is [Your Name], and I'm a community steward with Axiom Protocol's land activation program.

I'm reaching out to landowners in [County] who may have underutilized land and might be interested in community stewardship opportunities.

Our program helps landowners:
- Put idle land to productive community use
- Maintain full ownership and control
- Participate in coordinated food production cycles
- Connect with local community members

This is not a lease, purchase, or investment opportunity. You retain complete ownership, and participation is entirely voluntary with the ability to pause or stop at any time.

If you'd like to learn more, I'd be happy to schedule a brief call or send additional information.

Best regards,
[Your Name]
[Contact Information]`;

export const inPersonPitchScript = `Introduction:
"Hi, I'm [Name]. I work with a community land stewardship program called Axiom. We help connect landowners who have underutilized property with community members who can help put it to productive use."

Key Points:
1. "You keep full ownership of your land at all times"
2. "We coordinate community volunteers for food production and land care"
3. "You decide what activities happen on your property"
4. "You can pause or stop participation whenever you want"
5. "This isn't about selling or leasing - it's about community coordination"

Questions to Ask:
- "Do you have any land that's currently sitting unused?"
- "Have you ever considered community gardening or food production?"
- "What would be your ideal use for this property?"

Closing:
"I can leave you with some written information to review. If you're interested, we have a simple intake process. No pressure, and happy to answer any questions."`;

export const communityMeetingIntro = `"Good [morning/evening] everyone. I'm [Name], a local land steward with Axiom Protocol.

We're building a network of landowners and community members working together to activate underutilized land for food production and community benefit.

For landowners: You keep full ownership while we coordinate community activities on your property. You maintain control and can stop anytime.

For participants: You get access to participate in produce cycles and community coordination.

This is about stewardship and community coordination - not investment or land sales.

I'm happy to speak with anyone interested after the meeting, or you can visit our website to learn more."`;

export const firstCallScript = `Opening:
"Hi [Name], thanks for taking the time to speak with me. I'm [Your Name] with Axiom's land stewardship program. Before we begin, I want to be clear - this call is just to share information and answer questions. There's no pressure to make any decisions today."

Discovery Questions:
1. "Tell me about your property. Where is it located and approximately how many acres?"
2. "How is the land currently being used?"
3. "What's your vision for the property - is there something you'd like to see happen there?"
4. "Have you considered any community or agricultural uses?"

Program Overview:
"Our program connects landowners with community stewards who coordinate productive use of land - things like food production, community gardens, and land restoration.

The key points are:
- You retain full ownership at all times
- We handle coordination and community organizing
- You approve all activities on your property
- You can pause or stop participation anytime
- This is not a lease, sale, or investment"

Next Steps:
"If you're interested in learning more, the next step would be a simple intake where we gather basic information about your property. This helps us understand if it's a good fit for community activities. Would you like to proceed with that?"`;

export const followUpScript = `"Hi [Name], this is [Your Name] following up on our conversation about the land stewardship program.

I wanted to check if you had any questions after reviewing the information I sent.

[If they have questions - answer them clearly]

[If they're interested]
'Great! The next step is our land intake process. I can walk you through it now or schedule a time that works better for you.'

[If they're unsure]
'No problem at all. Take the time you need. I'm here if any questions come up, and you can always reach out when you're ready.'

[If they decline]
'I completely understand. Thank you for your time. If your situation changes or you have questions in the future, feel free to reach out.'"`;

export const objectionHandling = {
  "What's in it for Axiom?": 
    "Axiom is building a network of community-activated land to support local food production and community coordination. Our model is based on participation and community building, not land acquisition.",
  
  "Is this a scam?": 
    "I understand the concern. You can verify us at our website, and everything we do is documented in writing. You retain full ownership, and there's no money exchanged for activation. We're happy to provide references from other participating landowners.",
  
  "Do I have to sell my land?": 
    "Absolutely not. You keep 100% ownership. Activation is about community use coordination, not ownership transfer. If you ever want to sell in the future, that's a completely separate conversation and entirely your choice.",
  
  "What if something goes wrong?": 
    "You maintain the right to pause or stop activities at any time. We carry coordination insurance, and specific terms are documented in a simple agreement you can review with an attorney if you'd like.",
  
  "How long is the commitment?": 
    "There's no minimum commitment. You can participate for a single cycle or ongoing - it's entirely up to you. We prefer to build long-term relationships, but you're never locked in."
};

export const closingOnboardingScript = `"Based on our conversation, it sounds like your property could be a great fit for community activation.

Here's what happens next:
1. We complete a simple land intake form - about 10 minutes
2. A steward visits the property to assess readiness
3. We draft a stewardship plan for your review and approval
4. Once you approve, we coordinate the first community activities

At every step, you have final say. Nothing happens on your property without your explicit approval.

Would you like to proceed with the intake now, or would you prefer I send you the form to complete at your convenience?"`;
