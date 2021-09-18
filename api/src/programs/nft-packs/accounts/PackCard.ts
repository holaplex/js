import { AccountInfo, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { ERROR_INVALID_ACCOUNT_DATA, ERROR_INVALID_OWNER } from '@metaplex/errors';
import { AnyPublicKey, StringPublicKey } from '@metaplex/types';
import { borsh } from '@metaplex/utils';
import { Account } from '../../../Account';
import { NFTPacksAccountType, NFTPacksProgram } from '../NFTPacksProgram';
import { Buffer } from 'buffer';

export enum DistributionType {
  FixedNumber = 0,
  ProbabilityBased = 1,
}

export interface Distribution {
  type: DistributionType;
  value: BN;
}

const distributionStruct = borsh.struct<Distribution>([
  ['type', 'u8'],
  ['value', 'u64'],
]);

export interface PackCardData {
  accountType: NFTPacksAccountType;
  /// Pack set
  packSet: StringPublicKey;
  /// Master edition account
  master: StringPublicKey;
  /// Metadata account
  metadata: StringPublicKey;
  /// Program token account which holds MasterEdition token
  tokenAccount: StringPublicKey;
  /// How many instances of this card exists in all packs
  maxSupply?: number;
  /// Fixed number / probability-based
  distribution: Distribution;
  /// How many cards already minted
  currentSupply: number;
}

const packCardStruct = borsh.struct<PackCardData>(
  [
    ['accountType', 'u8'],
    ['packSet', 'pubkeyAsString'],
    ['master', 'pubkeyAsString'],
    ['metadata', 'pubkeyAsString'],
    ['tokenAccount', 'pubkeyAsString'],
    ['maxSupply', { kind: 'option', type: 'u32' }],
    ['distribution', distributionStruct.type],
    ['currentSupply', 'u32'],
  ],
  [distributionStruct],
  (data) => {
    data.accountType = NFTPacksAccountType.PackCard;
    return data;
  },
);

export class PackCard extends Account<PackCardData> {
  static readonly PREFIX = 'card';

  constructor(pubkey: AnyPublicKey, info: AccountInfo<Buffer>) {
    super(pubkey, info);

    if (!this.assertOwner(NFTPacksProgram.PUBKEY)) {
      throw ERROR_INVALID_OWNER();
    }

    if (!PackCard.isPackCard(this.info.data)) {
      throw ERROR_INVALID_ACCOUNT_DATA();
    }

    this.data = packCardStruct.deserialize(this.info.data);
  }

  static isPackCard(data: Buffer) {
    return data[0] === NFTPacksAccountType.PackCard;
  }

  static getPDA(packSet: AnyPublicKey, index: number) {
    return NFTPacksProgram.findProgramAddress([
      Buffer.from(PackCard.PREFIX),
      new PublicKey(packSet).toBuffer(),
      Buffer.from(index.toString()),
    ]);
  }
}
