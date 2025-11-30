import requests
import trafilatura

def get_bscscan_token_data(contract_address):
    """
    Get token data from BSCScan for the verified contract
    """
    url = f"https://bscscan.com/token/{contract_address}"
    
    try:
        # Fetch the page content
        downloaded = trafilatura.fetch_url(url)
        text = trafilatura.extract(downloaded)
        
        print(f"BSCScan data for contract {contract_address}:")
        print("="*50)
        print(text)
        
    except Exception as e:
        print(f"Error fetching BSCScan data: {e}")

if __name__ == "__main__":
    contract_address = "0x83E17aeB148d9b4b7Be0Be7C87dd73531a5a5738"
    get_bscscan_token_data(contract_address)