import requests
import trafilatura
import json
import os
from bs4 import BeautifulSoup
import time

def crawl_tribevest_focused():
    """
    Focused crawl of key Tribevest pages with shorter timeouts
    """
    # Target specific important pages
    target_urls = [
        "https://www.tribevest.com/",
        "https://www.tribevest.com/how-it-works",
        "https://www.tribevest.com/features",
        "https://www.tribevest.com/pricing",
        "https://www.tribevest.com/about",
        "https://www.tribevest.com/investor-groups",
        "https://www.tribevest.com/business-account"
    ]
    
    crawled_data = {}
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    for url in target_urls:
        try:
            print(f"Crawling: {url}")
            
            # Shorter timeout
            response = requests.get(url, headers=headers, timeout=5)
            
            if response.status_code == 200:
                # Extract content
                text_content = trafilatura.extract(response.text)
                
                # Get title and meta
                soup = BeautifulSoup(response.text, 'html.parser')
                title = soup.find('title')
                title_text = title.get_text().strip() if title else "No title"
                
                meta_desc = soup.find('meta', attrs={'name': 'description'})
                description = meta_desc.get('content', '').strip() if meta_desc else ""
                
                crawled_data[url] = {
                    'title': title_text,
                    'description': description,
                    'content': text_content or "No content extracted",
                    'status': 'success'
                }
                
                print(f"✓ Successfully crawled: {title_text}")
            else:
                print(f"✗ Failed to access {url} - Status: {response.status_code}")
                crawled_data[url] = {
                    'title': "Access Failed",
                    'description': f"HTTP {response.status_code}",
                    'content': f"Failed to access - Status code: {response.status_code}",
                    'status': 'error'
                }
                
        except Exception as e:
            print(f"✗ Error crawling {url}: {str(e)}")
            crawled_data[url] = {
                'title': "Error",
                'description': "Failed to crawl",
                'content': f"Error: {str(e)}",
                'status': 'error'
            }
        
        # Short delay between requests
        time.sleep(0.5)
    
    return crawled_data

if __name__ == "__main__":
    print("Starting focused Tribevest crawl...")
    
    # Create directory for crawled data
    os.makedirs('crawled_data', exist_ok=True)
    
    # Crawl the website
    crawled_data = crawl_tribevest_focused()
    
    # Save the data
    with open('crawled_data/tribevest_focused_data.json', 'w', encoding='utf-8') as f:
        json.dump(crawled_data, f, indent=2, ensure_ascii=False)
    
    # Print summary
    successful = [data for data in crawled_data.values() if data['status'] == 'success']
    failed = [data for data in crawled_data.values() if data['status'] == 'error']
    
    print(f"\nCrawl Summary:")
    print(f"Total pages attempted: {len(crawled_data)}")
    print(f"Successful: {len(successful)}")
    print(f"Failed: {len(failed)}")
    
    print(f"\nSuccessfully crawled pages:")
    for url, data in crawled_data.items():
        if data['status'] == 'success':
            print(f"- {data['title']}")
    
    print(f"\nData saved to crawled_data/tribevest_focused_data.json")