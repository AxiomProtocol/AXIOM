export default async function handler(req,res){
  try{
    const ETHERSCAN_API_KEY=process.env.ETHERSCAN_API_KEY;
    const BSCSCAN_API_KEY=process.env.BSCSCAN_API_KEY;
    const ETHEREUM_WALLET=process.env.ETHEREUM_WALLET;
    const BSC_WALLET=process.env.BSC_WALLET;
    const XRP_WALLET=process.env.XRP_WALLET;
    const SUI_WALLET=process.env.SUI_WALLET;

    const wallets=[
      ETHEREUM_WALLET?{chain:"Ethereum",symbol:"ETH",address:ETHEREUM_WALLET, api:(a,k)=>`https://api.etherscan.io/api?module=account&action=balance&address=${a}&tag=latest&apikey=${k}`} : null,
      BSC_WALLET?{chain:"BSC",symbol:"BNB",address:BSC_WALLET, api:(a,k)=>`https://api.bscscan.com/api?module=account&action=balance&address=${a}&tag=latest&apikey=${k}`} : null,
      XRP_WALLET?{chain:"XRP",symbol:"XRP",address:XRP_WALLET, api:(a)=>`https://api.xrpscan.com/api/v1/account/${a}`} : null,
      SUI_WALLET?{chain:"Sui",symbol:"SUI",address:SUI_WALLET, api:(a)=>`https://fullnode.mainnet.sui.io:443/v1/account/${a}/balance`} : null
    ].filter(Boolean);

    if(wallets.length===0) return res.status(204).end();

    const priceRes=await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum,binancecoin,ripple,sui&vs_currencies=usd");
    const prices=await priceRes.json(); const priceMap={ETH:prices.ethereum?.usd||0, BNB:prices.binancecoin?.usd||0, XRP:prices.ripple?.usd||0, SUI:prices.sui?.usd||0};

    const results=[];
    for(const w of wallets){
      let balance=0;
      try{
        if(w.chain==="Ethereum"){ const r=await fetch(w.api(w.address,ETHERSCAN_API_KEY)); const d=await r.json(); balance=Number(d.result)/1e18; }
        else if(w.chain==="BSC"){ const r=await fetch(w.api(w.address,BSCSCAN_API_KEY)); const d=await r.json(); balance=Number(d.result)/1e18; }
        else if(w.chain==="XRP"){ const r=await fetch(w.api(w.address)); const d=await r.json(); balance=(d.account_data?.Balance||0)/1_000_000; }
        else if(w.chain==="Sui"){ const r=await fetch(w.api(w.address)); const d=await r.json(); balance=(d.totalBalance||0)/1e9; }
      }catch(e){balance=0;}
      const usdValue=balance*priceMap[w.symbol];
      results.push({chain:w.chain,address:w.address,symbol:w.symbol,balance:balance.toFixed(4),usdValue});
    }

    return res.json({reserves:results,totalUSD:results.reduce((s,r)=>s+r.usdValue,0)});
  }catch(error){
    console.error("Proof of reserves error:",error);
    return res.status(500).json({error:"Failed to fetch reserves"});
  }
}