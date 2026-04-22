import Layout from "../components/Layout";
import TransparencyReportsTable from "../components/TransparencyReportsTable";
import ProofOfReserves from "../components/ProofOfReserves";
import ReservesSummary from "../components/ReservesSummary";
import dynamic from "next/dynamic";
import GrowthMetric from "../components/GrowthMetric";
import ExportButtons from "../components/ExportButtons";
import DownloadPDF from "../components/DownloadPDF";

const ReservesHistoryChart = dynamic(
  () => import("../components/ReservesHistoryChart"),
  { ssr: false, loading: () => <div className="w-full h-64 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center"><span className="text-gray-400">Loading chart...</span></div> }
);

export default function TransparencyReportsPage() {
  const investor = { email: null, code: null };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Transparency Reports</h1>
          <p className="text-lg text-gray-600">Real-time visibility into Axiom's treasury, reserves, and financial operations.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <ReservesSummary fetchUrl="/api/reports/proof-of-reserves" />
          <GrowthMetric fetchUrl="/api/reports/reserves-history" />
        </div>

        <div className="bg-gray-50 rounded-2xl p-8 mb-10">
          <ReservesHistoryChart fetchUrl="/api/reports/reserves-history" />
        </div>

        <div className="flex flex-wrap gap-4 mb-10">
          <ExportButtons fetchUrl="/api/reports/reserves-history" />
          <DownloadPDF email={investor.email} code={investor.code} />
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-gray-50 rounded-2xl p-8">
            <ProofOfReserves fetchUrl="/api/reports/proof-of-reserves" />
          </div>
          <div className="bg-gray-50 rounded-2xl p-8">
            <TransparencyReportsTable fetchReportsUrl="/api/reports/transparency-reports" />
          </div>
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
