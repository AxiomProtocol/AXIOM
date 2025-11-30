// SPDX-License-Identifier: EPL-1.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title SWFToken - Sovran Wealth Fund Token
 * @dev Advanced ERC20 token with real estate tokenization, gold backing, and airdrop functionality
 * Successfully verified on BSCScan on 2025-06-14
 */
contract SWFToken is ERC20Burnable, Ownable {
    using Address for address;

    bytes32 public merkleRoot;
    mapping(address => bool) public airdropClaimed;

    struct RealEstateAsset {
        string propertyId;
        string location;
        uint256 valuation;
        uint256 backingTokens;
    }

    mapping(uint256 => RealEstateAsset) public tokenizedAssets;
    uint256 public nextTokenizedAssetId;

    struct GoldCertificate {
        uint256 grams;
        string certificateId;
    }

    mapping(address => GoldCertificate) public kinesisBacked;

    constructor() ERC20("Sovran Wealth Fund", "SWF") Ownable(msg.sender) {
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function claimAirdrop(bytes32[] calldata proof, uint256 amount) external {
        require(!airdropClaimed[msg.sender], "Already claimed");
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));
        require(MerkleProof.verify(proof, merkleRoot, leaf), "Invalid proof");
        _mint(msg.sender, amount);
        airdropClaimed[msg.sender] = true;
    }

    function setMerkleRoot(bytes32 newRoot) external onlyOwner {
        merkleRoot = newRoot;
    }

    function assignGoldBacking(address user, uint256 grams, string calldata certId) external onlyOwner {
        kinesisBacked[user] = GoldCertificate(grams, certId);
    }

    function tokenizeRealEstate(string calldata propertyId, string calldata location, uint256 valuation, uint256 backingAmount) external onlyOwner {
        tokenizedAssets[nextTokenizedAssetId] = RealEstateAsset(propertyId, location, valuation, backingAmount);
        nextTokenizedAssetId++;
    }

    function getGoldBacking(address user) external view returns (uint256 grams, string memory certId) {
        GoldCertificate memory cert = kinesisBacked[user];
        return (cert.grams, cert.certificateId);
    }

    function getRealEstateAsset(uint256 assetId) external view returns (string memory, string memory, uint256, uint256) {
        RealEstateAsset memory asset = tokenizedAssets[assetId];
        return (asset.propertyId, asset.location, asset.valuation, asset.backingTokens);
    }

    function rescueTokens(address to, uint256 amount) external onlyOwner {
        _transfer(address(this), to, amount);
    }
}