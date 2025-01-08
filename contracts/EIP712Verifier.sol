// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EIP712Verifier {
    string private constant SIGNING_DOMAIN = "EIP712Verifier";
    string private constant SIGNATURE_VERSION = "1";

    // 合约中添加 nonce 参数
    struct Data {
        address user;
        uint256 value;
        uint256 nonce; // 添加 nonce
    }

    // 更新 DATA_TYPEHASH 以包含 nonce
    bytes32 private constant DATA_TYPEHASH = keccak256("Data(address user,uint256 value,uint256 nonce)");

    bytes32 private DOMAIN_SEPARATOR;

    constructor() {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version)"),
                keccak256(bytes(SIGNING_DOMAIN)),
                keccak256(bytes(SIGNATURE_VERSION))
            )
        );
    }

    // 更新 verifySignature 函数
    function verifySignature(Data calldata data, bytes calldata signature) external view returns (bool) {
        bytes32 structHash = keccak256(abi.encode(DATA_TYPEHASH, data.user, data.value, data.nonce)); // 使用 nonce
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));

        (address recovered, ) = ecrecover(digest, uint8(signature[64]), bytes32(signature[0:32]), bytes32(signature[32:64]));
        return recovered == data.user;
    }
}