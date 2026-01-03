import Link from "next/link";

export default function Section({ id, title, body, bullets, primaryCta, secondaryCta }) {
  return (
    <section className="ax-section" id={id}>
      <div className="ax-container">
        <h3 className="ax-sectionTitle">{title}</h3>
        <p className="ax-sectionBody">{body}</p>

        {bullets && bullets.length > 0 && (
          <ul className="ax-sectionBullets">
            {bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        )}

        {(primaryCta || secondaryCta) && (
          <div className="ax-sectionCtas">
            {primaryCta && (
              <Link href={primaryCta.to} className="ax-btnPrimary">
                {primaryCta.label}
              </Link>
            )}
            {secondaryCta && (
              <Link href={secondaryCta.to} className="ax-btnSecondary">
                {secondaryCta.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
