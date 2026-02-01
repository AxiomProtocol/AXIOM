export const LandOptionRegistryABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "optionId", "type": "uint256"}],
    "name": "getOptionCore",
    "outputs": [{"components": [
      {"internalType": "uint256", "name": "optionId", "type": "uint256"},
      {"internalType": "uint256", "name": "acreage", "type": "uint256"},
      {"internalType": "uint256", "name": "purchasePrice", "type": "uint256"},
      {"internalType": "uint256", "name": "optionFee", "type": "uint256"},
      {"internalType": "uint256", "name": "optionPeriodDays", "type": "uint256"},
      {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
      {"internalType": "uint256", "name": "expiresAt", "type": "uint256"},
      {"internalType": "uint8", "name": "status", "type": "uint8"}
    ], "internalType": "struct LandOptionRegistry.LandOptionCore", "name": "", "type": "tuple"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "optionId", "type": "uint256"}],
    "name": "getOptionMeta",
    "outputs": [{"components": [
      {"internalType": "string", "name": "parcelId", "type": "string"},
      {"internalType": "string", "name": "location", "type": "string"},
      {"internalType": "string", "name": "ipfsMetadata", "type": "string"},
      {"internalType": "address", "name": "landowner", "type": "address"},
      {"internalType": "address", "name": "steward", "type": "address"},
      {"internalType": "uint256", "name": "totalShares", "type": "uint256"},
      {"internalType": "uint256", "name": "sharesSold", "type": "uint256"},
      {"internalType": "uint256", "name": "minInvestment", "type": "uint256"},
      {"internalType": "uint256", "name": "maxInvestment", "type": "uint256"},
      {"internalType": "bool", "name": "regCFCompliant", "type": "bool"}
    ], "internalType": "struct LandOptionRegistry.LandOptionMeta", "name": "", "type": "tuple"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "optionId", "type": "uint256"}, {"internalType": "address", "name": "investor", "type": "address"}],
    "name": "getShareHolder",
    "outputs": [{"components": [
      {"internalType": "uint256", "name": "shares", "type": "uint256"},
      {"internalType": "uint256", "name": "investedAmount", "type": "uint256"},
      {"internalType": "bool", "name": "kycVerified", "type": "bool"},
      {"internalType": "uint256", "name": "purchaseDate", "type": "uint256"}
    ], "internalType": "struct LandOptionRegistry.ShareHolder", "name": "", "type": "tuple"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "optionId", "type": "uint256"}],
    "name": "getInvestorCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextOptionId",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "optionId", "type": "uint256"}, {"internalType": "uint256", "name": "shareAmount", "type": "uint256"}],
    "name": "purchaseShares",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const LandAcquisitionPoolABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "poolId", "type": "uint256"}],
    "name": "getPool",
    "outputs": [{"components": [
      {"internalType": "uint256", "name": "poolId", "type": "uint256"},
      {"internalType": "uint256", "name": "landOptionId", "type": "uint256"},
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "uint256", "name": "targetAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "monthlyContribution", "type": "uint256"},
      {"internalType": "uint256", "name": "memberLimit", "type": "uint256"},
      {"internalType": "uint256", "name": "memberCount", "type": "uint256"},
      {"internalType": "uint256", "name": "totalContributed", "type": "uint256"},
      {"internalType": "uint256", "name": "cycleCount", "type": "uint256"},
      {"internalType": "uint256", "name": "currentCycle", "type": "uint256"},
      {"internalType": "uint8", "name": "status", "type": "uint8"},
      {"internalType": "address", "name": "steward", "type": "address"}
    ], "internalType": "struct LandAcquisitionPool.Pool", "name": "", "type": "tuple"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "poolId", "type": "uint256"}, {"internalType": "address", "name": "user", "type": "address"}],
    "name": "getMember",
    "outputs": [{"components": [
      {"internalType": "uint256", "name": "totalContributed", "type": "uint256"},
      {"internalType": "uint256", "name": "cyclesCompleted", "type": "uint256"},
      {"internalType": "uint256", "name": "joinDate", "type": "uint256"},
      {"internalType": "bool", "name": "active", "type": "bool"}
    ], "internalType": "struct LandAcquisitionPool.Member", "name": "", "type": "tuple"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextPoolId",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "poolId", "type": "uint256"}],
    "name": "joinPool",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "poolId", "type": "uint256"}],
    "name": "contribute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const RegCFCrowdfundingABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "campaignId", "type": "uint256"}],
    "name": "getCampaign",
    "outputs": [{"components": [
      {"internalType": "uint256", "name": "campaignId", "type": "uint256"},
      {"internalType": "uint256", "name": "landOptionId", "type": "uint256"},
      {"internalType": "string", "name": "title", "type": "string"},
      {"internalType": "uint256", "name": "targetAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "minInvestment", "type": "uint256"},
      {"internalType": "uint256", "name": "maxInvestment", "type": "uint256"},
      {"internalType": "uint256", "name": "raisedAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "investorCount", "type": "uint256"},
      {"internalType": "uint256", "name": "startDate", "type": "uint256"},
      {"internalType": "uint256", "name": "endDate", "type": "uint256"},
      {"internalType": "uint8", "name": "status", "type": "uint8"},
      {"internalType": "address", "name": "issuer", "type": "address"}
    ], "internalType": "struct RegCFCrowdfunding.Campaign", "name": "", "type": "tuple"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getInvestor",
    "outputs": [{"components": [
      {"internalType": "uint256", "name": "totalInvested", "type": "uint256"},
      {"internalType": "uint256", "name": "annualIncome", "type": "uint256"},
      {"internalType": "bool", "name": "kycComplete", "type": "bool"},
      {"internalType": "bool", "name": "accredited", "type": "bool"}
    ], "internalType": "struct RegCFCrowdfunding.Investor", "name": "", "type": "tuple"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextCampaignId",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalPlatformRaised",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "campaignId", "type": "uint256"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "invest",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const BuilderFarmerCreditABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "applicationId", "type": "uint256"}],
    "name": "getApplication",
    "outputs": [{"components": [
      {"internalType": "uint256", "name": "applicationId", "type": "uint256"},
      {"internalType": "address", "name": "borrower", "type": "address"},
      {"internalType": "uint8", "name": "creditType", "type": "uint8"},
      {"internalType": "uint256", "name": "requestedAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "approvedAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "interestRateBps", "type": "uint256"},
      {"internalType": "uint256", "name": "termMonths", "type": "uint256"},
      {"internalType": "uint256", "name": "collateralValue", "type": "uint256"},
      {"internalType": "uint8", "name": "status", "type": "uint8"},
      {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
      {"internalType": "uint256", "name": "approvedAt", "type": "uint256"},
      {"internalType": "uint256", "name": "fundedAt", "type": "uint256"}
    ], "internalType": "struct BuilderFarmerCredit.CreditApplication", "name": "", "type": "tuple"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "loanId", "type": "uint256"}],
    "name": "getLoan",
    "outputs": [{"components": [
      {"internalType": "uint256", "name": "loanId", "type": "uint256"},
      {"internalType": "uint256", "name": "applicationId", "type": "uint256"},
      {"internalType": "address", "name": "borrower", "type": "address"},
      {"internalType": "uint256", "name": "principal", "type": "uint256"},
      {"internalType": "uint256", "name": "interestRateBps", "type": "uint256"},
      {"internalType": "uint256", "name": "termMonths", "type": "uint256"},
      {"internalType": "uint256", "name": "monthlyPayment", "type": "uint256"},
      {"internalType": "uint256", "name": "totalRepaid", "type": "uint256"},
      {"internalType": "uint256", "name": "paymentsCompleted", "type": "uint256"},
      {"internalType": "uint256", "name": "nextPaymentDue", "type": "uint256"},
      {"internalType": "bool", "name": "active", "type": "bool"}
    ], "internalType": "struct BuilderFarmerCredit.Loan", "name": "", "type": "tuple"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint8", "name": "creditType", "type": "uint8"}],
    "name": "getCreditTier",
    "outputs": [{"components": [
      {"internalType": "uint256", "name": "maxLTV", "type": "uint256"},
      {"internalType": "uint256", "name": "interestRateBps", "type": "uint256"},
      {"internalType": "uint256", "name": "maxTermMonths", "type": "uint256"},
      {"internalType": "uint256", "name": "minCollateralValue", "type": "uint256"}
    ], "internalType": "struct BuilderFarmerCredit.CreditTier", "name": "", "type": "tuple"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "borrower", "type": "address"}],
    "name": "getBorrowerApplications",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "borrower", "type": "address"}],
    "name": "getBorrowerLoans",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextApplicationId",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextLoanId",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint8", "name": "creditType", "type": "uint8"},
      {"internalType": "uint256", "name": "requestedAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "collateralValue", "type": "uint256"},
      {"internalType": "uint256", "name": "termMonths", "type": "uint256"}
    ],
    "name": "submitApplication",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "loanId", "type": "uint256"}],
    "name": "makePayment",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
