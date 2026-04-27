// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title AxiomParticipation
 * @notice ERC-1155 multi-edition participation badges. One token ID per
 *         protocol action type: identity registration, Wealth Practice join,
 *         governance participation, property deal involvement, etc.
 *         Role-gated mint. EIP-2981 royalties. OpenSea contractURI().
 */
contract AxiomParticipation is ERC1155, IERC2981, AccessControl {
    using Strings for uint256;

    bytes32 public constant MINTER_ROLE  = keccak256("MINTER_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    uint256 public constant ROYALTY_BPS = 750;

    string public name     = "Axiom Participation";
    string public symbol   = "AXPART";

    string public contractMetadataURI;
    string public baseMetadataURI;

    address public royaltyRecipient;

    mapping(uint256 => uint256) public totalSupply;
    mapping(uint256 => uint256) public maxSupply;
    mapping(uint256 => string)  public tokenName;
    mapping(uint256 => bool)    public tokenActive;

    uint256 public deployBlock;

    event TokenTypeRegistered(uint256 indexed tokenId, string name_, uint256 maxSupply_);
    event ParticipationMinted(address indexed to, uint256 indexed tokenId, uint256 amount);
    event BaseURIUpdated(string newURI);
    event ContractURIUpdated(string newURI);

    constructor(
        address admin,
        address minter,
        address royaltyRecipient_,
        string memory baseURI_,
        string memory contractURI_
    ) ERC1155(baseURI_) {
        require(admin != address(0), "AXPART: zero admin");
        require(royaltyRecipient_ != address(0), "AXPART: zero royalty");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, minter);
        _grantRole(MANAGER_ROLE, admin);

        royaltyRecipient    = royaltyRecipient_;
        contractMetadataURI = contractURI_;
        baseMetadataURI     = baseURI_;
        deployBlock         = block.number;

        _registerDefaultTokenTypes();
    }

    // ── Token type management ─────────────────────────────────────────────────

    function _registerDefaultTokenTypes() internal {
        _registerType(1, "Identity Registration",  10_000);
        _registerType(2, "Wealth Practice Member",  5_000);
        _registerType(3, "Governance Participant",  2_500);
        _registerType(4, "Property Deal Participant", 1_000);
        _registerType(5, "AXAU Early Adopter",        500);
        _registerType(6, "Founder Circle",            100);
    }

    function _registerType(uint256 id, string memory name_, uint256 max_) internal {
        tokenName[id]   = name_;
        maxSupply[id]   = max_;
        tokenActive[id] = true;
        emit TokenTypeRegistered(id, name_, max_);
    }

    function registerTokenType(
        uint256 id,
        string calldata name_,
        uint256 max_
    ) external onlyRole(MANAGER_ROLE) {
        require(bytes(tokenName[id]).length == 0, "AXPART: type already registered");
        _registerType(id, name_, max_);
    }

    // ── Mint ──────────────────────────────────────────────────────────────────

    function mint(address to, uint256 tokenId, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(tokenActive[tokenId], "AXPART: token type not active");
        require(to != address(0), "AXPART: mint to zero");
        require(amount > 0, "AXPART: zero amount");

        if (maxSupply[tokenId] > 0) {
            require(totalSupply[tokenId] + amount <= maxSupply[tokenId], "AXPART: max supply reached");
        }

        totalSupply[tokenId] += amount;
        _mint(to, tokenId, amount, "");

        emit ParticipationMinted(to, tokenId, amount);
    }

    function mintBatch(
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) external onlyRole(MINTER_ROLE) {
        require(ids.length == amounts.length, "AXPART: length mismatch");
        for (uint256 i = 0; i < ids.length; i++) {
            require(tokenActive[ids[i]], "AXPART: token type not active");
            if (maxSupply[ids[i]] > 0) {
                require(totalSupply[ids[i]] + amounts[i] <= maxSupply[ids[i]], "AXPART: max supply reached");
            }
            totalSupply[ids[i]] += amounts[i];
        }
        _mintBatch(to, ids, amounts, "");
    }

    // ── Metadata ──────────────────────────────────────────────────────────────

    function uri(uint256 tokenId) public view override returns (string memory) {
        return string(abi.encodePacked(
            baseMetadataURI,
            tokenId.toString(),
            "?contract=",
            Strings.toHexString(address(this))
        ));
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
        require(newRecipient != address(0), "AXPART: zero recipient");
        royaltyRecipient = newRecipient;
    }

    function setTokenActive(uint256 tokenId, bool active) external onlyRole(MANAGER_ROLE) {
        tokenActive[tokenId] = active;
    }

    // ── Interface support ─────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC1155, IERC165, AccessControl)
        returns (bool)
    {
        return
            interfaceId == type(IERC2981).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
