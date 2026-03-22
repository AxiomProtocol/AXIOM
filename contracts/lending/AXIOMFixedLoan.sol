// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title AXIOMFixedLoan
 * @notice ERC-721 loan receipt NFT for the Axiom Lending Fund.
 *         One token is minted per funded loan and held by the borrower
 *         as on-chain proof of the active credit obligation.
 *         The token is burned when the loan reaches terminal status (Repaid or Defaulted).
 *
 * @dev Metadata is fully on-chain (Base64-encoded JSON).
 *      Only the MINTER_ROLE (AXIOMCreditMarket) can mint or burn.
 */
contract AXIOMFixedLoan is ERC721, AccessControl {
    using Strings for uint256;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 private _nextTokenId = 1;

    struct LoanMeta {
        bytes32 loanId;
        address borrower;
        uint256 principalUsd6;   // AXUSD principal (18 decimals)
        uint256 interestRateBps; // annual rate bps
        uint256 termDays;        // term in days
        uint256 issuedAt;        // unix timestamp of funding
        uint256 dueAt;           // unix timestamp of maturity
        string  propertyAddress; // property text
    }

    mapping(uint256 => LoanMeta) private _loanMeta;
    mapping(bytes32 => uint256)  public  loanIdToTokenId;

    event LoanReceiptMinted(uint256 indexed tokenId, bytes32 indexed loanId, address indexed borrower);
    event LoanReceiptBurned(uint256 indexed tokenId, bytes32 indexed loanId);

    error LoanAlreadyHasReceipt(bytes32 loanId);
    error TokenNotFound(uint256 tokenId);

    constructor(address admin) ERC721("Axiom Fixed Loan Receipt", "AXLOAN") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    // ─────────────────────────────────────────────
    // MINTING / BURNING
    // ─────────────────────────────────────────────

    /**
     * @notice Mint a loan receipt NFT to the borrower on funding.
     * @param loanId         Off-chain loan UUID as bytes32.
     * @param borrower       Address to receive the NFT.
     * @param principalUsd6  Loan principal in AXUSD (18 dec).
     * @param rateBps        Annual interest rate in basis points.
     * @param termDays       Loan term in days.
     * @param dueAt          Maturity unix timestamp.
     * @param propAddress    Property address string.
     */
    function mintReceipt(
        bytes32       loanId,
        address       borrower,
        uint256       principalUsd6,
        uint256       rateBps,
        uint256       termDays,
        uint256       dueAt,
        string calldata propAddress
    ) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        if (loanIdToTokenId[loanId] != 0) revert LoanAlreadyHasReceipt(loanId);

        tokenId = _nextTokenId++;
        _safeMint(borrower, tokenId);

        _loanMeta[tokenId] = LoanMeta({
            loanId:          loanId,
            borrower:        borrower,
            principalUsd6:   principalUsd6,
            interestRateBps: rateBps,
            termDays:        termDays,
            issuedAt:        block.timestamp,
            dueAt:           dueAt,
            propertyAddress: propAddress
        });
        loanIdToTokenId[loanId] = tokenId;

        emit LoanReceiptMinted(tokenId, loanId, borrower);
    }

    /**
     * @notice Burn a loan receipt NFT when the loan reaches a terminal state.
     * @param loanId The loan identifier whose receipt should be burned.
     */
    function burnReceipt(bytes32 loanId) external onlyRole(MINTER_ROLE) {
        uint256 tokenId = loanIdToTokenId[loanId];
        if (tokenId == 0) return; // idempotent — no receipt means nothing to burn
        delete loanIdToTokenId[loanId];
        delete _loanMeta[tokenId];
        _burn(tokenId);
        emit LoanReceiptBurned(tokenId, loanId);
    }

    // ─────────────────────────────────────────────
    // METADATA (fully on-chain)
    // ─────────────────────────────────────────────

    /**
     * @notice Returns Base64-encoded JSON metadata for the token.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        LoanMeta storage m = _loanMeta[tokenId];

        string memory principalStr = _formatUsd(m.principalUsd6);
        string memory rateStr      = string.concat((m.interestRateBps / 100).toString(), "%");

        string memory json = string.concat(
            '{"name":"Axiom Fixed Loan #', tokenId.toString(),
            '","description":"On-chain credit obligation recorded by Axiom Lending Fund (SEC Reg D 506(c)).",',
            '"attributes":[',
              '{"trait_type":"Loan ID","value":"', _bytes32ToHex(m.loanId), '"},',
              '{"trait_type":"Principal","value":"', principalStr, '"},',
              '{"trait_type":"Annual Rate","value":"', rateStr, '"},',
              '{"trait_type":"Term (days)","value":"', m.termDays.toString(), '"},',
              '{"trait_type":"Property","value":"', m.propertyAddress, '"},',
              '{"trait_type":"Issued At","value":"', m.issuedAt.toString(), '"},',
              '{"trait_type":"Due At","value":"', m.dueAt.toString(), '"}',
            ']}'
        );

        return string.concat(
            "data:application/json;base64,",
            Base64.encode(bytes(json))
        );
    }

    // ─────────────────────────────────────────────
    // VIEW
    // ─────────────────────────────────────────────

    function getLoanMeta(uint256 tokenId) external view returns (LoanMeta memory) {
        _requireOwned(tokenId);
        return _loanMeta[tokenId];
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, AccessControl) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // ─────────────────────────────────────────────
    // INTERNAL HELPERS
    // ─────────────────────────────────────────────

    function _formatUsd(uint256 amount18) internal pure returns (string memory) {
        uint256 dollars = amount18 / 1e18;
        return string.concat("$", dollars.toString());
    }

    function _bytes32ToHex(bytes32 b) internal pure returns (string memory) {
        bytes memory hexChars = "0123456789abcdef";
        bytes memory result = new bytes(66);
        result[0] = "0";
        result[1] = "x";
        for (uint256 i = 0; i < 32; i++) {
            result[2 + i * 2]     = hexChars[uint8(b[i]) >> 4];
            result[3 + i * 2]     = hexChars[uint8(b[i]) & 0x0f];
        }
        return string(result);
    }
}
