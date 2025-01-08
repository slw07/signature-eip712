const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
    // Sepolia 网络配置
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const CONTRACT_ADDRESS = "0x661BA295CCb1b6e1940c71dAB198001207DE1A8E";
    const RPC_URL = "https://sepolia.infura.io/v3/YOUR-PROJECT-ID"; // 请替换为你的 Infura Project ID

    // 连接到 Sepolia
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('使用的钱包地址:', wallet.address);
    
    // 获取当前网络信息
    const network = await provider.getNetwork();
    console.log('当前网络:', {
        chainId: network.chainId,
        name: network.name
    });

    // EIP-712 类型定义
    const domain = {
        name: 'SignatureVerifier',
        version: '1.0.0',
        chainId: 11155111, // Sepolia 的 chainId
        verifyingContract: CONTRACT_ADDRESS
    };

    console.log('Domain数据:', domain);

    const types = {
        Order: [
            { name: 'maker', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'nonce', type: 'uint256' }
        ]
    };

    try {
        // 获取合约实例
        const verifierABI = [
            {
                "inputs": [],
                "stateMutability": "nonpayable",
                "type": "constructor"
            },
            {
                "anonymous": false,
                "inputs": [
                    {
                        "indexed": false,
                        "internalType": "bytes32",
                        "name": "digest",
                        "type": "bytes32"
                    },
                    {
                        "indexed": false,
                        "internalType": "address",
                        "name": "recovered",
                        "type": "address"
                    },
                    {
                        "indexed": false,
                        "internalType": "address",
                        "name": "maker",
                        "type": "address"
                    }
                ],
                "name": "Debug",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    {
                        "indexed": false,
                        "internalType": "address",
                        "name": "maker",
                        "type": "address"
                    },
                    {
                        "indexed": false,
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    },
                    {
                        "indexed": false,
                        "internalType": "uint256",
                        "name": "nonce",
                        "type": "uint256"
                    }
                ],
                "name": "OrderExecuted",
                "type": "event"
            },
            {
                "inputs": [
                    {
                        "components": [
                            {
                                "internalType": "address",
                                "name": "maker",
                                "type": "address"
                            },
                            {
                                "internalType": "uint256",
                                "name": "amount",
                                "type": "uint256"
                            },
                            {
                                "internalType": "uint256",
                                "name": "nonce",
                                "type": "uint256"
                            }
                        ],
                        "internalType": "struct SignatureVerifier.Order",
                        "name": "order",
                        "type": "tuple"
                    },
                    {
                        "internalType": "bytes",
                        "name": "signature",
                        "type": "bytes"
                    }
                ],
                "name": "executeOrder",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "components": [
                            {
                                "internalType": "address",
                                "name": "maker",
                                "type": "address"
                            },
                            {
                                "internalType": "uint256",
                                "name": "amount",
                                "type": "uint256"
                            },
                            {
                                "internalType": "uint256",
                                "name": "nonce",
                                "type": "uint256"
                            }
                        ],
                        "internalType": "struct SignatureVerifier.Order",
                        "name": "order",
                        "type": "tuple"
                    }
                ],
                "name": "getMessageHash",
                "outputs": [
                    {
                        "internalType": "bytes32",
                        "name": "",
                        "type": "bytes32"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "maker",
                        "type": "address"
                    }
                ],
                "name": "getNextNonce",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "",
                        "type": "address"
                    }
                ],
                "name": "nonces",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            }
        ];
        
        const verifierContract = new ethers.Contract(
            CONTRACT_ADDRESS,
            verifierABI,
            provider
        );

        // 创建订单对象
        const nonce = await verifierContract.getNextNonce(wallet.address);
        console.log('获取到的 nonce:', nonce.toString());

        const order = {
            maker: wallet.address,
            amount: ethers.parseEther('1.0'),
            nonce: nonce
        };

        console.log('订单数据:', {
            maker: order.maker,
            amount: order.amount.toString(),
            nonce: order.nonce.toString()
        });

        // 获取合约中计算的消息哈希
        const contractMessageHash = await verifierContract.getMessageHash(order);
        console.log('合约计算的消息哈希:', contractMessageHash);

        // 生成签名
        const signature = await wallet.signTypedData(
            domain,
            { Order: types.Order },
            order
        );
        console.log('生成的签名:', signature);

        // 本地验证签名
        const recoveredAddress = ethers.verifyTypedData(
            domain,
            { Order: types.Order },
            order,
            signature
        );
        console.log('本地验证结果:', {
            recoveredAddress: recoveredAddress,
            walletAddress: wallet.address,
            isValid: recoveredAddress === wallet.address
        });

        // 监听Debug事件
        verifierContract.on('Debug', (digest, recovered, maker) => {
            console.log('合约Debug事件:', {
                digest: digest,
                recovered: recovered,
                maker: maker
            });
        });

        // 执行交易
        console.log('开始执行交易...');
        
        // 构造交易参数
        const orderParam = {
            maker: order.maker,
            amount: order.amount,
            nonce: order.nonce
        };

        const tx = await verifierContract.connect(wallet).executeOrder(
            orderParam,
            signature,
            {
                gasLimit: 200000
            }
        );
        
        console.log('交易已发送，哈希:', tx.hash);
        const receipt = await tx.wait();
        console.log('交易已确认，区块号:', receipt.blockNumber);

    } catch (error) {
        console.error('操作失败:', error);
        if (error.data) {
            console.error('错误数据:', error.data);
        }
        if (error.message) {
            console.error('错误信息:', error.message);
        }
        if (error.transaction) {
            console.error('交易数据:', {
                to: error.transaction.to,
                data: error.transaction.data,
                value: error.transaction.value,
                from: error.transaction.from
            });
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    }); 