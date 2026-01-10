/**
 * Avatar Introduction Video Script for Axiom Onboarding Wizard
 * 
 * Voice Style: Napoleon Hill meets Rev Ike
 * Prosperous, disciplined, uplifting, conviction-driven, warm, spiritually confident
 * 
 * Duration Target: 60-90 seconds (approximately 180 words at natural pace)
 */

export interface ScriptSection {
  id: string;
  label: string;
  timestampSeconds: number;
  text: string;
}

export interface AvatarScript {
  id: string;
  title: string;
  version: string;
  estimatedDurationSeconds: number;
  wordCount: number;
  scriptText: string;
  sectionMarkers: ScriptSection[];
}

export const AXIOM_INTRO_SCRIPT: AvatarScript = {
  id: "axiom-onboarding-intro-v1",
  title: "Welcome to Axiom Protocol",
  version: "1.0.0",
  estimatedDurationSeconds: 75,
  wordCount: 188,
  scriptText: `Most people do not have a money problem.
They have a system problem.

They work. They earn. They pay bills.
But at the end of the month, nothing is built.

Axiom exists to change that.

This is not a trading app. This is not about speculation.
Axiom is a way for people to save together, access real money, earn while they wait, and own real assets.

Here is the core idea.

If ten people save two hundred dollars a month alone, it takes them years to build anything meaningful.
But if those same ten people save together, someone receives two thousand dollars every single month.

That is called a SUSU.

Axiom puts this system on the blockchain so nobody can cheat, and everyone's money earns while it waits.

When you join, you get three things.

First, enforced savings. Your contributions happen automatically so you actually build capital.

Second, lump sums. Instead of saving slowly, you get access to thousands of dollars at once.

Third, ownership. Your money is not sitting in someone else's vault. It is working for you and building real assets.

This is not about getting rich quick.
This is about never being broke again.
This is about owning something real.

If you are ready to stop surviving and start building, let us begin.

Your first step is to connect your wallet.`,

  sectionMarkers: [
    {
      id: "opening",
      label: "The Problem",
      timestampSeconds: 0,
      text: "Most people do not have a money problem. They have a system problem."
    },
    {
      id: "core-concept",
      label: "The SUSU Concept",
      timestampSeconds: 18,
      text: "If ten people save together, someone receives two thousand dollars every single month."
    },
    {
      id: "benefits",
      label: "What You Get",
      timestampSeconds: 38,
      text: "Enforced savings. Lump sums. Ownership."
    },
    {
      id: "closing",
      label: "Call to Action",
      timestampSeconds: 62,
      text: "If you are ready to stop surviving and start building, let us begin."
    }
  ]
};

export const getScriptForOpenArt = (): string => {
  return AXIOM_INTRO_SCRIPT.scriptText;
};

export default AXIOM_INTRO_SCRIPT;
