// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title AxiomFounderBadge
 * @notice Soulbound ERC-721 commemorating the first 100 Axiom Protocol wallets.
 *         Non-transferable after mint. On-chain trait seed per token.
 *         OpenSea-compatible: contractURI() + tokenURI() + EIP-2981 royalties.
 * @dev Deployed on Arbitrum One. Metadata served via Axiom metadata API.
 */
contract AxiomFounderBadge is ERC721, IERC2981, AccessControl {
    using Strings for uint256;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public constant MAX_SUPPLY = 100;
    uint256 public constant ROYALTY_BPS = 750;

    string public baseMetadataURI;
    string public contractMetadataURI;
    address public royaltyRecipient;

    uint256 private _totalMinted;

    mapping(uint256 => bytes32) public traitSeed;

    uint256 public deployBlock;

    event BadgeMinted(address indexed to, uint256 indexed tokenId, bytes32 seed);
    event BaseURIUpdated(string newURI);
    event ContractURIUpdated(string newURI);
    event RoyaltyRecipientUpdated(address indexed newRecipient);

    constructor(
        address admin,
        address minter,
        address royaltyRecipient_,
        string memory baseURI_,
        string memory contractURI_
    ) ERC721("Axiom Founder Badge", "AXFB") {
        require(admin != address(0), "AXFB: zero admin");
        require(royaltyRecipient_ != address(0), "AXFB: zero royalty");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, minter);

        royaltyRecipient = royaltyRecipient_;
        baseMetadataURI = baseURI_;
        contractMetadataURI = contractURI_;
        deployBlock = block.number;
    }

    // ── Mint ──────────────────────────────────────────────────────────────────

    function mint(address to, uint256 tokenId) external onlyRole(MINTER_ROLE) {
        require(_totalMinted < MAX_SUPPLY, "AXFB: supply cap reached");
        require(tokenId >= 1 && tokenId <= MAX_SUPPLY, "AXFB: tokenId out of range");
        require(to != address(0), "AXFB: mint to zero");

        bytes32 seed = keccak256(abi.encodePacked(tokenId, address(this), deployBlock, to));
        traitSeed[tokenId] = seed;

        _totalMinted++;
        _safeMint(to, tokenId);

        emit BadgeMinted(to, tokenId, seed);
    }

    // ── Soulbound: block all transfers ────────────────────────────────────────

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0), "AXFB: soulbound - non-transferable");
        return super._update(to, tokenId, auth);
    }

    // ── Metadata ──────────────────────────────────────────────────────────────

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string(abi.encodePacked(baseMetadataURI, tokenId.toString(), "?contract=", Strings.toHexString(address(this))));
    }

    function contractURI() public view returns (string memory) {
        return contractMetadataURI;
    }

    // ── EIP-2981 Royalties ────────────────────────────────────────────────────

    function royaltyInfo(uint256, uint256 salePrice) external view override returns (address, uint256) {
        return (royaltyRecipient, (salePrice * ROYALTY_BPS) / 10_000);
    }

    // ── ERC-4906 Metadata refresh ─────────────────────────────────────────────

    event MetadataUpdate(uint256 _tokenId);

    function emitMetadataUpdate(uint256 tokenId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit MetadataUpdate(tokenId);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setBaseURI(string calldata newURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        baseMetadataURI = newURI;
        emit BaseURIUpdated(newURI);
    }

    function setContractURI(string calldata newURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        contractMetadataURI = newURI;
        emit ContractURIUpdated(newURI);
    }

    function setRoyaltyRecipient(address newRecipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newRecipient != address(0), "AXFB: zero recipient");
        royaltyRecipient = newRecipient;
        emit RoyaltyRecipientUpdated(newRecipient);
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    function totalMinted() external view returns (uint256) {
        return _totalMinted;
    }

    function remaining() external view returns (uint256) {
        return MAX_SUPPLY - _totalMinted;
    }

    // ── Interface support ─────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, IERC165, AccessControl)
        returns (bool)
    {
        return
            interfaceId == type(IERC2981).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
