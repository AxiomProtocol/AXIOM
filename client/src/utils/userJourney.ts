/**
 * User Journey Utilities
 * 
 * Handles the progression of the user through the SWF platform,
 * automatically guiding them through the steps.
 */

// User journey state flags in localStorage
const USER_JOURNEY_KEYS = {
  WALLET_CONNECTED: 'swf-wallet-connected',
  FIRST_STAKE_COMPLETED: 'swf-first-stake',
  FIRST_LIQUIDITY_ADDED: 'swf-first-liquidity',
  FIRST_SWAP_COMPLETED: 'swf-first-swap',
  GOVERNANCE_PARTICIPATION: 'swf-governance-participated'
};

// Step identifiers
export enum UserJourneyStep {
  CONNECT_WALLET = 'connect-wallet',
  STAKING = 'staking',
  LIQUIDITY = 'liquidity',
  SWAP = 'swap',
  GOVERNANCE = 'governance',
  COMPLETED = 'completed'
}

/**
 * Mark a step in the user journey as completed
 * @param step The step to mark as completed
 */
export const completeStep = (step: UserJourneyStep): void => {
  switch (step) {
    case UserJourneyStep.CONNECT_WALLET:
      localStorage.setItem(USER_JOURNEY_KEYS.WALLET_CONNECTED, 'true');
      break;
    case UserJourneyStep.STAKING:
      localStorage.setItem(USER_JOURNEY_KEYS.FIRST_STAKE_COMPLETED, 'true');
      break;
    case UserJourneyStep.LIQUIDITY:
      localStorage.setItem(USER_JOURNEY_KEYS.FIRST_LIQUIDITY_ADDED, 'true');
      break;
    case UserJourneyStep.SWAP:
      localStorage.setItem(USER_JOURNEY_KEYS.FIRST_SWAP_COMPLETED, 'true');
      break;
    case UserJourneyStep.GOVERNANCE:
      localStorage.setItem(USER_JOURNEY_KEYS.GOVERNANCE_PARTICIPATION, 'true');
      break;
    default:
      break;
  }
};

/**
 * Determine the current step in the user journey
 * @returns The current step the user should be on
 */
export const getCurrentStep = (): UserJourneyStep => {
  // Check steps in sequence
  if (!localStorage.getItem(USER_JOURNEY_KEYS.WALLET_CONNECTED)) {
    return UserJourneyStep.CONNECT_WALLET;
  }
  
  if (!localStorage.getItem(USER_JOURNEY_KEYS.FIRST_STAKE_COMPLETED)) {
    return UserJourneyStep.STAKING;
  }
  
  if (!localStorage.getItem(USER_JOURNEY_KEYS.FIRST_LIQUIDITY_ADDED)) {
    return UserJourneyStep.LIQUIDITY;
  }
  
  if (!localStorage.getItem(USER_JOURNEY_KEYS.FIRST_SWAP_COMPLETED)) {
    return UserJourneyStep.SWAP;
  }
  
  if (!localStorage.getItem(USER_JOURNEY_KEYS.GOVERNANCE_PARTICIPATION)) {
    return UserJourneyStep.GOVERNANCE;
  }
  
  return UserJourneyStep.COMPLETED;
};

/**
 * Reset the user journey state
 */
