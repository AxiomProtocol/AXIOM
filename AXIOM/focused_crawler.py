import requests
from bs4 import BeautifulSoup
import json
import os
from urllib.parse import urljoin

def analyze_tribevest():
    """Analyze the main Tribevest website and key pages"""
    output_dir = "tribevest_analysis"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Set up session with headers
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    })
    
    # Key pages to analyze
    pages = [
        {"url": "https://www.tribevest.com/", "name": "home"},
        {"url": "https://www.tribevest.com/pricing", "name": "pricing"},
        {"url": "https://www.tribevest.com/about", "name": "about"},
        {"url": "https://www.tribevest.com/contact", "name": "contact"},
    ]
    
    site_data = {
        "pages": {},
        "features": [],
        "has_login": False,
        "has_signup": False,
        "login_url": "",
        "signup_url": ""
    }
    
    for page in pages:
        print(f"Analyzing {page['name']} page...")
        try:
            response = session.get(page["url"], timeout=10)
            if response.status_code != 200:
                print(f"Failed to access {page['url']}: Status code {response.status_code}")
                continue
                
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract page data
            page_data = {
                "title": soup.title.text if soup.title else "",
                "headings": [],
                "features": [],
                "buttons": []
            }
            
            # Extract headings
            for h in soup.find_all(['h1', 'h2', 'h3']):
                page_data["headings"].append({
                    "level": h.name,
                    "text": h.get_text(strip=True)
                })
            
            # Look for features
            for section in soup.find_all(['section', 'div'], class_=lambda c: c and ('feature' in c.lower() or 'benefit' in c.lower())):
                feature = {
                    "title": "",
                    "description": ""
                }
                
                heading = section.find(['h2', 'h3', 'h4'])
                if heading:
                    feature["title"] = heading.get_text(strip=True)
                    
                desc = section.find(['p'])
                if desc:
                    feature["description"] = desc.get_text(strip=True)
                
                if feature["title"] or feature["description"]:
                    page_data["features"].append(feature)
                    site_data["features"].append(feature)
            
            # Find login/signup buttons
            for a in soup.find_all('a', href=True):
                text = a.get_text(strip=True).lower()
                href = a['href']
                
                if 'login' in text or 'log in' in text or 'signin' in text:
                    site_data["has_login"] = True
                    site_data["login_url"] = urljoin(page["url"], href)
                    page_data["buttons"].append({
                        "type": "login",
                        "text": text,
                        "url": urljoin(page["url"], href)
                    })
                
                if 'sign up' in text or 'signup' in text or 'register' in text or 'join' in text or 'get started' in text:
                    site_data["has_signup"] = True
                    site_data["signup_url"] = urljoin(page["url"], href)
                    page_data["buttons"].append({
                        "type": "signup",
                        "text": text,
                        "url": urljoin(page["url"], href)
                    })
            
            # Extract pricing if on pricing page
            if page["name"] == "pricing":
                pricing_data = []
                for price_box in soup.find_all(['div'], class_=lambda c: c and ('price' in c.lower() or 'plan' in c.lower() or 'tier' in c.lower())):
                    price_info = {
                        "plan_name": "",
                        "price": "",
                        "features": []
                    }
                    
                    # Find plan name
                    plan_name = price_box.find(['h2', 'h3', 'h4'])
                    if plan_name:
                        price_info["plan_name"] = plan_name.get_text(strip=True)
                    
                    # Find price
                    price_elem = price_box.find(text=lambda t: t and ('$' in t or '/month' in t.lower() or '/year' in t.lower()))
                    if price_elem:
                        price_info["price"] = price_elem.strip()
                    
                    # Find features
                    features_list = price_box.find(['ul'])
                    if features_list:
                        for li in features_list.find_all('li'):
                            price_info["features"].append(li.get_text(strip=True))
                    
                    pricing_data.append(price_info)
                
                page_data["pricing"] = pricing_data
            
            site_data["pages"][page["name"]] = page_data
            
            # Save individual page data
            with open(f"{output_dir}/{page['name']}.json", 'w', encoding='utf-8') as f:
                json.dump(page_data, f, indent=2, ensure_ascii=False)
                
        except Exception as e:
            print(f"Error analyzing {page['url']}: {e}")
    
    # Get login page content if available
    if site_data["login_url"]:
        try:
            print(f"Checking login page: {site_data['login_url']}")
            response = session.get(site_data["login_url"], timeout=10)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                login_data = {
                    "title": soup.title.text if soup.title else "",
                    "form_fields": []
                }
                
                # Extract form fields
                for form in soup.find_all('form'):
                    for field in form.find_all(['input', 'select', 'textarea']):
                        field_type = field.get('type', field.name)
                        field_name = field.get('name', '')
                        placeholder = field.get('placeholder', '')
                        
                        if field_name:
                            login_data["form_fields"].append({
                                "type": field_type,
                                "name": field_name,
                                "placeholder": placeholder
                            })
                
                site_data["login_page"] = login_data
                
                with open(f"{output_dir}/login_page.json", 'w', encoding='utf-8') as f:
                    json.dump(login_data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error analyzing login page: {e}")
    
    # Save summary data
    with open(f"{output_dir}/site_summary.json", 'w', encoding='utf-8') as f:
        json.dump(site_data, f, indent=2, ensure_ascii=False)
    
    return site_data

if __name__ == "__main__":
    print("Analyzing Tribevest website...")
    site_data = analyze_tribevest()
    
    print("\nWebsite Analysis Summary:")
    print(f"Pages analyzed: {len(site_data['pages'])}")
    print(f"Has login functionality: {site_data['has_login']}")
    print(f"Has signup functionality: {site_data['has_signup']}")
    
    if site_data['login_url']:
        print(f"Login URL: {site_data['login_url']}")
    
    if site_data['signup_url']:
        print(f"Signup URL: {site_data['signup_url']}")
    
    print("\nKey features identified:")
    for i, feature in enumerate(site_data['features'][:5], 1):  # Show first 5 features
        if feature.get('title'):
            print(f"{i}. {feature['title']}")