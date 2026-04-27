// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title AxiomLandReceipt
 * @notice ERC-1155 land-parcel receipt NFTs. One token ID per land parcel
 *         (mapped to the on-chain asset registry ID). Minted by governance
 *         on deal approval. Per-parcel supply cap of 1,000.
 *         EIP-2981 royalties at 7.5%. OpenSea contractURI().
 */
contract AxiomLandReceipt is ERC1155, IERC2981, AccessControl {
    using Strings for uint256;

    bytes32 public constant MINTER_ROLE    = keccak256("MINTER_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    uint256 public constant ROYALTY_BPS         = 750;
    uint256 public constant DEFAULT_PARCEL_CAP  = 1_000;

    string public name   = "Axiom Land Receipt";
    string public symbol = "AXLAND";

    string public contractMetadataURI;
    string public baseMetadataURI;

    address public royaltyRecipient;

    struct ParcelInfo {
        bytes32 assetRegistryId;
        string  propertyAddress;
        uint256 maxSupply;
        uint256 totalMinted;
        bool    active;
        uint256 registeredAt;
    }

    mapping(uint256 => ParcelInfo) public parcels;
    uint256[] public parcelIds;
    uint256 public deployBlock;

    event ParcelRegistered(uint256 indexed tokenId, bytes32 assetRegistryId, string propertyAddress, uint256 maxSupply);
    event LandReceiptMinted(address indexed to, uint256 indexed tokenId, uint256 amount);
    event BaseURIUpdated(string newURI);
    event ContractURIUpdated(string newURI);

    constructor(
        address admin,
        address minter,
        address royaltyRecipient_,
        string memory baseURI_,
        string memory contractURI_
    ) ERC1155(baseURI_) {
        require(admin != address(0), "AXLAND: zero admin");
        require(royaltyRecipient_ != address(0), "AXLAND: zero royalty");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, minter);
        _grantRole(GOVERNANCE_ROLE, admin);

        royaltyRecipient    = royaltyRecipient_;
        contractMetadataURI = contractURI_;
        baseMetadataURI     = baseURI_;
        deployBlock         = block.number;
    }

    // ── Parcel registry ───────────────────────────────────────────────────────

    function registerParcel(
        uint256 tokenId,
        bytes32 assetRegistryId,
        string calldata propertyAddress,
        uint256 maxSupply_
    ) external onlyRole(GOVERNANCE_ROLE) {
        require(!parcels[tokenId].active, "AXLAND: parcel already registered");
        require(assetRegistryId != bytes32(0), "AXLAND: zero registry ID");

        uint256 cap = maxSupply_ == 0 ? DEFAULT_PARCEL_CAP : maxSupply_;

        parcels[tokenId] = ParcelInfo({
            assetRegistryId: assetRegistryId,
            propertyAddress: propertyAddress,
            maxSupply:       cap,
            totalMinted:     0,
            active:          true,
            registeredAt:    block.timestamp
        });

        parcelIds.push(tokenId);
        emit ParcelRegistered(tokenId, assetRegistryId, propertyAddress, cap);
    }

    // ── Mint ──────────────────────────────────────────────────────────────────

    function mint(address to, uint256 tokenId, uint256 amount) external onlyRole(MINTER_ROLE) {
        ParcelInfo storage parcel = parcels[tokenId];
        require(parcel.active, "AXLAND: parcel not registered");
        require(to != address(0), "AXLAND: mint to zero");
        require(amount > 0, "AXLAND: zero amount");
        require(parcel.totalMinted + amount <= parcel.maxSupply, "AXLAND: parcel cap reached");

        parcel.totalMinted += amount;
        _mint(to, tokenId, amount, "");

        emit LandReceiptMinted(to, tokenId, amount);
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
        require(newRecipient != address(0), "AXLAND: zero recipient");
        royaltyRecipient = newRecipient;
    }

    function setParcelActive(uint256 tokenId, bool active) external onlyRole(GOVERNANCE_ROLE) {
        parcels[tokenId].active = active;
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    function getParcelCount() external view returns (uint256) {
        return parcelIds.length;
    }

    function parcelRemaining(uint256 tokenId) external view returns (uint256) {
        ParcelInfo storage p = parcels[tokenId];
        if (p.maxSupply == 0) return 0;
        return p.maxSupply - p.totalMinted;
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