export const resetUserJourney = (): void => {
  Object.values(USER_JOURNEY_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};

/**
 * Check if a specific step has been completed
 * @param step The step to check
 * @returns True if the step has been completed
 */
export const isStepCompleted = (step: UserJourneyStep): boolean => {
  switch (step) {
    case UserJourneyStep.CONNECT_WALLET:
      return localStorage.getItem(USER_JOURNEY_KEYS.WALLET_CONNECTED) === 'true';
    case UserJourneyStep.STAKING:
      return localStorage.getItem(USER_JOURNEY_KEYS.FIRST_STAKE_COMPLETED) === 'true';
    case UserJourneyStep.LIQUIDITY:
      return localStorage.getItem(USER_JOURNEY_KEYS.FIRST_LIQUIDITY_ADDED) === 'true';
    case UserJourneyStep.SWAP:
      return localStorage.getItem(USER_JOURNEY_KEYS.FIRST_SWAP_COMPLETED) === 'true';
    case UserJourneyStep.GOVERNANCE:
      return localStorage.getItem(USER_JOURNEY_KEYS.GOVERNANCE_PARTICIPATION) === 'true';
    case UserJourneyStep.COMPLETED:
      return (
        localStorage.getItem(USER_JOURNEY_KEYS.WALLET_CONNECTED) === 'true' &&
        localStorage.getItem(USER_JOURNEY_KEYS.FIRST_STAKE_COMPLETED) === 'true' &&
        localStorage.getItem(USER_JOURNEY_KEYS.FIRST_LIQUIDITY_ADDED) === 'true' &&
        localStorage.getItem(USER_JOURNEY_KEYS.FIRST_SWAP_COMPLETED) === 'true' &&
        localStorage.getItem(USER_JOURNEY_KEYS.GOVERNANCE_PARTICIPATION) === 'true'
      );
    default:
      return false;
  }
};

/**
 * Get the next incomplete step in the user journey
 * @returns The next step that needs to be completed
 */
export const getNextIncompleteStep = (): UserJourneyStep => {
  return getCurrentStep();
};

/**
 * Calculate the user's progress percentage through the journey
 * @returns Progress percentage (0-100)
 */
export const getUserProgressPercentage = (): number => {
  const totalSteps = Object.keys(UserJourneyStep).length / 2 - 1; // Divide by 2 because of enum, subtract 1 to exclude COMPLETED
  let completedSteps = 0;
  
  if (isStepCompleted(UserJourneyStep.CONNECT_WALLET)) completedSteps++;
  if (isStepCompleted(UserJourneyStep.STAKING)) completedSteps++;
  if (isStepCompleted(UserJourneyStep.LIQUIDITY)) completedSteps++;
  if (isStepCompleted(UserJourneyStep.SWAP)) completedSteps++;
  if (isStepCompleted(UserJourneyStep.GOVERNANCE)) completedSteps++;
  
  return Math.round((completedSteps / totalSteps) * 100);
};

/**
 * Hook up event listeners for wallet connection
 * @param walletProvider The wallet provider to listen to
 */
export const setupWalletListeners = (walletProvider: any): void => {
  // Check if wallet is already connected
  if (walletProvider?.isConnected || walletProvider?.connected) {
    completeStep(UserJourneyStep.CONNECT_WALLET);
  }
  
  // Listen for wallet connection
  const handleConnect = () => {
    completeStep(UserJourneyStep.CONNECT_WALLET);
    // Trigger any callbacks or navigation
    const event = new CustomEvent('swf-wallet-connected');
    document.dispatchEvent(event);
  };
  
  // Add event listener for wallet connection
  if (walletProvider) {
    if (walletProvider.on) {
      walletProvider.on('connect', handleConnect);
    } else if (walletProvider.addListener) {
      walletProvider.addListener('connect', handleConnect);
    }
  }
};

/**
 * Register a staking action to move the user to the next step
 */
export const registerStakingAction = (): void => {
  completeStep(UserJourneyStep.STAKING);
  
  // Trigger any callbacks or navigation
  const event = new CustomEvent('swf-staking-completed');
  document.dispatchEvent(event);
};

/**
 * Register liquidity addition to advance the user journey
 */
export const registerLiquidityAddition = (): void => {
  completeStep(UserJourneyStep.LIQUIDITY);
  
  // Trigger any callbacks or navigation
  const event = new CustomEvent('swf-liquidity-added');
  document.dispatchEvent(event);
};

/**
 * Register a token swap to advance the user journey
 */
export const registerSwapAction = (): void => {
  completeStep(UserJourneyStep.SWAP);
  
  // Trigger any callbacks or navigation
  const event = new CustomEvent('swf-swap-completed');
  document.dispatchEvent(event);
};

/**
 * Register governance participation to complete the user journey
 */
export const registerGovernanceAction = (): void => {
  completeStep(UserJourneyStep.GOVERNANCE);
  
  // Trigger any callbacks or navigation
  const event = new CustomEvent('swf-journey-completed');
  document.dispatchEvent(event);
};
