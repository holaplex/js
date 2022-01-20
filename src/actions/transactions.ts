import { Keypair, SendOptions } from '@solana/web3.js';
import { SmartInstructionSender } from '@holaplex/solana-web3-tools';
import { Wallet } from '../wallet';
import { Connection } from '../Connection';
import { Transaction } from '../Transaction';

interface ISendTransactionParams {
  connection: Connection;
  wallet: Wallet;
  txs: Transaction[];
  signers?: Keypair[];
  options?: SendOptions;
}

export const sendTransaction = async ({
  connection,
  wallet,
  txs,
  signers = [],
  options,
}: ISendTransactionParams): Promise<string> => {
  let tx = Transaction.fromCombined(txs, { feePayer: wallet.publicKey });
  tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;

  if (signers.length) {
    tx.partialSign(...signers);
  }
  tx = await wallet.signTransaction(tx);

  return connection.sendRawTransaction(tx.serialize(), options);
};

export const sendSmartTransaction = async ({
  connection,
  wallet,
  txs,
  signers,
}: ISendTransactionParams): Promise<string | null> => {
  const instructionSet = {
    instructions: Transaction.fromCombined(txs, { feePayer: wallet.publicKey }).instructions,
    signers,
  };
  let err = null;
  let transactionId: string | null = null;
  const sender = SmartInstructionSender.build(wallet, connection)
    .config({
      abortOnFailure: true,
      commitment: 'confirmed',
      maxSigningAttempts: 3,
    })
    .withInstructionSets([instructionSet])
    .onFailure((error) => {
      err = error;
    })
    .onProgress((_, txId) => {
      transactionId = txId;
    });
  await sender.send();
  if (err) {
    throw err;
  }
  return transactionId;
};
