import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function SectionCard({
  title,
  subtitle,
  children
}: SectionCardProps) {
  return (
    <section className="section-card">
      <header className="section-head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </header>
      {children}
    </section>
  );
}
