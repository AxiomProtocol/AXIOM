// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "../interfaces/IModularCompliance.sol";
import "../interfaces/IModule.sol";

contract ModularCompliance is IModularCompliance, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    address internal _tokenBound;
    address[] internal _modules;
    mapping(address => bool) internal _moduleBound;

    uint256 public constant MAX_MODULES = 25;

    modifier onlyToken() {
        require(msg.sender == _tokenBound, "NOT_TOKEN");
        _;
    }

    constructor() {
        _disableInitializers();
    }

    function initialize() external initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function bindToken(address _token) external override onlyOwner {
        require(_token != address(0), "ZERO_TOKEN");
        require(_tokenBound == address(0), "TOKEN_ALREADY_BOUND");
        _tokenBound = _token;
        emit TokenBound(_token);
    }

    function unbindToken(address _token) external override onlyOwner {
        require(_token == _tokenBound, "TOKEN_NOT_BOUND");
        _tokenBound = address(0);
        emit TokenUnbound(_token);
    }

    function addModule(address _module) external override onlyOwner nonReentrant {
        require(_module != address(0), "ZERO_MODULE");
        require(_module.code.length > 0, "MODULE_NOT_CONTRACT");
        require(!_moduleBound[_module], "MODULE_ALREADY_BOUND");
        require(_modules.length < MAX_MODULES, "MAX_MODULES_REACHED");
        _modules.push(_module);
        _moduleBound[_module] = true;
        IModule(_module).bindCompliance(address(this));
        emit ModuleAdded(_module);
    }

    function removeModule(address _module) external override onlyOwner nonReentrant {
        require(_moduleBound[_module], "MODULE_NOT_BOUND");
        _moduleBound[_module] = false;
        for (uint256 i = 0; i < _modules.length; i++) {
            if (_modules[i] == _module) {
                _modules[i] = _modules[_modules.length - 1];
                _modules.pop();
                break;
            }
        }
        IModule(_module).unbindCompliance(address(this));
        emit ModuleRemoved(_module);
    }

    function getModules() external view override returns (address[] memory) {
        return _modules;
    }

    function isModuleBound(address _module) external view override returns (bool) {
        return _moduleBound[_module];
    }

    function canTransfer(address _from, address _to, uint256 _value) external view override returns (bool) {
        for (uint256 i = 0; i < _modules.length; i++) {
            if (!IModule(_modules[i]).moduleCheck(_from, _to, _value, address(this))) {
                return false;
            }
        }
        return true;
    }

    function transferred(address _from, address _to, uint256 _value) external override onlyToken {
        for (uint256 i = 0; i < _modules.length; i++) {
            IModule(_modules[i]).moduleTransferAction(_from, _to, _value, address(this));
        }
    }

    function created(address _to, uint256 _value) external override onlyToken {
        for (uint256 i = 0; i < _modules.length; i++) {
            IModule(_modules[i]).moduleMintAction(_to, _value, address(this));
        }
    }

    function destroyed(address _from, uint256 _value) external override onlyToken {
        for (uint256 i = 0; i < _modules.length; i++) {
            IModule(_modules[i]).moduleBurnAction(_from, _value, address(this));
        }
    }

    function getTokenBound() external view override returns (address) {
        return _tokenBound;
    }
}
