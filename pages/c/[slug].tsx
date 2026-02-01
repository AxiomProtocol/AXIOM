import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

interface CampaignData {
  campaign_id: number;
  title: string;
  subtitle: string;
  target_amount: string;
  raised_amount: string;
  investor_count: number;
  status: string;
  location: string;
  acreage: string;
  referral_code?: string;
}

interface SharePageProps {
  campaign: CampaignData | null;
  error?: string;
}

export default function ShareRedirectPage({ campaign, error }: SharePageProps) {
  const router = useRouter();
  const { slug, ref } = router.query;

  useEffect(() => {
    if (campaign) {
      if (ref) {
        fetch('/api/land-acquisition/referral', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'track_click',
            referralCode: ref
          })
        }).catch(console.error);
      }

      setTimeout(() => {
        router.push(`/land-acquisition?campaign=${campaign.campaign_id}${ref ? `&ref=${ref}` : ''}`);
      }, 100);
    }
  }, [campaign, ref, router]);

  if (error || !campaign) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, marginBottom: 16 }}>Campaign Not Found</h1>
          <p style={{ color: '#64748b' }}>{error || 'This link may have expired.'}</p>
          <a
            href="/land-acquisition"
            style={{
              display: 'inline-block',
              marginTop: 24,
              padding: '12px 24px',
              background: '#00D4AA',
              color: '#fff',
              borderRadius: 8,
              textDecoration: 'none'
            }}
          >
            View All Projects
          </a>
        </div>
      </div>
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://axiom.city';
  const percentFunded = campaign.target_amount 
    ? ((parseFloat(campaign.raised_amount) / parseFloat(campaign.target_amount)) * 100).toFixed(1)
    : '0';

  return (
    <>
      <Head>
        <title>{campaign.title} | Axiom Land Investment</title>
        <meta name="description" content={campaign.subtitle || `Invest in ${campaign.acreage} acres in ${campaign.location}`} />
        
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${baseUrl}/c/${slug}`} />
        <meta property="og:title" content={campaign.title} />
        <meta property="og:description" content={`${percentFunded}% funded - ${campaign.investor_count} investors. ${campaign.subtitle}`} />
        <meta property="og:image" content={`${baseUrl}/api/og/campaign?id=${campaign.campaign_id}`} />
        <meta property="og:site_name" content="Axiom Protocol" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={campaign.title} />
        <meta name="twitter:description" content={`${percentFunded}% funded. Join ${campaign.investor_count} investors in this community land project.`} />
        <meta name="twitter:image" content={`${baseUrl}/api/og/campaign?id=${campaign.campaign_id}`} />
      </Head>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #00d4aa 0%, #7b68ee 100%)'
      }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{
            width: 48,
            height: 48,
            border: '4px solid rgba(255,255,255,0.3)',
            borderTopColor: '#fff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 24px'
          }} />
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>Loading Campaign...</h2>
          <p style={{ opacity: 0.8 }}>{campaign.title}</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug } = context.params || {};

  if (!slug || typeof slug !== 'string') {
    return {
      props: {
        campaign: null,
        error: 'Invalid link'
      }
    };
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 5000}`;
    const response = await fetch(`${baseUrl}/api/land-acquisition/share?slug=${slug}`);
    const data = await response.json();

    if (!data.success) {
      return {
        props: {
          campaign: null,
          error: data.error || 'Campaign not found'
        }
      };
    }

    return {
      props: {
        campaign: data.data
      }
    };
  } catch (error: any) {
    console.error('Error fetching campaign:', error);
    return {
      props: {
        campaign: null,
        error: 'Failed to load campaign'
      }
    };
  }
};
