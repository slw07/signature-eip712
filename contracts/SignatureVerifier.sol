// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract SignatureVerifier is EIP712 {
    using ECDSA for bytes32;

    // 定义结构体
    struct Order {
        address maker;
        uint256 amount;
        uint256 nonce;
    }

    // 用于防止重放攻击的nonce映射
    mapping(address => uint256) public nonces;

    // 类型哈希常量
    bytes32 public constant ORDER_TYPEHASH = keccak256(
        "Order(address maker,uint256 amount,uint256 nonce)"
    );

    event Debug(bytes32 digest, address recovered, address maker);

    constructor() EIP712("SignatureVerifier", "1.0.0") {}

    // 添加一个函数来获取消息哈希，用于调试
    function getMessageHash(Order calldata order) external view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(
            ORDER_TYPEHASH,
            order.maker,
            order.amount,
            order.nonce
        )));
    }

    // 验证签名并执行操作
    function executeOrder(Order calldata order, bytes calldata signature) external {
        require(order.maker != address(0), "Invalid maker address");
        require(signature.length == 65, "Invalid signature length");
        
        // 验证nonce
        require(order.nonce == nonces[order.maker], "Invalid nonce");
        
        // 验证签名者
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
            ORDER_TYPEHASH,
            order.maker,
            order.amount,
            order.nonce
        )));

        address signer = ECDSA.recover(digest, signature);
        
        // 输出调试信息
        emit Debug(digest, signer, order.maker);
        
        require(signer == order.maker, "Invalid signature");

        // 增加nonce防止重放
        nonces[order.maker]++;

        // 这里可以添加你的业务逻辑
        emit OrderExecuted(order.maker, order.amount, order.nonce);
    }

    // 获取下一个可用的nonce
    function getNextNonce(address maker) external view returns (uint256) {
        return nonces[maker];
    }

    event OrderExecuted(address maker, uint256 amount, uint256 nonce);
} 