import { frontMatter } from './front-matter';
import { part1Awakening } from './part1-awakening';
import { part2SovereignMind } from './part2-sovereign-mind';
import { part3GroupEconomics } from './part3-group-economics';
import { part4Treasury } from './part4-treasury';
import { part5LandLegacy } from './part5-land-legacy';
import { part6SovereignEconomy } from './part6-sovereign-economy';
import { part7Activation } from './part7-activation';
import { appendix } from './appendix';
import { part1Expansion } from './part1-expansion';
import { part2Expansion } from './part2-expansion';
import { part3Expansion } from './part3-expansion';
import { part4Expansion } from './part4-expansion';
import { part5Expansion } from './part5-expansion';
import { part6Expansion } from './part6-expansion';
import { part7Expansion } from './part7-expansion';
import { additionalContent } from './additional-content';
import { finalContentAdditions } from './final-content';

export function compileGoldStandardManuscript(): string {
  const sections = [
    frontMatter,
    part1Awakening,
    part1Expansion,
    part2SovereignMind,
    part2Expansion,
    part3GroupEconomics,
    part3Expansion,
    part4Treasury,
    part4Expansion,
    part5LandLegacy,
    part5Expansion,
    part6SovereignEconomy,
    part6Expansion,
    part7Activation,
    part7Expansion,
    additionalContent,
    finalContentAdditions,
    appendix
  ];

  return sections.join('\n\n---\n\n');
}

export function getManuscriptStats(): { wordCount: number; pageEstimate: number; characterCount: number } {
  const manuscript = compileGoldStandardManuscript();
  const wordCount = manuscript.split(/\s+/).filter(word => word.length > 0).length;
  const pageEstimate = Math.ceil(wordCount / 250);
  const characterCount = manuscript.length;

  return {
    wordCount,
    pageEstimate,
    characterCount
  };
}

export {
  frontMatter,
  part1Awakening,
  part1Expansion,
  part2SovereignMind,
  part2Expansion,
  part3GroupEconomics,
  part3Expansion,
  part4Treasury,
  part4Expansion,
  part5LandLegacy,
  part5Expansion,
  part6SovereignEconomy,
  part6Expansion,
  part7Activation,
  part7Expansion,
  appendix
};
