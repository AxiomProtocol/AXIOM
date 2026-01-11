import Head from 'next/head';
import dynamic from 'next/dynamic';

const PersonalizedDashboard = dynamic(
  () => import('../components/PersonalizedDashboard').then(mod => mod.PersonalizedDashboard),
  { ssr: false }
);

export default function DashboardPage() {
  return (
    <>
      <Head>
        <title>Dashboard | Axiom Protocol</title>
        <meta name="description" content="Your personalized Axiom dashboard" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#F9FAFB', paddingBottom: '100px' }}>
        <PersonalizedDashboard />
      </div>
    </>
  );
}
