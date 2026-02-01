"use client";

import React, { useEffect, useRef } from "react";
import { homeCopy } from "./copy/homeCopy";
import { Web3Hero } from "./Web3Hero";
import { Web3Section } from "./Web3Section";
import { MetricsRow } from "./MetricsRow";
import { ProofStrip } from "./ProofStrip";
import { JourneyGraphic } from "./JourneyGraphic";
import { RoleCards } from "./RoleCards";
import { FutureLandPipeline } from "./FutureLandPipeline";
import { TokenUtilityCallout } from "./TokenUtilityCallout";
import { LiveCrowdfundingSection } from "./LiveCrowdfundingSection";
import { LandownerCallout } from "./LandownerCallout";
import { trackOnce } from "./analytics";

interface SectionType {
  id: string;
  title: string;
  body: string;
  bullets?: string[];
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  image?: string;
  imageAlt?: string;
}

function useSectionTracking(sectionId: string) {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!ref.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            trackOnce('home_section_view', `sectionview_${sectionId}`, { section: sectionId });
          }
        });
      },
      { threshold: 0.3 }
    );
    
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [sectionId]);
  
  return ref;
}

function SectionWrapper({ id, children }: { id: string; children: React.ReactNode }) {
  const ref = useSectionTracking(id);
  return <div ref={ref} id={id}>{children}</div>;
}

export function RebuildHome() {
  const heroRef = useSectionTracking('hero');
  
  const sections = homeCopy.sections as SectionType[];
  
  const proofSection = sections.find(s => s.id === 'proof');
  const problemSection = sections.find(s => s.id === 'problem');
  const keygrowSection = sections.find(s => s.id === 'keygrow');
  const otherSections = sections.filter(s => !['proof', 'problem', 'keygrow'].includes(s.id));
  
  return (
    <div style={{ background: "#FFFFFF" }}>
      <div ref={heroRef}>
        <Web3Hero
          kicker={homeCopy.hero.kicker}
          headline={homeCopy.hero.headline}
          secondary={homeCopy.hero.secondary}
          subheadline={homeCopy.hero.subheadline}
          primaryCta={homeCopy.hero.primaryCta}
          secondaryCta={homeCopy.hero.secondaryCta}
          microcopy={homeCopy.hero.microcopy}
        />
      </div>
      
      <MetricsRow page="home" />
      
      <LiveCrowdfundingSection page="home" />
      
      {proofSection && (
        <SectionWrapper id="proof">
          <Web3Section
            id={proofSection.id}
            title={proofSection.title}
            body={proofSection.body}
            bullets={proofSection.bullets}
            primaryCta={proofSection.primaryCta}
            secondaryCta={proofSection.secondaryCta}
            variant="default"
            index={0}
            image={proofSection.image}
            imageAlt={proofSection.imageAlt}
          />
          <ProofStrip page="home" />
        </SectionWrapper>
      )}
      
      {problemSection && (
        <SectionWrapper id="problem">
          <Web3Section
            id={problemSection.id}
            title={problemSection.title}
            body={problemSection.body}
            bullets={problemSection.bullets}
            primaryCta={problemSection.primaryCta}
            secondaryCta={problemSection.secondaryCta}
            variant="default"
            index={1}
            image={problemSection.image}
            imageAlt={problemSection.imageAlt}
          />
        </SectionWrapper>
      )}
      
      <JourneyGraphic page="home" />
      
      {keygrowSection && (
        <SectionWrapper id="keygrow">
          <Web3Section
            id={keygrowSection.id}
            title={keygrowSection.title}
            body={keygrowSection.body}
            bullets={keygrowSection.bullets}
            primaryCta={keygrowSection.primaryCta}
            secondaryCta={keygrowSection.secondaryCta}
            variant="highlight"
            index={2}
            image={keygrowSection.image}
            imageAlt={keygrowSection.imageAlt}
          />
          <RoleCards page="home" />
        </SectionWrapper>
      )}
      
      <FutureLandPipeline page="home" />
      
      <LandownerCallout page="home" />
      
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "60px 20px" }}>
        <TokenUtilityCallout page="home" />
      </div>
      
      {otherSections.map((s, i) => (
        <SectionWrapper key={s.id} id={s.id}>
          <Web3Section
            id={s.id}
            title={s.title}
            body={s.body}
            bullets={s.bullets}
            primaryCta={s.primaryCta}
            secondaryCta={s.secondaryCta}
            variant={s.id === "start" ? "dark" : "default"}
            index={i + 3}
            image={s.image}
            imageAlt={s.imageAlt}
          />
        </SectionWrapper>
      ))}
    </div>
  );
}
