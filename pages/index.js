import dynamic from 'next/dynamic';

const DesignLawHome = dynamic(
  () => import('../components/design-law/DesignLawHome').then(mod => mod.DesignLawHome),
  { ssr: true }
);

export default function Home() {
  return <DesignLawHome />;
}

export function getStaticProps() {
  return { props: {} };
}
