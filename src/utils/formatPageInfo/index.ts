import { pathOr } from "ramda";

import type { FormatDBTimestampToObject } from "./timestampFormatter";
import { formatDBTimestampToObject } from "./timestampFormatter";
import type { SignatureData, Witness, SignatureStatus } from "../../types";
import * as nameResolver from "../../name_resolver";

type MerkleProofStatus = "VALID" | "INVALID" | "DOMAIN_SNAPSHOT";

// see: https://github.com/inblockio/aqua-verifier-js/blob/de3432e7309c642159e756ddf7dc49e602ab660d/index.js#L346-L354
export type EtherscanErrorMessage =
  | "Transaction hash not found"
  | "Server is unreachable"
  | "Online lookup failed"
  | undefined;

// see: https://github.com/inblockio/aqua-verifier-js/blob/de3432e7309c642159e756ddf7dc49e602ab660d/index.js#L361-L366
type WitnessResultExtra = {
  domain_snapshot_genesis_hash: string;
  merkle_root: string;
  witness_event_verification_hash: string;
} | null;

export type WitnessResultProps = {
  actual_witness_event_verification_hash: string;
  doVerifyMerkleProof: boolean;
  etherscan_error_message: EtherscanErrorMessage;
  extra: WitnessResultExtra;
  merkle_proof_status: MerkleProofStatus;
  tx_hash: string;
  witness_event_vh_matches: boolean;
  witness_network: "goerli";
};

export type RevisionProps = {
  id: number;
  url: string;
  time: FormatDBTimestampToObject; // date
  domainId: string;
  isVerified: boolean;
  witnessResult: WitnessResultProps;
  witness: Witness;
  signatureDetails: SignatureDetails;
  errorMessage: string;
};

export type SignatureDetails = {
  signatureStatus: SignatureStatus;
  walletUrl: string;
  walletAddress: string;
};

export type FormattedRevisionsData = {
  formatStatus?: string;
  count?: number;
  revisions?: RevisionProps[];
};

const parseWitness = async (witnessData: Witness) => {
  const {
    smart_contract_address,
    witness_event_transaction_hash,
    sender_account_address,
  } = witnessData;

  return {
    ...witnessData,
    smart_contract_address: await nameResolver.resolveNameByAddress(
      smart_contract_address
    ),
    witness_event_transaction_hash: await nameResolver.resolveNameByAddress(
      witness_event_transaction_hash
    ),
    sender_account_address: await nameResolver.resolveNameByAddress(
      sender_account_address
    ),
  };
};

const formatPageInfo = async (
  serverUrl: string,
  title: string,
  status: string,
  details: any
): Promise<FormattedRevisionsData> => {
  let formatStatus;
  if (status === "NORECORD") {
    formatStatus = "No revision record";
    return { formatStatus };
  } else if (status === "N/A" || !details) {
    formatStatus = "";
    return { formatStatus };
  } else if (status === "ERROR") {
    if (details && "error" in details) {
      formatStatus = `ERROR: ${details.error}`;
      return { formatStatus };
    }
    formatStatus = "ERROR: Unknown cause";
    return { formatStatus };
  }

  const nameResolverEnabled = await nameResolver.getEnabledState();

  const count = details.verification_hashes.length;

  let revisions = await Promise.all(
    details.revision_details.map(async (revisionDetail: any): Promise<any> => {
      formatStatus = "Success";
      const { data, status, witness_result, error_message } =
        await revisionDetail;

      const revisionId = pathOr("", ["content", "rev_id"], data);
      const timestamp = pathOr("", ["metadata", "time_stamp"], data);
      const domainId = pathOr("", ["metadata", "domain_id"], data);
      const verification = pathOr("", ["verification"], status);
      const witness = pathOr("", ["witness"], data);
      const signatureData = pathOr("", ["signature"], data);
      const signatureStatus = pathOr("", ["signature"], status);
      const witnessResult = witness_result || undefined;

      const walletAddress = async (signatureData: SignatureData) => {
        let out;
        out = signatureData.wallet_address;
        if (nameResolverEnabled) {
          out = await nameResolver.resolveNameByAddress(
            signatureData.wallet_address
          );
        }
        return out;
      };

      const signatureDetails = {
        signatureStatus,
        walletUrl:
          walletAddress && `${serverUrl}/index.php/User:${walletAddress}`,
        walletAddress: signatureData && (await walletAddress(signatureData)),
      };

      return {
        id: revisionId,
        url:
          revisionId &&
          `${serverUrl}/index.php?title=${title}&oldid=${revisionId}`,
        time: timestamp && formatDBTimestampToObject(timestamp),
        domainId,
        isVerified: verification && verification === "VERIFIED" ? true : false,
        witnessResult,
        witness: witness && (await parseWitness(witness)),
        signatureDetails,
        errorMessage: error_message,
      };
    })
  );

  return {
    count,
    formatStatus,
    revisions,
  };
};

export default formatPageInfo;
