// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract Erc20Mock is ERC20, ERC20Burnable {
    uint8 private _decimals;

    constructor(string memory name, string memory symbol, uint256 amount, uint8 decimals_) ERC20(name, symbol) {
        _mint(msg.sender, amount);
        _decimals = decimals_;
    }    

    function decimals() public view override returns (uint8) {
        return _decimals;
    }
}
