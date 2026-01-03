import TopNav from "./TopNav";
import Footer from "./Footer";

export default function SiteLayout({ children }) {
  return (
    <div className="ax-siteWrapper">
      <TopNav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
