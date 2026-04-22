import requests
from bs4 import BeautifulSoup
import trafilatura
import json
import os
from urllib.parse import urljoin, urlparse
import time

class WebsiteCrawler:
    def __init__(self, base_url, output_dir="crawled_data"):
        self.base_url = base_url
        self.visited_urls = set()
        self.pages_data = {}
        self.output_dir = output_dir
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        })
        
        # Create output directory if it doesn't exist
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
    
    def clean_url(self, url):
        """Remove fragments and normalize URL"""
        parsed = urlparse(url)
        return f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
    
    def is_same_domain(self, url):
        """Check if URL belongs to the same domain as base_url"""
        return urlparse(url).netloc == urlparse(self.base_url).netloc
    
    def extract_page_data(self, url, html):
        """Extract useful data from the page"""
        soup = BeautifulSoup(html, 'html.parser')
        
        # Extract main content
        main_content = trafilatura.extract(html, include_links=True, include_formatting=True)
        
        # Extract title
        title = soup.title.text if soup.title else ""
        
        # Extract meta description
        meta_desc = ""
        meta_tag = soup.find("meta", attrs={"name": "description"})
        if meta_tag:
            meta_desc = meta_tag.get("content", "")
        
        # Extract headings
        headings = []
        for h in soup.find_all(['h1', 'h2', 'h3']):
            headings.append({
                'level': int(h.name[1]),
                'text': h.get_text(strip=True)
            })
        
        # Extract links
        links = []
        for a in soup.find_all('a', href=True):
            href = a['href']
            if href.startswith('/') or href.startswith(self.base_url):
                full_url = urljoin(self.base_url, href)
                if self.is_same_domain(full_url):
                    links.append({
                        'url': full_url,
                        'text': a.get_text(strip=True) or a.get('title', '')
                    })
        
        # Look for forms (login, signup, contact)
        forms = []
        for form in soup.find_all('form'):
            form_data = {
                'action': form.get('action', ''),
                'method': form.get('method', 'get'),
                'fields': []
            }
            
            for input_field in form.find_all(['input', 'select', 'textarea']):
                field_type = input_field.get('type', input_field.name)
                field_name = input_field.get('name', '')
                field_id = input_field.get('id', '')
                field_placeholder = input_field.get('placeholder', '')
                
                if field_name or field_id:
                    form_data['fields'].append({
                        'type': field_type,
                        'name': field_name,
                        'id': field_id,
                        'placeholder': field_placeholder
                    })
            
            forms.append(form_data)
        
        # Extract navigation structure
        nav_items = []
        for nav in soup.find_all(['nav', 'ul', 'div'], class_=lambda c: c and ('nav' in c.lower() or 'menu' in c.lower())):
            nav_links = nav.find_all('a')
            if len(nav_links) > 3:  # Likely a navigation menu if it has several links
                for link in nav_links:
                    href = link.get('href', '')
                    if href:
                        nav_items.append({
                            'url': urljoin(self.base_url, href),
                            'text': link.get_text(strip=True)
                        })
        
        # Look for buttons that might trigger JS functionality
        buttons = []
        for button in soup.find_all(['button', 'a'], class_=lambda c: c and ('btn' in c.lower() or 'button' in c.lower())):
            btn_text = button.get_text(strip=True)
            btn_id = button.get('id', '')
            btn_class = button.get('class', [])
            btn_href = button.get('href', '') if button.name == 'a' else ''
            
            if btn_text or btn_id:
                buttons.append({
                    'element': button.name,
                    'text': btn_text,
                    'id': btn_id,
                    'class': ' '.join(btn_class) if isinstance(btn_class, list) else btn_class,
                    'href': btn_href
                })
        
        return {
            'url': url,
            'title': title,
            'meta_description': meta_desc,
            'headings': headings,
            'main_content': main_content,
            'links': links,
            'forms': forms,
            'navigation': nav_items,
            'buttons': buttons
        }
    
    def crawl(self, max_pages=20):
        """Crawl the website starting from base_url"""
        to_visit = [self.base_url]
        page_count = 0
        
        while to_visit and page_count < max_pages:
            current_url = to_visit.pop(0)
            if current_url in self.visited_urls:
                continue
            
            clean_current_url = self.clean_url(current_url)
            if clean_current_url in self.visited_urls:
                continue
            
            self.visited_urls.add(clean_current_url)
            
            try:
                print(f"Crawling: {clean_current_url}")
                response = self.session.get(clean_current_url, timeout=10)
                
                if response.status_code == 200:
                    page_data = self.extract_page_data(clean_current_url, response.text)
                    self.pages_data[clean_current_url] = page_data
                    
                    # Save individual page data
                    page_filename = f"{page_count}_{urlparse(clean_current_url).path.replace('/', '_')}"
                    if page_filename.endswith('_'):
                        page_filename += 'index'
                    
                    with open(f"{self.output_dir}/{page_filename}.json", 'w', encoding='utf-8') as f:
                        json.dump(page_data, f, indent=2, ensure_ascii=False)
                    
                    # Add new URLs to visit
                    for link in page_data['links']:
                        if link['url'] not in self.visited_urls and self.is_same_domain(link['url']):
                            to_visit.append(link['url'])
                    
                    page_count += 1
                    
                    # Be nice to the server
                    time.sleep(1)
                
            except Exception as e:
                print(f"Error crawling {clean_current_url}: {e}")
        
        # Save summary of all crawled pages
        with open(f"{self.output_dir}/crawl_summary.json", 'w', encoding='utf-8') as f:
            summary = {
                'base_url': self.base_url,
                'pages_crawled': len(self.pages_data),
                'page_list': list(self.pages_data.keys())
            }
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        print(f"Crawling completed. Crawled {len(self.pages_data)} pages.")
        return self.pages_data
    
    def analyze_structure(self):
        """Analyze the website structure and functionality"""
        if not self.pages_data:
            print("No pages crawled yet. Run crawl() first.")
            return None
        
        analysis = {
            'page_count': len(self.pages_data),
            'has_login': False,
            'has_signup': False,
            'has_contact_form': False,
            'navigation_structure': [],
            'forms_found': [],
            'potential_functionality': []
        }
        
        # Analyze navigation
        nav_items = {}
        for url, page_data in self.pages_data.items():
            for nav in page_data['navigation']:
                nav_text = nav['text'].strip()
                if nav_text:
                    if nav_text not in nav_items:
                        nav_items[nav_text] = set()
                    nav_items[nav_text].add(nav['url'])
        
        analysis['navigation_structure'] = [
            {'text': k, 'urls': list(v)} for k, v in nav_items.items()
        ]
        
        # Look for login/signup functionality
        login_keywords = ['login', 'log in', 'sign in', 'signin', 'account']
        signup_keywords = ['sign up', 'signup', 'register', 'join', 'create account']
        contact_keywords = ['contact', 'support', 'help', 'message', 'email us']
        
        for url, page_data in self.pages_data.items():
            # Check forms
            for form in page_data['forms']:
                form_info = {
                    'url': url,
                    'action': form['action'],
                    'method': form['method'],
                    'field_count': len(form['fields']),
                    'field_types': [f['type'] for f in form['fields']]
                }
                
                analysis['forms_found'].append(form_info)
                
                # Analyze form purpose
                form_has_password = any(f['type'] == 'password' for f in form['fields'])
                form_has_email = any(f['type'] == 'email' or 'email' in f.get('name', '').lower() for f in form['fields'])
                
                if form_has_password and form_has_email:
                    if any(kw in url.lower() or kw in page_data['title'].lower() for kw in signup_keywords):
                        analysis['has_signup'] = True
                    else:
                        analysis['has_login'] = True
                
                if form_has_email and any(kw in url.lower() or kw in page_data['title'].lower() for kw in contact_keywords):
                    analysis['has_contact_form'] = True
            
            # Check buttons and links
            for button in page_data['buttons']:
                button_text = button['text'].lower()
                if any(kw in button_text for kw in login_keywords):
                    analysis['has_login'] = True
                    analysis['potential_functionality'].append({
                        'type': 'login',
                        'element': button,
                        'url': url
                    })
                
                if any(kw in button_text for kw in signup_keywords):
                    analysis['has_signup'] = True
                    analysis['potential_functionality'].append({
                        'type': 'signup',
                        'element': button,
                        'url': url
                    })
        
        # Save analysis
        with open(f"{self.output_dir}/site_analysis.json", 'w', encoding='utf-8') as f:
            json.dump(analysis, f, indent=2, ensure_ascii=False)
        
        return analysis

# Run the crawler
if __name__ == "__main__":
    base_url = "https://www.tribevest.com/"
    crawler = WebsiteCrawler(base_url)
    crawler.crawl(max_pages=10)  # Limit to 10 pages for initial exploration
    analysis = crawler.analyze_structure()
    
    print("\nWebsite Analysis:")
    print(f"Pages crawled: {analysis['page_count']}")
    print(f"Has login functionality: {analysis['has_login']}")
    print(f"Has signup functionality: {analysis['has_signup']}")
    print(f"Has contact form: {analysis['has_contact_form']}")
    
    print("\nNavigation structure:")
    for nav in analysis['navigation_structure']:
        print(f" - {nav['text']}")
    
    print("\nPotential functionality:")
    for func in analysis['potential_functionality']:
        print(f" - {func['type']} at {func['url']}")