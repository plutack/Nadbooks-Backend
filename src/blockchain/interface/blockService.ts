import {
  JsonRpcProvider,
  Interface,
  formatEther,
  getAddress,
  formatUnits,
  Wallet,
  Contract,
  parseEther,
} from "ethers";

import { batchAbi } from "./batchAbi";
import { entryPointAbi } from "./entryPointAbi";

interface IBlockPaymentService {
  createPaymentReference(input: { amount: number; wallet: string }): {
    amount: number;
    wallet: string;
  };
  verifyPayment(
    hash: string,
    buyerAddressddress: string,
    transferedAmount: number
  ): Promise<{
    status: "success" | "failed";
    amount: number;
    currency: string;
    hash: string;
  }>;

  swapNairaToBooks(
    amount: number,
    address: string
  ): Promise<{
    status: "success" | "failed";
    amount: number;
    currency: string;
    hash: string;
  }>;
}

const RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";

const provider = new JsonRpcProvider(RPC_URL);

const contractAddress = "0x743d45BB0926a1EaCD97a06d8e7e92BEe2f7632b";
const shopsWallet = "0x9735300E77182c6381a776da2e318ae9C20aF099";
const pKey = "659c7e19ca9a81b6612aa0047bf209f42adfe8b6b57334ad14bb659ae4cdcd40";
const wallet = new Wallet(pKey, provider);

export class BlockPaymentService implements IBlockPaymentService {
  // this create the books payment transaction for the frontend

  createPaymentReference(input: { amount: number; wallet: string }): {
    amount: number;
    wallet: string;
  } {
    return {
      amount: input.amount,
      wallet: input.wallet,
    };
  }

  // this verifies the books token transaction for the backend

  async verifyPayment(
    hash: string,
    buyerAddress: string,
    transferedAmount: number
  ): Promise<{
    status: "success" | "failed";
    amount: number;
    currency: string;
    hash: string;
  }> {
    try {
      let amount!: number;
      let currency;
      const waitForTx = await provider.waitForTransaction(hash);
      if (waitForTx) {
        const tx = await provider.getTransaction(hash);
        if (tx) {
          console.log(tx);
          const decodedTransfer = decodeTransfer(tx);
          if (decodedTransfer) {
            const walletTransferedTo = decodedTransfer.transfer[0];
            const amountTransfered = decodedTransfer.transfer[1];
            console.log("wallet to transfer : ", walletTransferedTo);
            if (
              decodedTransfer.sender.toLowerCase() !==
              buyerAddress.toLowerCase()
            ) {
              throw new Error("invalid buyer address");
            }
            if (
              decodedTransfer.to?.toLowerCase() !==
              contractAddress.toLowerCase()
            ) {
              throw new Error("invalid contract address");
            }
            if (
              walletTransferedTo.toLowerCase() !== shopsWallet.toLowerCase()
            ) {
              throw new Error("invalid reciever address");
            }
            if (Number(formatEther(amountTransfered)) !== transferedAmount) {
              throw new Error("invalid transfer amount");
            }

            amount = Number(formatEther(amountTransfered));
          }
        }
        const receipt = await provider.getTransactionReceipt(hash);
        if (receipt?.status === 1) {
          console.log("tx confirmed", hash);
        } else {
          console.log("tx pending or failed", hash);
        }
      }
      console.log({
        status: "success",
        amount: amount,
        currency: "bks",
        hash: hash,
      });
      return { status: "success", amount: amount, currency: "bks", hash: hash };
    } catch (err) {
      console.log(err);
      return { status: "failed", amount: 10, currency: "bks", hash: hash };
    }
  }

  async swapNairaToBooks(
    amount: number,
    address: string
  ): Promise<{
    status: "success" | "failed";
    amount: number;
    currency: string;
    hash: string;
  }> {
    try {
      const erc20Abi = ["function transfer(address to, uint256 amount)"];
      const bookContract = new Contract(contractAddress, erc20Abi, wallet);
      const transfer = await bookContract.transfer(
        address,
        parseEther(amount.toString())
      );
      const reciept = await provider.waitForTransaction(transfer.hash);
      console.log(reciept);
      console.log({
        status: "success",
        amount: amount,
        currency: "bks",
        hash: transfer.hash,
      });
      return {
        status: "success",
        amount: amount,
        currency: "bks",
        hash: transfer.hash,
      };
    } catch (err) {
      console.log(err);
      return { status: "failed", amount: amount, currency: "bks", hash: "" };
    }
  }
}

// this decodes the transanction data to get information about the transaction

function decodeTransfer(tx: any) {
  let transferData;
  if (tx.to.toLowerCase() === contractAddress.toLowerCase()) {
    transferData = decodeNormalTransaction(tx);
  } else {
    transferData = decodeEmailTransaction(tx);
  }
  return transferData;
}

// this decodes normal wallet transaction

function decodeNormalTransaction(tx: any) {
  const iface = new Interface([
    "function transfer(address to, uint256 amount)",
  ]);
  const transfer = iface.decodeFunctionData("transfer", tx.data);
  console.log("decoded transfer : ", transfer);
  return { sender: tx.from, to: tx.to, transfer };
}

// this decodes email wallet transaction

function decodeEmailTransaction(tx: any) {
  try {
    const handleOpsInterface = new Interface(entryPointAbi);

    const decodedHandleOps = handleOpsInterface.decodeFunctionData(
      "handleOps",
      tx.data
    );

    // Extract parameters
    const ops = decodedHandleOps[0]; // Array of UserOperation
    const beneficiary = decodedHandleOps[1]; // Beneficiary address

    console.log("Beneficiary:", beneficiary);

    // Decode the first UserOperation
    const userOp = ops[0];
    console.log({
      sender: userOp.sender,
      nonce: userOp.nonce.toString(),
      initCode: userOp.initCode,
      callData: userOp.callData,
      callGasLimit: userOp.callGasLimit.toString(),
      verificationGasLimit: userOp.verificationGasLimit.toString(),
      preVerificationGas: userOp.preVerificationGas.toString(),
      maxFeePerGas: userOp.maxFeePerGas.toString(),
      maxPriorityFeePerGas: userOp.maxPriorityFeePerGas.toString(),
      paymasterAndData: userOp.paymasterAndData,
      signature: userOp.signature,
    });

    const batchInterface = new Interface(batchAbi);

    // 2. ABI for the inner function (standard ERC-20 transfer)
    // Selector 0xa9059cbb matches: transfer(address,uint256)
    const erc20Abi = ["function transfer(address to, uint256 amount)"];
    const erc20Interface = new Interface(erc20Abi);

    const decodedBatch = batchInterface.parseTransaction({
      data: userOp.callData,
    });
    console.log(decodedBatch);
    const tranferData = decodedBatch?.args[2];
    console.log(tranferData);

    const transfer = erc20Interface.decodeFunctionData("transfer", tranferData);
    console.log(transfer);
    return { sender: userOp.sender, to: decodedBatch?.args[0], transfer };
  } catch (err) {
    console.log(err);
  }
}
