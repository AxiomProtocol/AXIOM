import Head from 'next/head';
import dynamic from 'next/dynamic';
import Layout from '../components/Layout';

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
      <Layout>
        <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
          <PersonalizedDashboard />
        </div>
      </Layout>
    </>
  );
}
