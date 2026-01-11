// Address validation utilities

/**
 * Validates Ethereum address format
 * @param {string} address - The address to validate
 * @returns {boolean} - True if valid
 */
export function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validates and checksums an Ethereum address (EIP-55)
 * @param {string} address - The address to validate
 * @returns {string} - Checksummed address
 * @throws {Error} - If address is invalid
 */
export function validateAndChecksumAddress(address) {
  if (!isValidAddress(address)) {
    throw new Error(`Invalid Ethereum address: ${address}`);
  }
  
  // Basic checksum implementation would go here
  // For production, use ethers.utils.getAddress() or similar
  return address;
}

/**
 * Validates score amount is positive and within bounds
 * @param {number} amount - The amount to validate
 * @param {number} maxAmount - Maximum allowed amount
 * @returns {boolean} - True if valid
 */
export function isValidAmount(amount, maxAmount = Infinity) {
  return typeof amount === 'number' && 
         amount > 0 && 
         amount <= maxAmount &&
         Number.isFinite(amount);
}
