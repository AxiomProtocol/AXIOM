"use client";

import React from "react";
import { homeCopy } from "./copy/homeCopy";
import { RebuildSection } from "./RebuildSection";

export function RebuildHome() {
  return (
    <div>
      <div style={{ padding: "56px 0 28px 0" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 20px" }}>
          <div
            style={{
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 18,
              padding: 28,
              background: "white",
              boxShadow: "0 8px 28px rgba(0,0,0,0.06)"
            }}
          >
            <p style={{ fontSize: 14, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(18,18,18,0.64)", margin: "0 0 10px 0" }}>
              {homeCopy.hero.kicker}
            </p>

            <h1 style={{ fontSize: 40, lineHeight: 1.12, margin: 0 }}>{homeCopy.hero.headline}</h1>
            <h2 style={{ fontSize: 24, lineHeight: 1.25, margin: "12px 0 0 0", color: "rgba(18,18,18,0.8)" }}>
              {homeCopy.hero.secondary}
            </h2>

            <p style={{ margin: "14px 0 0 0", fontSize: 16, color: "rgba(18,18,18,0.74)", maxWidth: 760 }}>
              {homeCopy.hero.subheadline}
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
              <a
                href={homeCopy.hero.primaryCta.href}
                style={{
                  border: "1px solid rgba(0,0,0,0.18)",
                  background: "rgba(18,18,18,0.92)",
                  color: "white",
                  padding: "10px 14px",
                  borderRadius: 12,
                  fontSize: 14
                }}
              >
                {homeCopy.hero.primaryCta.label}
              </a>
              <a
                href={homeCopy.hero.secondaryCta.href}
                style={{
                  border: "1px solid rgba(0,0,0,0.18)",
                  background: "white",
                  color: "rgba(18,18,18,0.92)",
                  padding: "10px 14px",
                  borderRadius: 12,
                  fontSize: 14
                }}
              >
                {homeCopy.hero.secondaryCta.label}
              </a>
            </div>

            <div style={{ marginTop: 12, fontSize: 13, color: "rgba(18,18,18,0.62)", maxWidth: 820 }}>
              {homeCopy.hero.microcopy}
            </div>
          </div>
        </div>
      </div>

      {homeCopy.sections.map((s) => (
        <RebuildSection
          key={s.id}
          id={s.id}
          title={s.title}
          body={s.body}
          bullets={s.bullets}
          primaryCta={s.primaryCta}
          secondaryCta={s.secondaryCta}
        />
      ))}
    </div>
  );
}
