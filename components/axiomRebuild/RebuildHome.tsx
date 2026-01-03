"use client";

import React from "react";
import { homeCopy } from "./copy/homeCopy";
import { Web3Hero } from "./Web3Hero";
import { Web3Section } from "./Web3Section";

export function RebuildHome() {
  return (
    <div style={{ background: "#FFFFFF" }}>
      <Web3Hero
        kicker={homeCopy.hero.kicker}
        headline={homeCopy.hero.headline}
        secondary={homeCopy.hero.secondary}
        subheadline={homeCopy.hero.subheadline}
        primaryCta={homeCopy.hero.primaryCta}
        secondaryCta={homeCopy.hero.secondaryCta}
        microcopy={homeCopy.hero.microcopy}
      />

      {homeCopy.sections.map((s, i) => (
        <Web3Section
          key={s.id}
          id={s.id}
          title={s.title}
          body={s.body}
          bullets={s.bullets}
          primaryCta={s.primaryCta}
          secondaryCta={s.secondaryCta}
          variant={
            s.id === "keygrow" ? "highlight" :
            s.id === "start" ? "dark" :
            "default"
          }
          index={i}
        />
      ))}
    </div>
  );
}
