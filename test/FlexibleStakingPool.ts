import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Network } from "@ethersproject/networks";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
  flexibleStakingPoolFixture,
  staked200TokensFixture,
  staked200TokensWithWethFixture,
} from "./helpers/flexibleStakingHelper";
import { AttackContract } from "../typechain-types";

describe("FlexibleStakingPool", function () {
  let signer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let deployer: SignerWithAddress;
  let bob: SignerWithAddress;
  let coinDev: SignerWithAddress;
  let staker: SignerWithAddress;
  let alice: SignerWithAddress;
  let network: Network;

  async function flexibleStakingFixture() {
    const timestampStart = Math.floor(new Date().getTime() / 1000);
    return flexibleStakingPoolFixture(
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

  describe("Factory", function () {
    it("Should emit transfer tokens", async function () {
      const { flexibleStaking, erc20Mock, creationTz } = await loadFixture(
        flexibleStakingFixture
      );

      await expect(creationTz)
        .to.emit(erc20Mock, "Transfer")
        .withArgs(
          coinDev.address,
          flexibleStaking.address,
          ethers.utils.parseEther("30")
        );
      await expect(creationTz)
        .to.emit(erc20Mock, "Transfer")
        .withArgs(
          coinDev.address,
          treasury.address,
          ethers.utils.parseEther("10")
        );
    });
  });

  describe("Deployment", function () {
    it("Should return proper creator address", async function () {
      const { flexibleStaking } = await loadFixture(flexibleStakingFixture);
      expect(await flexibleStaking.creator()).eq(coinDev.address);
    });

    it("Should return empty rewards", async function () {
      const { flexibleStaking } = await loadFixture(flexibleStakingFixture);
      expect(await flexibleStaking.checkRewards(bob.address)).eq(0);
    });

    it("Should return proper factory address", async function () {
      const { flexibleStaking, flexibleStakingFactory } = await loadFixture(
        flexibleStakingFixture
      );
      expect(await flexibleStaking.factory()).eq(
        flexibleStakingFactory.address
      );
    });

    it("Should return proper summary", async function () {
      const { flexibleStaking } = await loadFixture(flexibleStakingFixture);
      const [
        rewardTokensPerSecond,
        amountOfTokensStaked,
        accRewardPerShare,
        lastAccRewardPerShareTimestamp,
      ] = await flexibleStaking.getSummary();
      expect(rewardTokensPerSecond).eq(ethers.utils.parseEther("1"));
      expect(amountOfTokensStaked).eq(ethers.utils.parseEther("0"));
      expect(accRewardPerShare).eq(ethers.utils.parseEther("0"));
      expect(lastAccRewardPerShareTimestamp).eq(ethers.utils.parseEther("0"));
    });

    it("Should return proper stakers info", async function () {
      const { flexibleStaking } = await loadFixture(flexibleStakingFixture);
      const [amount, rewardDebt, pendingRewards, timestamp] =
        await flexibleStaking.stakers(bob.address);
      expect(amount).eq(ethers.utils.parseEther("0"));
      expect(rewardDebt).eq(ethers.utils.parseEther("0"));
      expect(pendingRewards).eq(ethers.utils.parseEther("0"));
      expect(timestamp).eq(ethers.utils.parseEther("0"));
    });
  });

  describe("Staking", function () {
    it("Should return with 'amount cannot be zero' when amount is zero", async function () {
      const { flexibleStaking } = await loadFixture(flexibleStakingFixture);
      await expect(
        flexibleStaking.connect(bob).deposit(ethers.utils.parseEther("0"))
      ).to.be.revertedWith("amount cannot be zero");
    });

    it("Should return with 'only after start date' when before start date", async function () {
      const { flexibleStaking } = await loadFixture(flexibleStakingFixture);
      await expect(
        flexibleStaking.connect(bob).deposit(ethers.utils.parseEther("1"))
      ).to.be.revertedWith("only after start date");
    });

    it("Should return proper rewards", async function () {
      const { flexibleStaking, stakedAtBlock, timestampStart } =
        await loadFixture(staked200TokensFixture);
      expect(await flexibleStaking.checkRewards(bob.address)).eq(
        ethers.utils.parseEther("0")
      );
      await time.increaseTo(stakedAtBlock + 5);
      expect(await flexibleStaking.checkRewards(bob.address)).eq(
        ethers.utils.parseEther("5")
      );
      const timestamp1 = await time.latest();
      await flexibleStaking
        .connect(alice)
        .deposit(ethers.utils.parseEther("50"));
      const timestamp2 = await time.latest();
      const [
        rewardTokensPerSecond,
        amountOfTokensStaked,
        accRewardPerShare,
        lastAccRewardPerShareTimestamp,
      ] = await flexibleStaking.getSummary();
      expect(rewardTokensPerSecond).eq(ethers.utils.parseEther("1"));
      expect(amountOfTokensStaked).eq(ethers.utils.parseEther("250"));
      expect(accRewardPerShare).eq(ethers.utils.parseEther("0.00000003"));
      expect(lastAccRewardPerShareTimestamp).eq(timestamp2);
      await time.increaseTo(timestamp2 + 10);
      expect(await flexibleStaking.checkRewards(alice.address)).eq(
        ethers.utils.parseEther("2")
      );
      expect(await flexibleStaking.checkRewards(bob.address)).eq(
        ethers.utils.parseEther("14")
      );
      // await time.increaseTo(timestamp2+100);
      // expect(await flexibleStaking.checkRewards(alice.address)).eq(ethers.utils.parseEther("3.6"));
      // expect(await flexibleStaking.checkRewards(bob.address)).eq(ethers.utils.parseEther("16.4"));
      // console.log({startDate: timestampStart+30, endDate: timestampStart+60, bobStake: stakedAtBlock, aliceStake: timestamp2});
    });

    it("Should return proper summary", async function () {
      const { flexibleStaking, stakedAtBlock } = await loadFixture(
        staked200TokensFixture
      );
      const [
        rewardTokensPerSecond,
        amountOfTokensStaked,
        accRewardPerShare,
        lastAccRewardPerShareTimestamp,
      ] = await flexibleStaking.getSummary();
      expect(rewardTokensPerSecond).eq(ethers.utils.parseEther("1"));
      expect(amountOfTokensStaked).eq(ethers.utils.parseEther("200"));
      expect(accRewardPerShare).eq(ethers.utils.parseEther("0"));
      expect(lastAccRewardPerShareTimestamp).eq(stakedAtBlock);
    });

    it("Should return proper stakers info", async function () {
      const { flexibleStaking, stakedAtBlock } = await loadFixture(
        staked200TokensFixture
      );
      const [amount, rewardDebt, pendingRewards, timestamp] =
        await flexibleStaking.stakers(bob.address);
      expect(amount).eq(ethers.utils.parseEther("200"));
      expect(rewardDebt).eq(ethers.utils.parseEther("0"));
      expect(pendingRewards).eq(ethers.utils.parseEther("0"));
      expect(timestamp).eq(stakedAtBlock);
    });

    it("Should return with 'only before end date' after end date", async function () {
      const { flexibleStaking } = await loadFixture(flexibleStakingFixture);
      await time.increase(1000);
      await expect(
        flexibleStaking.connect(bob).deposit(ethers.utils.parseEther("1"))
      ).to.be.revertedWith("only before end date");
    });
  });

  describe("Claim rewards", function () {
    async function staked200TokensFixture2() {
      const ts = await time.latest();
      return staked200TokensFixture(ts);
    }

    it("Should emit transfer tokens", async function () {
      const { flexibleStaking, stakedAtBlock, erc20Mock, timestampStart } =
        await loadFixture(staked200TokensFixture2);
      await time.increaseTo(stakedAtBlock + 5);
      await expect(flexibleStaking.connect(bob).claimRewards())
        .to.emit(erc20Mock, "Transfer")
        .withArgs(
          flexibleStaking.address,
          bob.address,
          ethers.utils.parseEther("6")
        );
      const ts = await time.latest();
      expect(ts - stakedAtBlock).is.eq(6);
      await expect(flexibleStaking.connect(bob).claimRewards())
        .to.emit(erc20Mock, "Transfer")
        .withArgs(
          flexibleStaking.address,
          bob.address,
          ethers.utils.parseEther("1")
        );
    });

    it("Should limit max tokens to withdraw", async function () {
      const { flexibleStaking, stakedAtBlock, erc20Mock, timestampStart } =
        await loadFixture(staked200TokensFixture2);
      await time.increaseTo(stakedAtBlock + 35);
      expect(await flexibleStaking.checkRewards(bob.address)).eq(
        ethers.utils.parseEther("27")
      );
      await expect(flexibleStaking.connect(bob).claimRewards())
        .to.emit(erc20Mock, "Transfer")
        .withArgs(
          flexibleStaking.address,
          bob.address,
          ethers.utils.parseEther("27")
        );
      expect(await flexibleStaking.checkRewards(bob.address)).eq(
        ethers.utils.parseEther("0")
      );
    });

    it("Should update AccRewardPerShare", async function () {
      const { flexibleStaking, stakedAtBlock, erc20Mock, timestampStart } =
        await loadFixture(staked200TokensFixture2);
      await time.increaseTo(stakedAtBlock + 9);
      await flexibleStaking.connect(bob).claimRewards();
      const ts = await time.latest();
      const [amount, rewardDebt, pendingRewards, timestamp] =
        await flexibleStaking.stakers(bob.address);
      expect(amount).eq(ethers.utils.parseEther("200"));
      expect(rewardDebt).eq(ethers.utils.parseEther("10")); //withdrawn already
      expect(pendingRewards).eq(ethers.utils.parseEther("0"));
      expect(timestamp).eq(stakedAtBlock);
      const [
        rewardTokensPerSecond,
        amountOfTokensStaked,
        accRewardPerShare,
        lastAccRewardPerShareTimestamp,
      ] = await flexibleStaking.getSummary();
      expect(rewardTokensPerSecond).eq(ethers.utils.parseEther("1"));
      expect(amountOfTokensStaked).eq(ethers.utils.parseEther("200"));
      expect(accRewardPerShare).eq(ethers.utils.parseEther("0.00000005"));
      expect(lastAccRewardPerShareTimestamp).eq(ts);
    });
  });

  describe("Withdraw", function () {
    async function staked200TokensFixture2() {
      const ts = await time.latest();
      return staked200TokensFixture(ts);
    }

    it("Normal award", async function () {
      const { flexibleStaking, stakedAtBlock, erc20Mock, timestampStart } =
        await loadFixture(staked200TokensFixture2);
      await time.increaseTo(stakedAtBlock + 6);
      const ev = await flexibleStaking
        .connect(bob)
        .withdraw(ethers.utils.parseEther("200"));
      await expect(ev)
        .to.emit(erc20Mock, "Transfer")
        .withArgs(
          flexibleStaking.address,
          bob.address,
          ethers.utils.parseEther("200")
        );
      await expect(ev)
        .to.emit(erc20Mock, "Transfer")
        .withArgs(
          flexibleStaking.address,
          bob.address,
          ethers.utils.parseEther("7")
        );
    });

    it("withdraw half", async function () {
      const { flexibleStaking, stakedAtBlock, erc20Mock, timestampStart } =
        await loadFixture(staked200TokensFixture2);

      await time.increaseTo(stakedAtBlock + 3);
      const ev = await flexibleStaking
        .connect(bob)
        .withdraw(ethers.utils.parseEther("100"));
      await expect(ev)
        .to.emit(erc20Mock, "Transfer")
        .withArgs(
          flexibleStaking.address,
          bob.address,
          ethers.utils.parseEther("100")
        );
      await expect(ev)
        .to.emit(erc20Mock, "Transfer")
        .withArgs(
          flexibleStaking.address,
          bob.address,
          ethers.utils.parseEther("4")
        );

      await time.increaseTo(stakedAtBlock + 6);
      const ev2 = await flexibleStaking
        .connect(bob)
        .withdraw(ethers.utils.parseEther("100"));
      await expect(ev2)
        .to.emit(erc20Mock, "Transfer")
        .withArgs(
          flexibleStaking.address,
          bob.address,
          ethers.utils.parseEther("100")
        );
      await expect(ev2)
        .to.emit(erc20Mock, "Transfer")
        .withArgs(
          flexibleStaking.address,
          bob.address,
          ethers.utils.parseEther("3")
        );
    });

    it("test audit", async function () {
      const { flexibleStaking, stakedAtBlock, erc20Mock, timestampStart } =
        await loadFixture(staked200TokensFixture2);

      await time.increaseTo(stakedAtBlock + 3);
      const ev = await flexibleStaking
        .connect(bob)
        .withdraw(ethers.utils.parseEther("199"));
      await expect(ev)
        .to.emit(erc20Mock, "Transfer")
        .withArgs(
          flexibleStaking.address,
          bob.address,
          ethers.utils.parseEther("199")
        );
      await expect(ev)
        .to.emit(erc20Mock, "Transfer")
        .withArgs(
          flexibleStaking.address,
          bob.address,
          ethers.utils.parseEther("4")
        );

      await time.increaseTo(stakedAtBlock + 6);
      const ev2 = await flexibleStaking
        .connect(bob)
        .withdraw(ethers.utils.parseEther("1"));
      await expect(ev2)
        .to.emit(erc20Mock, "Transfer")
        .withArgs(
          flexibleStaking.address,
          bob.address,
          ethers.utils.parseEther("1")
        );
      await expect(ev2)
        .to.emit(erc20Mock, "Transfer")
        .withArgs(
          flexibleStaking.address,
          bob.address,
          ethers.utils.parseEther("1")
        );

      await flexibleStaking
        .connect(bob)
        .deposit(ethers.utils.parseEther("100"));
    await time.increaseTo(stakedAtBlock + 10);
    const ev3 = await flexibleStaking
      .connect(bob)
      .withdraw(ethers.utils.parseEther("100"));
    await expect(ev3)
      .to.emit(erc20Mock, "Transfer")
      .withArgs(
        flexibleStaking.address,
        bob.address,
        ethers.utils.parseEther("100")
      );
    await expect(ev3)
      .to.emit(erc20Mock, "Transfer")
      .withArgs(
        flexibleStaking.address,
        bob.address,
        ethers.utils.parseEther("3")
      );

      

    });

    it("Should revert with 'balance is zero' if nothing to claim", async function () {
      const { flexibleStaking, stakedAtBlock, erc20Mock, timestampStart } =
        await loadFixture(staked200TokensFixture2);
      await expect(
        flexibleStaking.connect(alice).withdraw(ethers.utils.parseEther("0"))
      ).to.be.revertedWith("balance is zero");
    });

    it("Should revert with 'amount > balance' if amount greater than actual balance", async function () {
      const { flexibleStaking, stakedAtBlock, erc20Mock, timestampStart } =
        await loadFixture(staked200TokensFixture2);
      await expect(
        flexibleStaking.connect(bob).withdraw(ethers.utils.parseEther("1000"))
      ).to.be.revertedWith("amount > balance");
    });

    it("Should emit {Transfer} events: (staked + reward)", async function () {
      const { flexibleStaking, stakedAtBlock, erc20Mock, timestampStart } =
        await loadFixture(staked200TokensFixture2);
      await time.increaseTo(stakedAtBlock + 5);
      const ev = await flexibleStaking
        .connect(bob)
        .withdraw(ethers.utils.parseEther("200"));
      await expect(ev)
        .to.emit(erc20Mock, "Transfer")
        .withArgs(
          flexibleStaking.address,
          bob.address,
          ethers.utils.parseEther("200")
        );
      await expect(ev)
        .to.emit(erc20Mock, "Transfer")
        .withArgs(
          flexibleStaking.address,
          bob.address,
          ethers.utils.parseEther("6")
        );
    });

    it("Should emit {Withdrawal} event", async function () {
      const { flexibleStaking, stakedAtBlock, erc20Mock, timestampStart } =
        await loadFixture(staked200TokensFixture2);
      await time.increaseTo(stakedAtBlock + 5);
      const ev = await flexibleStaking
        .connect(bob)
        .withdraw(ethers.utils.parseEther("200"));
      const ts = await time.latest();
      await expect(ev)
        .to.emit(flexibleStaking, "Withdrawal")
        .withArgs(bob.address, ethers.utils.parseEther("200"), ts);
    });

    it("Should update stake info", async function () {
      const { flexibleStaking, stakedAtBlock, erc20Mock, timestampStart } =
        await loadFixture(staked200TokensFixture2);
      await time.increaseTo(stakedAtBlock + 5);
      const ev = await flexibleStaking
        .connect(bob)
        .withdraw(ethers.utils.parseEther("100"));
      const ts = await time.latest();
      const [amount, rewardDebt, pendingRewards, timestamp] =
        await flexibleStaking.stakers(bob.address);
      expect(amount).eq(ethers.utils.parseEther("100")); //
      expect(rewardDebt).eq(ethers.utils.parseEther("3")); //withdrawn already
      expect(pendingRewards).eq(ethers.utils.parseEther("0"));
      expect(timestamp).eq(stakedAtBlock);
      const [
        rewardTokensPerSecond,
        amountOfTokensStaked,
        accRewardPerShare,
        lastAccRewardPerShareTimestamp,
      ] = await flexibleStaking.getSummary();
      expect(rewardTokensPerSecond).eq(ethers.utils.parseEther("1"));
      expect(amountOfTokensStaked).eq(ethers.utils.parseEther("100"));
      //expect(accRewardPerShare).eq(ethers.utils.parseEther("0.00000005"));
      expect(lastAccRewardPerShareTimestamp).eq(ts);
    });

    it("Should update stake info", async function () {
      const { flexibleStaking, stakedAtBlock, erc20Mock, timestampStart } =
        await loadFixture(staked200TokensFixture2);
      await time.increaseTo(stakedAtBlock + 5);
      const ev = await flexibleStaking
        .connect(bob)
        .withdraw(ethers.utils.parseEther("200"));
      const ts = await time.latest();
      await flexibleStaking.connect(bob).deposit(ethers.utils.parseEther("5"));
      await time.increase(5);
      expect(await flexibleStaking.checkRewards(bob.address)).eq(
        ethers.utils.parseEther("5")
      );
      const tz = await flexibleStaking
        .connect(bob)
        .withdraw(ethers.utils.parseEther("5"));
      await expect(tz)
        .to.emit(erc20Mock, "Transfer")
        .withArgs(
          flexibleStaking.address,
          bob.address,
          ethers.utils.parseEther("5")
        );
      await expect(tz)
        .to.emit(erc20Mock, "Transfer")
        .withArgs(
          flexibleStaking.address,
          bob.address,
          ethers.utils.parseEther("5")
        );
    });
  });

  describe("Emergency Withdraw", function () {
    async function staked200TokensFixture2() {
      const ts = await time.latest();
      return staked200TokensFixture(ts);
    }

    it("Should withdraw tokens to protocol owner", async function () {
      const { flexibleStaking, erc20Mock } = await loadFixture(
        staked200TokensFixture2
      );
      await expect(
        flexibleStaking
          .connect(deployer)
          .emergencyWithdraw(erc20Mock.address, ethers.utils.parseEther("100"))
      )
        .to.emit(erc20Mock, "Transfer")
        .withArgs(
          flexibleStaking.address,
          deployer.address,
          ethers.utils.parseEther("100")
        );
    });
  });

  describe("Native Currency", function () {
    async function staked200TokensFixture3() {
      const ts = await time.latest();
      return staked200TokensWithWethFixture(ts);
    }

    it("test audit", async function () {
      const { flexibleStaking, stakedAtBlock, erc20Mock, timestampStart } =
        await loadFixture(staked200TokensFixture3);

      await time.increaseTo(stakedAtBlock + 3);
      console.log((await bob.getBalance()).toString());
      await flexibleStaking
        .connect(bob)
        .withdraw(ethers.utils.parseEther("200"));
      console.log((await bob.getBalance()).toString());

      await flexibleStaking
          .connect(bob)
          .deposit(ethers.utils.parseEther("100"), {value: ethers.utils.parseEther("100")});
      console.log((await bob.getBalance()).toString());

      await flexibleStaking
      .connect(bob)
      .withdraw(ethers.utils.parseEther("100"));
    console.log((await bob.getBalance()).toString());
    });
  });

  describe("Attack scenario", function() {
    describe("Do in one transaction", function () {
      let attackContract: AttackContract;
      before(async() => {
        const AttackContractFactory = await ethers.getContractFactory(
          "AttackContract"
        );
        attackContract = await AttackContractFactory.deploy(
        );
      })

      async function staked200TokensFixture2() {
        const timestampStart = (await time.latest()) - 21;
        return staked200TokensFixture(timestampStart);
      }

      it("Should unstake same amount as staked", async function () {
        const { flexibleStaking, erc20Mock, stakedAtBlock, } = await loadFixture(
          staked200TokensFixture2
        );
        await erc20Mock.connect(bob).approve(attackContract.address, ethers.utils.parseEther("200"));

        expect(await erc20Mock.balanceOf(bob.address)).eq(ethers.utils.parseEther("999800"));
        await attackContract.connect(bob).attack(erc20Mock.address, flexibleStaking.address, ethers.utils.parseEther("100"));
        expect(await erc20Mock.balanceOf(bob.address)).eq(ethers.utils.parseEther("999800"));

        await flexibleStaking.connect(bob).withdraw(ethers.utils.parseEther("200"));
        expect(await erc20Mock.balanceOf(bob.address)).eq(ethers.utils.parseEther("1000003"));
        await flexibleStaking.connect(bob).deposit(ethers.utils.parseEther("50"));
        await flexibleStaking.connect(bob).deposit(ethers.utils.parseEther("150"));
        await flexibleStaking.connect(bob).claimRewards();
        await flexibleStaking.connect(bob).withdraw(ethers.utils.parseEther("150"));
        await flexibleStaking.connect(bob).withdraw(ethers.utils.parseEther("50"));
        await flexibleStaking.connect(bob).claimRewards();
        expect(await erc20Mock.balanceOf(bob.address)).eq(ethers.utils.parseEther("1000005"));
      });
    });
  })
});
