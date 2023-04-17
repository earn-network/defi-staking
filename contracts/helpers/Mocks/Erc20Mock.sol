// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract Erc20Mock is ERC20, ERC20Burnable {
    constructor(string memory name, string memory symbol, uint256 amount) ERC20(name, symbol) {
        _mint(msg.sender, amount);
    }    
}
