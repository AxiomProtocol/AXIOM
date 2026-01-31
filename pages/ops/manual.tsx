import { GetServerSideProps } from 'next';
import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import fs from 'fs';
import path from 'path';

interface NavSection {
  id: string;
  title: string;
  anchor: string;
  subsections?: NavSection[];
}

interface NavData {
  title: string;
  version: string;
  sections: NavSection[];
}

interface ManualPageProps {
  content: string;
  nav: NavData;
  lastUpdated: string;
}

export const getServerSideProps: GetServerSideProps = async () => {
  const isEnabled = process.env.OPS_MANUAL_ENABLED === 'true';
  
  if (!isEnabled) {
    return {
      notFound: true,
    };
  }

  const manualPath = path.join(process.cwd(), 'docs/ops/sop-operations-manual.md');
  const navPath = path.join(process.cwd(), 'docs/ops/_nav.json');

  let content = '';
  let nav: NavData = { title: 'SOP Operations Manual', version: '1.0.0', sections: [] };
  let lastUpdated = new Date().toISOString();

  try {
    content = fs.readFileSync(manualPath, 'utf-8');
    const stats = fs.statSync(manualPath);
    lastUpdated = stats.mtime.toISOString();
  } catch (error) {
    console.error('Error reading manual:', error);
    content = '# Manual Not Found\n\nThe operations manual could not be loaded.';
  }

  try {
    const navContent = fs.readFileSync(navPath, 'utf-8');
    nav = JSON.parse(navContent);
  } catch (error) {
    console.error('Error reading navigation:', error);
  }

  return {
    props: {
      content,
      nav,
      lastUpdated,
    },
  };
};

export default function OpsManualPage({ content, nav, lastUpdated }: ManualPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('');

  const filteredContent = useMemo(() => {
    if (!searchQuery.trim()) return content;
    
    const lines = content.split('\n');
    const matchingLines: string[] = [];
    const query = searchQuery.toLowerCase();
    
    let inMatchingSection = false;
    let currentHeading = '';
    
    for (const line of lines) {
      if (line.startsWith('#')) {
        currentHeading = line;
        inMatchingSection = line.toLowerCase().includes(query);
        if (inMatchingSection) {
          matchingLines.push(line);
        }
      } else if (line.toLowerCase().includes(query)) {
        if (!matchingLines.includes(currentHeading) && currentHeading) {
          matchingLines.push(currentHeading);
        }
        matchingLines.push(line);
        inMatchingSection = true;
      } else if (inMatchingSection && line.trim()) {
        matchingLines.push(line);
      }
    }
    
    return matchingLines.length > 0 ? matchingLines.join('\n') : `No results found for "${searchQuery}"`;
  }, [content, searchQuery]);

  const handlePrint = () => {
    window.print();
  };

  const scrollToSection = (anchor: string) => {
    const id = anchor.replace('#', '');
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = nav.sections.flatMap(s => [s, ...(s.subsections || [])]);
      for (const section of sections.reverse()) {
        const id = section.anchor.replace('#', '');
        const element = document.getElementById(id);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 100) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [nav.sections]);

  const formattedDate = new Date(lastUpdated).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      <Head>
        <title>SOP Operations Manual | Axiom Protocol</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50 print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-bold text-gray-900">{nav.title}</h1>
                <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded">
                  INTERNAL
                </span>
                <span className="text-sm text-gray-500">v{nav.version}</span>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search manual..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      x
                    </button>
                  )}
                </div>
                
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Print
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-8">
            <nav className="w-64 flex-shrink-0 print:hidden">
              <div className="sticky top-24 bg-white rounded-lg shadow p-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                  Navigation
                </h2>
                <ul className="space-y-1">
                  {nav.sections.map((section) => (
                    <li key={section.id}>
                      <button
                        onClick={() => scrollToSection(section.anchor)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                          activeSection === section.anchor.replace('#', '')
                            ? 'bg-teal-50 text-teal-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {section.title}
                      </button>
                      {section.subsections && section.subsections.length > 0 && (
                        <ul className="ml-4 mt-1 space-y-1">
                          {section.subsections.map((sub) => (
                            <li key={sub.id}>
                              <button
                                onClick={() => scrollToSection(sub.anchor)}
                                className={`w-full text-left px-3 py-1.5 text-xs rounded transition-colors ${
                                  activeSection === sub.anchor.replace('#', '')
                                    ? 'bg-teal-50 text-teal-600'
                                    : 'text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {sub.title}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </nav>

            <main className="flex-1 min-w-0">
              <div className="bg-white rounded-lg shadow">
                <div className="px-8 py-4 border-b border-gray-200 flex items-center justify-between print:hidden">
                  <span className="text-sm text-gray-500">
                    Last updated: {formattedDate}
                  </span>
                  {searchQuery && (
                    <span className="text-sm text-amber-600">
                      Showing search results for: &quot;{searchQuery}&quot;
                    </span>
                  )}
                </div>
                
                <article className="px-8 py-6 prose prose-slate max-w-none prose-headings:scroll-mt-24 prose-h1:text-3xl prose-h2:text-2xl prose-h2:border-b prose-h2:pb-2 prose-h2:border-gray-200 prose-table:text-sm prose-th:bg-gray-50 prose-td:border prose-th:border prose-td:px-3 prose-td:py-2 prose-th:px-3 prose-th:py-2">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children, ...props }) => {
                        const id = children?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                        return <h1 id={id} {...props}>{children}</h1>;
                      },
                      h2: ({ children, ...props }) => {
                        const id = children?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                        return <h2 id={id} {...props}>{children}</h2>;
                      },
                      h3: ({ children, ...props }) => {
                        const id = children?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                        return <h3 id={id} {...props}>{children}</h3>;
                      },
                      input: ({ type, checked, ...props }) => {
                        if (type === 'checkbox') {
                          return (
                            <input
                              type="checkbox"
                              checked={checked}
                              readOnly
                              className="mr-2 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                              {...props}
                            />
                          );
                        }
                        return <input type={type} {...props} />;
                      },
                    }}
                  >
                    {filteredContent}
                  </ReactMarkdown>
                </article>
              </div>
            </main>
          </div>
        </div>

        <footer className="bg-white border-t border-gray-200 mt-12 print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Axiom Protocol - Internal Operations Manual</span>
              <span>Classification: Internal Use Only</span>
            </div>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        @media print {
          body {
            font-size: 12pt;
          }
          .prose {
            max-width: 100% !important;
          }
          pre {
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          table {
            page-break-inside: avoid;
          }
          h2, h3 {
            page-break-after: avoid;
          }
        }
      `}</style>
    </>
  );
}
