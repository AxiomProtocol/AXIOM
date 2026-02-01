import Head from 'next/head';
import dynamic from 'next/dynamic';

const UnifiedDashboard = dynamic(
  () => import('../components/UnifiedDashboard').then(mod => mod.UnifiedDashboard),
  { ssr: false }
);

export default function DashboardPage() {
  return (
    <>
      <Head>
        <title>Dashboard | Axiom Protocol</title>
        <meta name="description" content="Your personalized Axiom dashboard with investments and governance" />
      </Head>
      <UnifiedDashboard />
    </>
  );
}
