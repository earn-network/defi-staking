// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../IMYCStakingFactory.sol";
import "../IMYCStakingPool.sol";

struct StakingPool {
    address tokenAddress; // staking token address
    address owner; // owner of pool
    uint256 dateStart; // start date for all pools
    uint256 dateEnd; // end date for all pools
    bool rescued; // if unused rewards are withdrawn by owner
    uint256 mycFeesWithdrawn; // withdrawn myc fees
}

struct StakingPlan {
    uint256 duration; // for how long user cannot unstake (seconds)
    uint256 maxTokensBeStaked; // maximum amount that can be staked amoung all stakers
    uint256 availableTokensBeStaked; // available tokens amount can be staked by user
    uint256 rewardsPool; // reward pool
    uint256 rewardsWithdrawn; // how many rewards withdrawn by stakers
    uint256 mycFeesPool; //myc fees pools
    uint256 maxStakingAmount; //max staking amount
}

struct UserStake {
    uint256 stakeDate;
    uint256 amount;
}

/// @title Locked Staking by MyCointainer
/// @notice Stake ERC20 tokens for rewards
contract LockedStaking is IMYCStakingPool {
    /**
     * @dev Emitted when `staker` stakes tokens for `stakingPlanId`
     */
    event Staked(
        address indexed staker,
        uint256 indexed stakingPlanId,
        uint256 amount,
        uint256 unstakeDate
    );

    /**
     * @dev Emitted when `staker` unstakes tokens for `stakingPlanId`
     */
    event Unstaked(
        address indexed staker,
        uint256 indexed stakingPlanId,
        uint256 amount,
        uint256 reward
    );

    /**
     * @dev Emitted when `staker` unstakes tokens wtih penalty(before staking period ends)
     */
    event UnstakedWithPenalty(
        address indexed staker,
        uint256 indexed stakingPlanId,
        uint256 staked,
        uint256 withdrawn
    );

    error OnlyFactory();
    error StakeAlreadyExists();
    error NoSlotsAvailable();
    error StakeNotFound();
    error EndOfStakeNotReached();
    error StakingPeriodNotEnded();
    error NothingToWithdraw();
    error DateInFuture();
    error DateInPast();
    error NoTokensAvailableToStake();
    error AmountCantBeZero();
    error AlreadyRescued();
    error MaxStakingAmountExceed();

    StakingPool internal _stakePool;
    mapping(address => mapping(uint256 => UserStake)) internal _userStake;
    StakingPlan[] internal _plans;
    IMYCStakingFactory internal _factory;
    uint256 internal _withdrawnMYCSlots;

    /**
     * @dev Plans length
     */
    function getPlansLength() external view returns (uint256) {
        return _plans.length;
    }

    /**
     * @dev Returns factory address
     */
    function factory() external view returns (address) {
        return address(_factory);
    }

    /**
     * @dev Returns plans
     */
    function getPlans() external view returns (StakingPlan[] memory) {
        StakingPlan[] memory plans = new StakingPlan[](_plans.length);
        plans = _plans;
        return plans;
    }

    /**
     * @dev Returns `planId` plan
     */
    function getPlan(
        uint256 planId
    ) external view returns (StakingPlan memory) {
        return _plans[planId];
    }

    /**
     * @dev Returns {StakingPool} info
     */
    function stakingPool() external view returns (StakingPool memory) {
        return _stakePool;
    }

    /**
     * @dev Returns stake info for each plan for staker
     */
    function stakesInfoOf(
        address staker
    ) external view returns (UserStake[] memory) {
        uint256 len = _plans.length;
        UserStake[] memory stakes = new UserStake[](len);
        for (uint256 i = 0; i < len; i++) {
            stakes[i] = _userStake[staker][i];
        }
        return stakes;
    }

    /**
     * @dev Returns stake info for `staker` and `planId`
     */
    function stakeInfoOf(
        address staker,
        uint256 planId
    ) external view returns (UserStake memory) {
        return _userStake[staker][planId];
    }

    constructor(
        address tokenAddress, // staking token address
        address owner, // owner of pool
        uint256[] memory durations, // for how long user cannot unstake
        uint256[] memory maxTokensBeStaked, // maximum amount that can be staked amoung all stakers for each duration
        uint256[] memory rewardsPool, // reward pool for each duration
        uint256[] memory mycFeesPool, //myc fees pools for each duration
        uint256[] memory maxStakingAmount, //max staking amount
        uint256 dateStart, // start date for all pools
        uint256 dateEnd // end date for all pools
    ) {
        //saving pool info
        StakingPool memory newConfig = StakingPool({
            tokenAddress: tokenAddress,
            owner: owner,
            dateStart: dateStart,
            dateEnd: dateEnd,
            rescued: false,
            mycFeesWithdrawn: 0
        });
        _stakePool = newConfig;

        //saving _plans
        uint256 len = durations.length;
        for (uint256 i = 0; i < len; i++) {
            StakingPlan memory newStakingPlan = StakingPlan({
                duration: durations[i],
                maxTokensBeStaked: maxTokensBeStaked[i],
                availableTokensBeStaked: maxTokensBeStaked[i],
                rewardsPool: rewardsPool[i],
                rewardsWithdrawn: 0,
                mycFeesPool: mycFeesPool[i],
                maxStakingAmount: maxStakingAmount[i]
            });
            _plans.push(newStakingPlan);
        }

        _factory = IMYCStakingFactory(msg.sender);
    }

    function _checkDateInFutureOrZero(uint256 date) internal view {
        if (date == 0) {
            return;
        }
        if (date < block.timestamp) revert DateInPast();
    }

    function _checkDateInPastOrZero(uint256 date) internal view {
        if (date == 0) {
            return;
        }
        if (date > block.timestamp) revert DateInFuture();
    }

    function _checkPlanAvailability(
        StakingPlan memory plan,
        uint256 amountToStake
    ) internal pure returns (uint256) {
        if (plan.availableTokensBeStaked == 0) {
            revert NoTokensAvailableToStake();
        } else if (plan.availableTokensBeStaked < amountToStake) {
            return plan.availableTokensBeStaked;
        } else {
            return amountToStake;
        }
    }

    /**
     * @dev Stakes tokens
     */
    function stake(uint256 amount, uint256 stakingPlanId) external {
        if (amount == 0) {
            revert AmountCantBeZero();
        }
        UserStake memory uStake = _userStake[msg.sender][stakingPlanId];

        //only one active stake for each plan per staker
        if (uStake.stakeDate != 0) revert StakeAlreadyExists();

        StakingPool memory sp = _stakePool;

        //check start and end date
        _checkDateInPastOrZero(sp.dateStart);
        _checkDateInFutureOrZero(sp.dateEnd);

        //check availability to stake such amount, decreasing amount to max available
        StakingPlan memory plan = _plans[stakingPlanId];
        amount = _checkPlanAvailability(plan, amount);

        //check max staking amount
        if (amount > plan.maxStakingAmount) {
            revert MaxStakingAmountExceed();
        }

        //transfering tokens to smart contract - allowance needed
        IERC20(sp.tokenAddress).transferFrom(msg.sender, address(this), amount);

        //store stake data for user
        _userStake[msg.sender][stakingPlanId] = UserStake({
            stakeDate: block.timestamp,
            amount: amount
        });

        //decreasing available amount to stake for plan
        _plans[stakingPlanId].availableTokensBeStaked -= amount;

        //emit event
        emit Staked(
            msg.sender,
            stakingPlanId,
            amount,
            block.timestamp + plan.duration
        );
    }

    function _calculateReward(
        StakingPlan memory plan,
        uint256 stakedOnPlan
    ) internal pure returns (uint256) {
        return (plan.rewardsPool * stakedOnPlan) / plan.maxTokensBeStaked;
    }

    /**
     * @dev Unstakes tokens on selected `poolIndex`
     */
    function unstake(uint256 stakingPlanId) public {
        UserStake memory uStake = _userStake[msg.sender][stakingPlanId];

        // checking is stake exist
        if (uStake.stakeDate == 0) revert StakeNotFound();

        // check end staking date
        StakingPlan memory plan = _plans[stakingPlanId];
        if (uStake.stakeDate + plan.duration > block.timestamp)
            revert EndOfStakeNotReached();

        // reset stake values for user
        _userStake[msg.sender][stakingPlanId] = UserStake({
            stakeDate: 0,
            amount: 0
        });

        // update withrawn rewards
        uint256 rewardToWithdraw = _calculateReward(plan, uStake.amount);
        _plans[stakingPlanId].rewardsWithdrawn += rewardToWithdraw;

        // transfer tokens
        StakingPool memory sc = _stakePool;
        IERC20(sc.tokenAddress).transfer(
            msg.sender,
            uStake.amount + rewardToWithdraw
        );

        // emit event
        emit Unstaked(
            msg.sender,
            stakingPlanId,
            uStake.amount,
            rewardToWithdraw
        );
    }

    /**
     * @dev Unstakes tokens on selected `poolIndex` before end of staking period
     * Takes 10% fee
     */
    function unstakeWithPenalty(uint256 stakingPlanId) external {
        UserStake memory uStake = _userStake[msg.sender][stakingPlanId];

        // checking is stake exist
        if (uStake.stakeDate == 0) revert StakeNotFound();

        // if after locked period - do normal unstake
        StakingPlan memory plan = _plans[stakingPlanId];
        if (uStake.stakeDate + plan.duration < block.timestamp) {
            unstake(stakingPlanId);
            return ();
        }

        StakingPool memory sc = _stakePool;
        uint256 feeAmount = (uStake.amount * 5) / 100;
        uint256 toWithdraw = uStake.amount - 2 * feeAmount;

        // reset stake values for user
        _userStake[msg.sender][stakingPlanId] = UserStake({
            stakeDate: 0,
            amount: 0
        });

        // calculate and transfer tokens
        uint256 rescuedRewards = 0;
        if (sc.dateEnd > block.timestamp || sc.dateEnd == 0) {
            _plans[stakingPlanId].availableTokensBeStaked += uStake.amount;
        } else {
            rescuedRewards = _calculateReward(plan, uStake.amount);
            _plans[stakingPlanId].rewardsWithdrawn += rescuedRewards;
        }
        IERC20(sc.tokenAddress).transfer(sc.owner, feeAmount + rescuedRewards);
        IERC20(sc.tokenAddress).transfer(_factory.treasury(), feeAmount);
        IERC20(sc.tokenAddress).transfer(msg.sender, toWithdraw);
        emit UnstakedWithPenalty(
            msg.sender,
            stakingPlanId,
            uStake.amount,
            toWithdraw
        );
    }

    /**
     * @dev Sends unused reward tokens back to owner
     *
     * Note: Can be used only after stake period end
     */
    function claimUnusedRewards() external {
        StakingPool memory sc = _stakePool;
        if (sc.dateEnd >= block.timestamp || sc.dateEnd == 0) {
            revert StakingPeriodNotEnded();
        }

        if (sc.rescued) {
            revert AlreadyRescued();
        }

        uint256 sumToRescue;
        for (uint256 i = 0; i < _plans.length; i++) {
            StakingPlan memory plan = _plans[i];
            sumToRescue +=
                (plan.availableTokensBeStaked * plan.rewardsPool) /
                plan.maxTokensBeStaked;
        }
        if (sumToRescue == 0) revert NothingToWithdraw();
        _stakePool.rescued = true;
        IERC20(sc.tokenAddress).transfer(sc.owner, sumToRescue);
    }

    /**
     * @dev Withdraws collected fees
     *
     * Note: Only factory contract can execute this function
     */
    function claimFee() external returns (uint256) {
        if (msg.sender != address(_factory)) {
            revert OnlyFactory();
        }
        StakingPool memory sc = _stakePool;
        if (sc.dateEnd >= block.timestamp && sc.dateEnd != 0)
            revert StakingPeriodNotEnded();

        uint256 sumRewards;
        for (uint256 i = 0; i < _plans.length; i++) {
            StakingPlan memory plan = _plans[i];
            sumRewards +=
                (plan.rewardsWithdrawn * plan.mycFeesPool) /
                plan.rewardsPool;
        }

        if (sc.mycFeesWithdrawn >= sumRewards) {
            revert NothingToWithdraw();
        }

        uint256 toWithdraw = sumRewards - sc.mycFeesWithdrawn;
        IERC20(sc.tokenAddress).transfer(_factory.treasury(), toWithdraw);
        sc.mycFeesWithdrawn += toWithdraw;
        return (toWithdraw);
    }
}
