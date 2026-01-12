// const { assert } = require("chai")
// const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers")
// const { network } = require("hardhat")

/*describe("Functions Consumer Unit Tests", async function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.

  it("empty test", async () => {
    // TODO
  })
})*/


const { expect } = require("chai")
const { ethers, network } = require("hardhat")

/* -------------------------------------------------------------------------- */
/*  CONSTRUCTOR TESTS CHECKS IF THE INITIALS OF THE USER AND INSURER ARE CORRECT */
/* -------------------------------------------------------------------------- */

describe("ParametricInsurance - constructor", function() {
  it("initializes contract state correctly", async function() {
    const [deployer] = await ethers.getSigners()
    const client = deployer

    const Insurance = await ethers.getContractFactory("ParametricInsurance")
    const insurance = await Insurance.deploy(deployer.address, client.address)

    expect(await insurance.insurer()).to.equal(deployer.address)
    expect(await insurance.client()).to.equal(client.address)
    expect(await insurance.contractActive()).to.equal(true)
    expect(await insurance.shouldPayClient()).to.equal(false)
    expect(await insurance.currentTemperature()).to.equal(0)
  })
})

/* -------------------------------------------------------------------------- */
/*  executeRequest MODIFIER TESTS — ORACLE ADDRESS / TIME / CONTRACT STATE     */
/* -------------------------------------------------------------------------- */

describe("ParametricInsurance - executeRequest", function() {
  it("executeRequest reverts without a valid oracle", async function() {
    const [deployer] = await ethers.getSigners()

    const Insurance = await ethers.getContractFactory("ParametricInsurance")
    const insurance = await Insurance.deploy(deployer.address, deployer.address)

    await network.provider.send("evm_increaseTime", [61])
    await network.provider.send("evm_mine")

    await expect(insurance.executeRequest("return Functions.encodeUint256(50);", "0x", [], 1, 300000)).to.be.reverted
  })

  it("reverts if executeRequest is called before one day has passed", async function() {
    const [deployer] = await ethers.getSigners()

    const Insurance = await ethers.getContractFactory("ParametricInsurance")
    const insurance = await Insurance.deploy(deployer.address, deployer.address)

    await expect(
      insurance.executeRequest("return Functions.encodeUint256(50);", "0x", [], 1, 300000)
    ).to.be.revertedWith("One check per day")
  })

  it("reverts if contract is not active", async function() {
    const [deployer] = await ethers.getSigners()

    const Insurance = await ethers.getContractFactory("ParametricInsurance")
    const insurance = await Insurance.deploy(deployer.address, deployer.address)

    await network.provider.send("evm_increaseTime", [61])
    await network.provider.send("evm_mine")

    await network.provider.send("hardhat_setStorageAt", [
      insurance.address,
      "0x7",
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    ])

    await expect(insurance.executeRequest("return Functions.encodeUint256(50);", "0x", [], 1, 300000)).to.be.reverted
  })
})

/* -------------------------------------------------------------------------- */
/*  fulfillRequest RESPONSE HANDLING & COLD DAY COUNTING TESTS                */
/* -------------------------------------------------------------------------- */

describe("ParametricInsurance - fulfillRequest", function() {
  it("stores response and updates current temperature", async function() {
    const [deployer] = await ethers.getSigners()

    const Helper = await ethers.getContractFactory("ParametricInsuranceTestHelper")
    const insurance = await Helper.deploy(deployer.address, deployer.address)

    const temperature = 50
    const encodedResponse = ethers.utils.defaultAbiCoder.encode(["uint256"], [temperature])

    await insurance.testFulfillRequest(ethers.constants.HashZero, encodedResponse, "0x")

    expect(await insurance.currentTemperature()).to.equal(temperature)
    expect(await insurance.latestResponse()).to.equal(encodedResponse)
  })

  it("increments consecutiveColdDays when temperature is cold", async function() {
    const [deployer] = await ethers.getSigners()

    const Helper = await ethers.getContractFactory("ParametricInsuranceTestHelper")
    const insurance = await Helper.deploy(deployer.address, deployer.address)

    const cold = ethers.utils.defaultAbiCoder.encode(["uint256"], [50])

    await insurance.testFulfillRequest(ethers.constants.HashZero, cold, "0x")
    expect(await insurance.consecutiveColdDays()).to.equal(1)

    await insurance.testFulfillRequest(ethers.constants.HashZero, cold, "0x")
    expect(await insurance.consecutiveColdDays()).to.equal(2)
  })

  it("resets consecutiveColdDays when temperature is warm", async function() {
    const [deployer] = await ethers.getSigners()

    const Helper = await ethers.getContractFactory("ParametricInsuranceTestHelper")
    const insurance = await Helper.deploy(deployer.address, deployer.address)

    const cold = ethers.utils.defaultAbiCoder.encode(["uint256"], [50])
    const warm = ethers.utils.defaultAbiCoder.encode(["uint256"], [80])

    await insurance.testFulfillRequest(ethers.constants.HashZero, cold, "0x")
    expect(await insurance.consecutiveColdDays()).to.equal(1)

    await insurance.testFulfillRequest(ethers.constants.HashZero, warm, "0x")
    expect(await insurance.consecutiveColdDays()).to.equal(0)
  })
})

/* -------------------------------------------------------------------------- */
/*  PAYOUT CONTRACT TEST — FULL INSURANCE LIFECYCLE                            */
/* -------------------------------------------------------------------------- */

describe("ParametricInsurance - payoutContract", function() {
  it("pays client and deactivates contract after 3 consecutive cold days", async function() {
    const [deployer] = await ethers.getSigners()

    const Helper = await ethers.getContractFactory("ParametricInsuranceTestHelper")
    const insurance = await Helper.deploy(deployer.address, deployer.address)

    // fund the insurance contract
    await deployer.sendTransaction({
      to: insurance.address,
      value: ethers.utils.parseEther("1"),
    })

    const cold = ethers.utils.defaultAbiCoder.encode(["uint256"], [50])

    const balanceBefore = await ethers.provider.getBalance(deployer.address)

    // 3 consecutive cold days
    await insurance.testFulfillRequest(ethers.constants.HashZero, cold, "0x")
    await insurance.testFulfillRequest(ethers.constants.HashZero, cold, "0x")
    await insurance.testFulfillRequest(ethers.constants.HashZero, cold, "0x")

    const balanceAfter = await ethers.provider.getBalance(deployer.address)

    expect(balanceAfter).to.be.gt(balanceBefore)
    expect(await insurance.contractActive()).to.equal(false)
    expect(await insurance.shouldPayClient()).to.equal(true)
  })
})
