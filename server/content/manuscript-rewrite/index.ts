import { frontMatter } from './front-matter';
import { part1Awakening } from './part1-awakening';
import { part2SovereignMind } from './part2-sovereign-mind';
import { part3GroupEconomics } from './part3-group-economics';
import { part4Treasury } from './part4-treasury';
import { part5LandLegacy } from './part5-land-legacy';
import { part6SovereignEconomy } from './part6-sovereign-economy';
import { part7Activation } from './part7-activation';
import { appendix } from './appendix';

export function compileGoldStandardManuscript(): string {
  const sections = [
    frontMatter,
    part1Awakening,
    part2SovereignMind,
    part3GroupEconomics,
    part4Treasury,
    part5LandLegacy,
    part6SovereignEconomy,
    part7Activation,
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
  part2SovereignMind,
  part3GroupEconomics,
  part4Treasury,
  part5LandLegacy,
  part6SovereignEconomy,
  part7Activation,
  appendix
};
