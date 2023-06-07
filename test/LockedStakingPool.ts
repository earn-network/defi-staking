import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Network } from "@ethersproject/networks";
import {
  lockedStakingPoolFixture,
  staked200TokensFixture,
  staked200TokensWithWethFixture,
} from "./helpers/lockedStakingHelper";
import {
  time,
  loadFixture,
  takeSnapshot,
  SnapshotRestorer,
} from "@nomicfoundation/hardhat-network-helpers";
import { AttackContract } from "../typechain-types";

describe("LockedStakingPool", function () {
  let signer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let deployer: SignerWithAddress;
  let bob: SignerWithAddress;
  let coinDev: SignerWithAddress;
  let staker: SignerWithAddress;
  let alice: SignerWithAddress;
  let network: Network;

  async function lockedStakingFixture() {
    const timestampStart = Math.floor(new Date().getTime() / 1000);
    return lockedStakingPoolFixture(
      treasury.address,
      signer,
      coinDev,
      network,
      timestampStart
    );
  }

  before(async () => {
    [deployer, signer, treasury, coinDev, staker, bob, alice] =
      await ethers.getSigners();
    network = await ethers.provider.getNetwork();
  });

  describe("Deployment", function () {
    it("Should return proper plans index", async function () {
      const { lockedStaking } = await loadFixture(lockedStakingFixture);
      expect(await lockedStaking.getPlansLength()).eq(1);
    });

    it("Should return proper factory address", async function () {
      const { lockedStaking, lockedStakingFactory } = await loadFixture(
        lockedStakingFixture
      );
      expect(await lockedStaking.factory()).eq(lockedStakingFactory.address);
    });

    it("Should return proper plans array", async function () {
      const { lockedStaking } = await loadFixture(lockedStakingFixture);
      const plans = await lockedStaking.getPlans();
      const plan = plans[0];
      expect(plans.length).eq(1);
      expect(plan.duration).eq(20);
      expect(plan.maxTokensBeStaked).eq(ethers.utils.parseEther("1000"));
      expect(plan.availableTokensBeStaked).eq(ethers.utils.parseEther("1000"));
      expect(plan.rewardsPool).eq(ethers.utils.parseEther("100"));
      expect(plan.rewardsWithdrawn).eq(ethers.utils.parseEther("0"));
      expect(plan.mycFeesPool).eq(ethers.utils.parseEther("10"));
    });

    it("Should return proper plan", async function () {
      const { lockedStaking } = await loadFixture(lockedStakingFixture);
      const plan = await lockedStaking.getPlan(0);
      expect(plan.duration).eq(20);
      expect(plan.maxTokensBeStaked).eq(ethers.utils.parseEther("1000"));
      expect(plan.availableTokensBeStaked).eq(ethers.utils.parseEther("1000"));
      expect(plan.rewardsPool).eq(ethers.utils.parseEther("100"));
      expect(plan.rewardsWithdrawn).eq(ethers.utils.parseEther("0"));
      expect(plan.mycFeesPool).eq(ethers.utils.parseEther("10"));
    });

    it("Should return proper staking pool info", async function () {
      const { lockedStaking, erc20Mock, timestamp } = await loadFixture(
        lockedStakingFixture
      );
      const stakingPoolInfo = await lockedStaking.stakingPool();
      expect(stakingPoolInfo.tokenAddress).eq(erc20Mock.address);
      expect(stakingPoolInfo.owner).eq(coinDev.address);
      expect(stakingPoolInfo.dateStart).eq(timestamp + 30);
      expect(stakingPoolInfo.dateEnd).eq(timestamp + 60);
      expect(stakingPoolInfo.rescued).eq(false);
      expect(stakingPoolInfo.mycFeesWithdrawn).eq(0);
    });

    it("Should return empty staker info", async function () {
      const { lockedStaking } = await loadFixture(lockedStakingFixture);
      const stakerInfo = await lockedStaking.stakeInfoOf(bob.address, 0);
      expect(stakerInfo.stakeDate).eq(0);
      expect(stakerInfo.amount).eq(0);
    });

    it("Should revert with {AmountCantBeZero} when 0 stake amount", async function () {
      const { lockedStaking } = await loadFixture(lockedStakingFixture);
      await expect(
        lockedStaking.connect(bob).stake(ethers.utils.parseEther("0"), 0)
      ).to.be.revertedWithCustomError(lockedStaking, "AmountCantBeZero");
    });

    it("Should revert with {DateInFuture} when start date in future", async function () {
      const { lockedStaking } = await loadFixture(lockedStakingFixture);
      await expect(
        lockedStaking.connect(bob).stake(ethers.utils.parseEther("1"), 0)
      ).to.be.revertedWithCustomError(lockedStaking, "DateInFuture");
    });

    it("Should revert with {DateInPast} when end date in past", async function () {
      const { lockedStaking, timestamp } = await loadFixture(
        lockedStakingFixture
      );
      await time.setNextBlockTimestamp(timestamp + 61);
      await expect(
        lockedStaking.connect(bob).stake(ethers.utils.parseEther("1"), 0)
      ).to.be.revertedWithCustomError(lockedStaking, "DateInPast");
    });
  });

  describe("Stake", function () {
    it("Should transfer tokens to contract address", async function () {
      const { lockedStaking, erc20Mock } = await loadFixture(
        lockedStakingFixture
      );
      await time.increase(30);
      await expect(
        lockedStaking.connect(bob).stake(ethers.utils.parseEther("200"), 0)
      )
        .to.emit(erc20Mock, "Transfer")
        .withArgs(
          bob.address,
          lockedStaking.address,
          ethers.utils.parseEther("200")
        );
    });

    it("Should emit {Staked} event", async function () {
      const { lockedStaking, timestamp } = await loadFixture(
        lockedStakingFixture
      );
      await time.setNextBlockTimestamp(timestamp + 31);
      await expect(
        lockedStaking.connect(bob).stake(ethers.utils.parseEther("200"), 0)
      )
        .to.emit(lockedStaking, "Staked")
        .withArgs(
          bob.address,
          0,
          ethers.utils.parseEther("200"),
          timestamp + 31 + 20
        );
    });

    it("Should return proper staker info", async function () {
      const { lockedStaking, timestamp } = await loadFixture(
        lockedStakingFixture
      );
      await time.setNextBlockTimestamp(timestamp + 31);
      await lockedStaking.connect(bob).stake(ethers.utils.parseEther("200"), 0);
      const stakerInfo = await lockedStaking.stakeInfoOf(bob.address, 0);
      expect(stakerInfo.stakeDate).eq(timestamp + 31);
      expect(stakerInfo.amount).eq(ethers.utils.parseEther("200"));
      const stakesInfo = await lockedStaking.stakesInfoOf(bob.address);
      expect(stakesInfo[0].stakeDate).eq(timestamp + 31);
      expect(stakesInfo[0].amount).eq(ethers.utils.parseEther("200"));
      const sum = stakesInfo.reduce(
        (acc, e) => acc.add(e.amount),
        ethers.BigNumber.from(0)
      );
      expect(sum).eq(ethers.utils.parseEther("200"));
    });

    it("Should return proper plan info", async function () {
      const { lockedStaking, timestamp } = await loadFixture(
        lockedStakingFixture
      );
      await time.setNextBlockTimestamp(timestamp + 31);
      await lockedStaking.connect(bob).stake(ethers.utils.parseEther("200"), 0);
      const plan = await lockedStaking.getPlan(0);
      expect(plan.duration).eq(20);
      expect(plan.maxTokensBeStaked).eq(ethers.utils.parseEther("1000"));
      expect(plan.availableTokensBeStaked).eq(ethers.utils.parseEther("800"));
      expect(plan.rewardsPool).eq(ethers.utils.parseEther("100"));
      expect(plan.rewardsWithdrawn).eq(ethers.utils.parseEther("0"));
      expect(plan.mycFeesPool).eq(ethers.utils.parseEther("10"));
    });

    it("Should revert when adding new stake when stake exists with {StakeAlreadyExists}", async function () {
      const { lockedStaking, timestamp } = await loadFixture(
        lockedStakingFixture
      );
      await time.setNextBlockTimestamp(timestamp + 31);
      await lockedStaking.connect(bob).stake(ethers.utils.parseEther("200"), 0);
      await expect(
        lockedStaking.connect(bob).stake(1, 0)
      ).to.be.revertedWithCustomError(lockedStaking, "StakeAlreadyExists");
    });
  });

  describe("Normal unstake", function () {
    it("Should revert when unstake without active stake with {StakeNotFound}", async function () {
      const { lockedStaking } = await loadFixture(staked200TokensFixture);
      await expect(
        lockedStaking.connect(alice).unstake(0)
      ).to.be.revertedWithCustomError(lockedStaking, "StakeNotFound");
    });

    it("Should revert when unstake before end date with {EndOfStakeNotReached}", async function () {
      const { lockedStaking } = await loadFixture(staked200TokensFixture);
      await expect(
        lockedStaking.connect(bob).unstake(0)
      ).to.be.revertedWithCustomError(lockedStaking, "EndOfStakeNotReached");
    });

    it("Should transfer tokens to user address (reward + staked)", async function () {
      const { lockedStaking, erc20Mock, stakedAtBlock } = await loadFixture(
        staked200TokensFixture
      );
      await time.setNextBlockTimestamp(stakedAtBlock + 21);
      await expect(lockedStaking.connect(bob).unstake(0))
        .to.emit(erc20Mock, "Transfer")
        .withArgs(
          lockedStaking.address,
          bob.address,
          ethers.utils.parseEther("220")
        );
    });

    it("Should emit {Unstaked} event", async function () {
      const { lockedStaking, stakedAtBlock } = await loadFixture(
        staked200TokensFixture
      );
      await time.setNextBlockTimestamp(stakedAtBlock + 21);
      await expect(lockedStaking.connect(bob).unstake(0))
        .to.emit(lockedStaking, "Unstaked")
        .withArgs(
          bob.address,
          0,
          ethers.utils.parseEther("200"),
          ethers.utils.parseEther("20")
        );
    });

    it("Should reset stake values for user", async function () {
      const { lockedStaking, stakedAtBlock } = await loadFixture(
        staked200TokensFixture
      );
      await time.setNextBlockTimestamp(stakedAtBlock + 21);
      lockedStaking.connect(bob).unstake(0);
      const stakerInfo = await lockedStaking.stakeInfoOf(bob.address, 0);
      expect(stakerInfo.stakeDate).eq(0);
      expect(stakerInfo.amount).eq(0);
    });

    it("Should update withdrawn rewards", async function () {
      const { lockedStaking, stakedAtBlock } = await loadFixture(
        staked200TokensFixture
      );
      await time.setNextBlockTimestamp(stakedAtBlock + 21);
      lockedStaking.connect(bob).unstake(0);
      const plan = await lockedStaking.getPlan(0);
      expect(plan.duration).eq(20);
      expect(plan.maxTokensBeStaked).eq(ethers.utils.parseEther("1000"));
      expect(plan.availableTokensBeStaked).eq(ethers.utils.parseEther("800"));
      expect(plan.rewardsPool).eq(ethers.utils.parseEther("100"));
      expect(plan.rewardsWithdrawn).eq(ethers.utils.parseEther("20"));
      expect(plan.mycFeesPool).eq(ethers.utils.parseEther("10"));
    });
  });

  describe("Early unstake (with penalty)", function () {
    describe("Before end date", function () {
      async function staked200TokensFixture2() {
        return staked200TokensFixture();
      }

      it("Should revert when unstake without active stake with {StakeNotFound}", async function () {
        const { lockedStaking } = await loadFixture(staked200TokensFixture);
        await expect(
          lockedStaking.connect(alice).unstake(0)
        ).to.be.revertedWithCustomError(lockedStaking, "StakeNotFound");
      });

      it("Should transfer liquidation fee to pool owner (5%)", async function () {
        const { lockedStaking, erc20Mock } = await loadFixture(
          staked200TokensFixture2
        );
        await expect(lockedStaking.connect(bob).unstakeWithPenalty(0))
          .to.emit(erc20Mock, "Transfer")
          .withArgs(
            lockedStaking.address,
            coinDev.address,
            ethers.utils.parseEther("10")
          );
      });

      it("Should transfer liquidation fee to MYC (5%)", async function () {
        const { lockedStaking, erc20Mock } = await loadFixture(
          staked200TokensFixture2
        );
        await expect(lockedStaking.connect(bob).unstakeWithPenalty(0))
          .to.emit(erc20Mock, "Transfer")
          .withArgs(
            lockedStaking.address,
            treasury.address,
            ethers.utils.parseEther("10")
          );
      });

      it("Should transfer staked amount back to staker (90%)", async function () {
        const { lockedStaking, erc20Mock } = await loadFixture(
          staked200TokensFixture2
        );
        await expect(lockedStaking.connect(bob).unstakeWithPenalty(0))
          .to.emit(erc20Mock, "Transfer")
          .withArgs(
            lockedStaking.address,
            bob.address,
            ethers.utils.parseEther("180")
          );
      });

      it("Should emit {Unstaked} event", async function () {
        const { lockedStaking } = await loadFixture(staked200TokensFixture2);
        await expect(lockedStaking.connect(bob).unstakeWithPenalty(0))
          .to.emit(lockedStaking, "UnstakedWithPenalty")
          .withArgs(
            bob.address,
            0,
            ethers.utils.parseEther("200"),
            ethers.utils.parseEther("180")
          );
      });

      it("Should reset stake values for user", async function () {
        const { lockedStaking } = await loadFixture(staked200TokensFixture2);
        lockedStaking.connect(bob).unstakeWithPenalty(0);
        const stakerInfo = await lockedStaking.stakeInfoOf(bob.address, 0);
        expect(stakerInfo.stakeDate).eq(0);
        expect(stakerInfo.amount).eq(0);
      });

      it("Should update withdrawn rewards (increase availableTokesBeStaked)", async function () {
        const { lockedStaking } = await loadFixture(staked200TokensFixture2);
        lockedStaking.connect(bob).unstakeWithPenalty(0);
        const plan = await lockedStaking.getPlan(0);
        expect(plan.duration).eq(20);
        expect(plan.maxTokensBeStaked).eq(ethers.utils.parseEther("1000"));
        expect(plan.availableTokensBeStaked).eq(
          ethers.utils.parseEther("1000")
        );
        expect(plan.rewardsPool).eq(ethers.utils.parseEther("100"));
        expect(plan.rewardsWithdrawn).eq(ethers.utils.parseEther("0"));
        expect(plan.mycFeesPool).eq(ethers.utils.parseEther("10"));
      });

      it("Should do normal unstake after user's end of stake", async function () {
        const { lockedStaking, stakedAtBlock } = await loadFixture(
          staked200TokensFixture2
        );
        await time.setNextBlockTimestamp(stakedAtBlock + 30);
        await expect(lockedStaking.connect(bob).unstakeWithPenalty(0))
          .to.emit(lockedStaking, "Unstaked")
          .withArgs(
            bob.address,
            0,
            ethers.utils.parseEther("200"),
            ethers.utils.parseEther("20")
          );
      });
    });

    describe("After end date", function () {
      async function staked200TokensFixture3() {
        const ts = Math.floor(new Date().getTime() / 1000);
        return staked200TokensFixture(ts);
      }

      it("Should revert when unstake without active stake with {StakeNotFound}", async function () {
        const { lockedStaking, stakedAtBlock } = await loadFixture(
          staked200TokensFixture
        );
        await expect(
          lockedStaking.connect(alice).unstake(0)
        ).to.be.revertedWithCustomError(lockedStaking, "StakeNotFound");
      });

      it("Should transfer liquidation fee to pool owner (5%) + return of unused rewards", async function () {
        const { lockedStaking, timestampStart, erc20Mock } = await loadFixture(
          staked200TokensFixture3
        );
        await time.setNextBlockTimestamp(timestampStart + 57);
        await lockedStaking
          .connect(alice)
          .stake(ethers.utils.parseEther("800"), 0);
        await time.setNextBlockTimestamp(timestampStart + 62);
        await expect(lockedStaking.connect(alice).unstakeWithPenalty(0))
          .to.emit(erc20Mock, "Transfer")
          .withArgs(
            ethers.utils.getAddress(lockedStaking.address),
            coinDev.address,
            ethers.utils.parseEther("120")
          );
      });

      it("Should transfer liquidation fee to MYC (5%)", async function () {
        const { lockedStaking, timestampStart, erc20Mock } = await loadFixture(
          staked200TokensFixture3
        );
        await time.setNextBlockTimestamp(timestampStart + 57);
        await lockedStaking
          .connect(alice)
          .stake(ethers.utils.parseEther("800"), 0);
        await time.setNextBlockTimestamp(timestampStart + 61);
        await expect(lockedStaking.connect(alice).unstakeWithPenalty(0))
          .to.emit(erc20Mock, "Transfer")
          .withArgs(
            lockedStaking.address,
            treasury.address,
            ethers.utils.parseEther("40")
          );
      });

      it("Should transfer staked amount back to staker (90%)", async function () {
        const { lockedStaking, timestampStart, erc20Mock } = await loadFixture(
          staked200TokensFixture3
        );
        await time.setNextBlockTimestamp(timestampStart + 57);
        await lockedStaking
          .connect(alice)
          .stake(ethers.utils.parseEther("800"), 0);
        await time.setNextBlockTimestamp(timestampStart + 61);
        await expect(lockedStaking.connect(alice).unstakeWithPenalty(0))
          .to.emit(erc20Mock, "Transfer")
          .withArgs(
            lockedStaking.address,
            alice.address,
            ethers.utils.parseEther("720")
          );
      });

      it("Should emit {Unstaked} event", async function () {
        const { lockedStaking, timestampStart, erc20Mock } = await loadFixture(
          staked200TokensFixture3
        );
        await time.setNextBlockTimestamp(timestampStart + 57);
        await lockedStaking
          .connect(alice)
          .stake(ethers.utils.parseEther("800"), 0);
        await time.setNextBlockTimestamp(timestampStart + 61);
        await expect(lockedStaking.connect(alice).unstakeWithPenalty(0))
          .to.emit(lockedStaking, "UnstakedWithPenalty")
          .withArgs(
            alice.address,
            0,
            ethers.utils.parseEther("800"),
            ethers.utils.parseEther("720")
          );
      });

      it("Should increase withdrawn rewards and not update availableTokensBeStaked", async function () {
        const { lockedStaking, timestampStart, erc20Mock } = await loadFixture(
          staked200TokensFixture3
        );
        await time.setNextBlockTimestamp(timestampStart + 57);
        await lockedStaking
          .connect(alice)
          .stake(ethers.utils.parseEther("800"), 0);
        await time.setNextBlockTimestamp(timestampStart + 61);
        await lockedStaking.connect(alice).unstakeWithPenalty(0);
        const plan = await lockedStaking.getPlan(0);
        expect(plan.duration).eq(20);
        expect(plan.maxTokensBeStaked).eq(ethers.utils.parseEther("1000"));
        expect(plan.availableTokensBeStaked).eq(ethers.utils.parseEther("0"));
        expect(plan.rewardsPool).eq(ethers.utils.parseEther("100"));
        expect(plan.rewardsWithdrawn).eq(ethers.utils.parseEther("80"));
        expect(plan.mycFeesPool).eq(ethers.utils.parseEther("10"));
      });
    });
  });

  describe("Rescue unused rewards", function () {
    let snapshot: SnapshotRestorer;
    async function lockedStakingFixture3() {
      const timestampStart = await time.latest();
      return lockedStakingPoolFixture(
        treasury.address,
        signer,
        coinDev,
        network,
        timestampStart
      );
    }

    async function staked200TokensFixture2() {
      const timestampStart = (await time.latest()) - 21;
      return staked200TokensFixture(timestampStart);
    }

    it("Should revert claim unused rewards before end date with {StakingPeriodNotEnded}", async function () {
      const { lockedStaking } = await loadFixture(lockedStakingFixture3);
      await expect(
        lockedStaking.connect(coinDev).claimUnusedRewards()
      ).to.be.revertedWithCustomError(lockedStaking, "StakingPeriodNotEnded");
    });

    it("Should revert when tokens already rescued with {AlreadyRescued}", async function () {
      const { lockedStaking, stakedAtBlock } = await loadFixture(
        staked200TokensFixture2
      );
      await time.setNextBlockTimestamp(stakedAtBlock + 21);
      await lockedStaking.connect(bob).unstake(0);
      await time.setNextBlockTimestamp(stakedAtBlock + 61);
      await lockedStaking.connect(coinDev).claimUnusedRewards();
      await expect(
        lockedStaking.connect(coinDev).claimUnusedRewards()
      ).to.be.revertedWithCustomError(lockedStaking, "AlreadyRescued");
    });

    it("Should revert claim when all rewards used with {NothingToWithdraw}", async function () {
      const { lockedStaking, stakedAtBlock } = await loadFixture(
        staked200TokensFixture2
      );
      await lockedStaking
        .connect(alice)
        .stake(ethers.utils.parseEther("800"), 0);
      await time.setNextBlockTimestamp(stakedAtBlock + 61);
      await expect(
        lockedStaking.connect(coinDev).claimUnusedRewards()
      ).to.be.revertedWithCustomError(lockedStaking, "NothingToWithdraw");
    });

    it("Should transfer rescued tokens to coindev address", async function () {
      const { lockedStaking, stakedAtBlock, erc20Mock } = await loadFixture(
        staked200TokensFixture2
      );
      await time.setNextBlockTimestamp(stakedAtBlock + 61);
      await expect(lockedStaking.connect(coinDev).claimUnusedRewards())
        .to.emit(erc20Mock, "Transfer")
        .withArgs(
          lockedStaking.address,
          coinDev.address,
          ethers.utils.parseEther("80")
        );
    });

    it("Should change rescued status", async function () {
      const { lockedStaking, stakedAtBlock } = await loadFixture(
        staked200TokensFixture2
      );
      await time.setNextBlockTimestamp(stakedAtBlock + 61);
      await lockedStaking.connect(coinDev).claimUnusedRewards();
      const stakingPoolInfo = await lockedStaking.stakingPool();
      expect(stakingPoolInfo.rescued).eq(true);
    });
  });

  describe("Withdraw MYC rewards", function () {
    let snapshot: SnapshotRestorer;
    async function lockedStakingFixture3() {
      const timestampStart = await time.latest();
      return lockedStakingPoolFixture(
        treasury.address,
        signer,
        coinDev,
        network,
        timestampStart
      );
    }

    async function staked200TokensFixture2() {
      const timestampStart = (await time.latest()) - 21;
      return staked200TokensFixture(timestampStart);
    }
  });

  describe("Emergency Withdraw", function () {
    async function staked200TokensFixture2() {
      const timestampStart = (await time.latest()) - 21;
      return staked200TokensFixture(timestampStart);
    }

    it("Should withdraw tokens to protocol owner", async function () {
      const { lockedStaking, erc20Mock } = await loadFixture(
        staked200TokensFixture2
      );
      await expect(
        lockedStaking
          .connect(deployer)
          .emergencyWithdraw(erc20Mock.address, ethers.utils.parseEther("100"))
      )
        .to.emit(erc20Mock, "Transfer")
        .withArgs(
          lockedStaking.address,
          deployer.address,
          ethers.utils.parseEther("100")
        );
    });
  });

  describe("Native currency", function() {
    describe("Normal unstake", function () {
      async function staked200TokensFixture2() {
        const timestampStart = (await time.latest()) - 21;
        return staked200TokensWithWethFixture(timestampStart);
      }

      it("Should transfer tokens to user address (reward + staked)", async function () {
        const { lockedStaking, erc20Mock, stakedAtBlock, } = await loadFixture(
          staked200TokensFixture2
        );
        await time.setNextBlockTimestamp(stakedAtBlock + 21);
        console.log((await bob.getBalance()).toString());
        await lockedStaking.connect(bob).unstake(0);
        console.log((await bob.getBalance()).toString());
      });
    });
  })
});
