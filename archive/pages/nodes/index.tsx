import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/axiom-nodes',
      permanent: true,
    },
  };
};

export default function NodesRedirect() {
  return null;
}
