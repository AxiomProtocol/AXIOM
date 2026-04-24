/**
 * Avatar Introduction Video Script for Axiom Onboarding Wizard
 * 
 * Voice Style: Napoleon Hill meets Rev Ike, inspired by Powernomics
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
  id: "axiom-onboarding-intro-v2",
  title: "Welcome to Axiom Protocol",
  version: "2.0.0",
  estimatedDurationSeconds: 80,
  wordCount: 195,
  scriptText: `Most people do not have a money problem.
They have a system problem.

They work. They earn. They pay bills.
But at the end of the month, nothing is built.

Axiom exists to change that.

This is not a trading app. This is not about speculation.
Axiom is a system for building wealth together through Group Economics.

Here is the core idea.

If ten people save two hundred dollars a month alone, it takes years to build anything meaningful.
But when those same ten people practice Group Economics together, someone receives two thousand dollars every single month.

This is The Wealth Practice.

Axiom places this ancient wisdom on modern technology so every commitment is honored and every dollar works while it waits.

When you join, you receive three powerful advantages.

First, enforced discipline. Your contributions happen automatically so you actually build capital.

Second, collective power. Instead of saving alone, you access thousands of dollars through the strength of your community.

Third, real ownership. Your wealth is not sitting in someone else's vault. It is working for you and building real assets in your name.

This is not about getting rich quick.
This is about never being broke again.
This is about owning something real.

If you are ready to stop surviving and start building wealth together, let us begin.

Your first step is to tell us where you are located so we can connect you with people in your region.`,

  sectionMarkers: [
    {
      id: "opening",
      label: "The Problem",
      timestampSeconds: 0,
      text: "Most people do not have a money problem. They have a system problem."
    },
    {
      id: "core-concept",
      label: "Group Economics",
      timestampSeconds: 18,
      text: "When ten people practice Group Economics together, someone receives two thousand dollars every single month."
    },
    {
      id: "wealth-practice",
      label: "The Wealth Practice",
      timestampSeconds: 30,
      text: "This is The Wealth Practice. Ancient wisdom on modern technology."
    },
    {
      id: "benefits",
      label: "Your Advantages",
      timestampSeconds: 42,
      text: "Enforced discipline. Collective power. Real ownership."
    },
    {
      id: "closing",
      label: "Call to Action",
      timestampSeconds: 65,
      text: "Your first step is to tell us where you are located so we can connect you with people in your region."
    }
  ]
};

export const getScriptForOpenArt = (): string => {
  return AXIOM_INTRO_SCRIPT.scriptText;
};

export default AXIOM_INTRO_SCRIPT;
