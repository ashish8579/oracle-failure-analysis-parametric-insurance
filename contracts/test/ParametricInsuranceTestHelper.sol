
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../ParametricInsurance.sol";

contract ParametricInsuranceTestHelper is ParametricInsurance {
  constructor(address oracle, address client)
    ParametricInsurance(oracle, client) {}

  function testFulfillRequest(
    bytes32 requestId,
    bytes calldata response,
    bytes calldata err
  ) external {
    fulfillRequest(requestId, response, err);
  }
}
