import React from "react";

type Cta = { label: string; href: string };

type Props = {
  id?: string;
  title: string;
  body: string;
  bullets?: string[];
  primaryCta?: Cta;
  secondaryCta?: Cta;
};

export function RebuildSection(props: Props) {
  const { id, title, body, bullets, primaryCta, secondaryCta } = props;

  return (
    <section id={id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)", padding: "28px 0" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 20px" }}>
        <h3 style={{ margin: "0 0 10px 0", fontSize: 20 }}>{title}</h3>
        <p style={{ margin: 0, color: "rgba(18,18,18,0.74)", whiteSpace: "pre-line", maxWidth: 860 }}>
          {body}
        </p>

        {bullets && bullets.length ? (
          <ul style={{ margin: "12px 0 0 0", paddingLeft: 18, color: "rgba(18,18,18,0.74)", maxWidth: 860 }}>
            {bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        ) : null}

        {(primaryCta || secondaryCta) ? (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            {primaryCta ? (
              <a
                href={primaryCta.href}
                style={{
                  border: "1px solid rgba(0,0,0,0.18)",
                  background: "rgba(18,18,18,0.92)",
                  color: "white",
                  padding: "10px 14px",
                  borderRadius: 12,
                  fontSize: 14
                }}
              >
                {primaryCta.label}
              </a>
            ) : null}
            {secondaryCta ? (
              <a
                href={secondaryCta.href}
                style={{
                  border: "1px solid rgba(0,0,0,0.18)",
                  background: "white",
                  color: "rgba(18,18,18,0.92)",
                  padding: "10px 14px",
                  borderRadius: 12,
                  fontSize: 14
                }}
              >
                {secondaryCta.label}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
