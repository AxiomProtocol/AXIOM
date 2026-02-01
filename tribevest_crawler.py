import requests
import trafilatura
from urllib.parse import urljoin, urlparse
import time
import json
import os
from bs4 import BeautifulSoup

def crawl_tribevest():
    """
    Crawl Tribevest website to analyze their platform features and content
    """
    base_url = "https://www.tribevest.com/"
    crawled_data = {}
    visited_urls = set()
    
    # Headers to appear as a regular browser
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    def get_page_content(url):
        """Extract main text content from a URL"""
        try:
            print(f"Crawling: {url}")
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            # Extract main content using trafilatura
            text_content = trafilatura.extract(response.text)
            
            # Also get page title and meta description using BeautifulSoup
            soup = BeautifulSoup(response.text, 'html.parser')
            title = soup.find('title')
            title_text = title.get_text().strip() if title else "No title"
            
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            description = meta_desc.get('content', '').strip() if meta_desc else "No description"
            
            return {
                'url': url,
                'title': title_text,
                'description': description,
                'content': text_content if text_content else "No content extracted",
                'status': 'success'
            }
        except Exception as e:
            print(f"Error crawling {url}: {str(e)}")
            return {
                'url': url,
                'title': "Error",
                'description': "Failed to crawl",
                'content': f"Error: {str(e)}",
                'status': 'error'
            }
    
    def find_internal_links(url, html_content):
        """Find internal links on a page"""
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            links = set()
            
            for link in soup.find_all('a', href=True):
                href = link['href']
                full_url = urljoin(url, href)
                
                # Only include tribevest.com links
                if 'tribevest.com' in full_url and full_url not in visited_urls:
                    # Filter out common non-content URLs
                    if not any(skip in full_url.lower() for skip in [
                        'mailto:', 'tel:', '#', 'javascript:', 
                        '.pdf', '.jpg', '.png', '.gif', '.svg',
                        '/wp-admin', '/wp-content', '/feed',
                        'facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com'
                    ]):
                        links.add(full_url)
            
            return links
        except Exception as e:
            print(f"Error finding links: {str(e)}")
            return set()
    
    # Start with the main page
    urls_to_visit = [base_url]
    max_pages = 20  # Limit to prevent excessive crawling
    pages_crawled = 0
    
    while urls_to_visit and pages_crawled < max_pages:
        current_url = urls_to_visit.pop(0)
        
        if current_url in visited_urls:
            continue
            
        visited_urls.add(current_url)
        
        # Get page content
        page_data = get_page_content(current_url)
        crawled_data[current_url] = page_data
        pages_crawled += 1
        
        # If successful, find more links to crawl
        if page_data['status'] == 'success' and pages_crawled < max_pages:
            try:
                response = requests.get(current_url, headers=headers, timeout=10)
                new_links = find_internal_links(current_url, response.text)
                
                # Add new links to visit (limit to most important pages)
                priority_keywords = ['about', 'features', 'how-it-works', 'pricing', 'platform', 'invest', 'club']
                priority_links = [link for link in new_links if any(keyword in link.lower() for keyword in priority_keywords)]
                
                # Add priority links first
                urls_to_visit.extend(priority_links[:5])  # Limit to 5 priority links
                
                # Add other links if we have room
                remaining_links = [link for link in new_links if link not in priority_links]
                urls_to_visit.extend(remaining_links[:3])  # Limit to 3 other links
                
            except Exception as e:
                print(f"Error finding additional links for {current_url}: {str(e)}")
        
        # Be respectful - add a small delay
        time.sleep(1)
        
        print(f"Crawled {pages_crawled}/{max_pages} pages")
    
    return crawled_data

def analyze_tribevest_features(crawled_data):
    """
    Analyze the crawled data to extract key features and insights
    """
    analysis = {
        'key_features': [],
        'platform_benefits': [],
        'business_model': [],
        'technology_stack': [],
        'user_experience': [],
        'competitive_advantages': []
    }
    
    # Keywords to look for in content
    feature_keywords = [
        'investment club', 'group investing', 'real estate', 'stocks', 'portfolio',
        'fund management', 'collective investing', 'social investing', 'tribe',
        'investment strategy', 'risk management', 'returns', 'diversification'
    ]
    
    benefit_keywords = [
        'transparent', 'easy', 'automated', 'professional', 'secure',
        'low cost', 'accessible', 'democratic', 'collaborative'
    ]
    
    tech_keywords = [
        'platform', 'app', 'mobile', 'web', 'API', 'integration',
        'blockchain', 'crypto', 'fintech', 'banking'
    ]
    
    for url, page_data in crawled_data.items():
        if page_data['status'] == 'success':
            content = page_data['content'].lower()
            title = page_data['title'].lower()
            
            # Extract features
            for keyword in feature_keywords:
                if keyword in content or keyword in title:
                    analysis['key_features'].append(f"Found '{keyword}' mentioned in {page_data['title']}")
            
            # Extract benefits
            for keyword in benefit_keywords:
                if keyword in content or keyword in title:
                    analysis['platform_benefits'].append(f"Emphasizes '{keyword}' in {page_data['title']}")
            
            # Extract tech info
            for keyword in tech_keywords:
                if keyword in content or keyword in title:
                    analysis['technology_stack'].append(f"Uses '{keyword}' mentioned in {page_data['title']}")
    
    return analysis

if __name__ == "__main__":
    print("Starting Tribevest website crawl...")
    
    # Create directory for crawled data
    os.makedirs('crawled_data', exist_ok=True)
    
    # Crawl the website
    crawled_data = crawl_tribevest()
    
    # Save raw crawled data
    with open('crawled_data/tribevest_raw_data.json', 'w', encoding='utf-8') as f:
        json.dump(crawled_data, f, indent=2, ensure_ascii=False)
    
    # Analyze the data
    analysis = analyze_tribevest_features(crawled_data)
    
    # Save analysis
    with open('crawled_data/tribevest_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(analysis, f, indent=2, ensure_ascii=False)
    
    # Create summary report
    summary = {
        'pages_crawled': len(crawled_data),
        'successful_pages': len([p for p in crawled_data.values() if p['status'] == 'success']),
        'failed_pages': len([p for p in crawled_data.values() if p['status'] == 'error']),
        'pages_by_title': {url: data['title'] for url, data in crawled_data.items()},
        'analysis_summary': analysis
    }
    
    with open('crawled_data/tribevest_summary.json', 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    print(f"\nCrawl completed!")
    print(f"Pages crawled: {len(crawled_data)}")
    print(f"Successful: {len([p for p in crawled_data.values() if p['status'] == 'success'])}")
    print(f"Failed: {len([p for p in crawled_data.values() if p['status'] == 'error'])}")
    print(f"\nData saved to crawled_data/ directory")
    
    # Print quick summary
    print("\nPage titles crawled:")
    for url, data in crawled_data.items():
        if data['status'] == 'success':
            print(f"- {data['title']}")