import { pathOr } from "ramda";

import type { FormatDBTimestampToObject } from "./timestampFormatter";
import { formatDBTimestampToObject } from "./timestampFormatter";
import type { SignatureData, Witness, SignatureStatus } from "../../types";
import * as nameResolver from "../../name_resolver";

export type RevisionProps = {
  id: number;
  url: string;
  time: FormatDBTimestampToObject; // date
  domainId: string;
  isVerified: boolean;
  witnessDetail: string;
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
      const { data, status, witness_detail, error_message } =
        await revisionDetail;

      const revisionId = pathOr("", ["content", "rev_id"], data);
      const timestamp = pathOr("", ["metadata", "time_stamp"], data);
      const domainId = pathOr("", ["metadata", "domain_id"], data);
      const verification = pathOr("", ["verification"], status);
      const witness = pathOr("", ["witness"], data);
      const signatureData = pathOr("", ["signature"], data);
      const signatureStatus = pathOr("", ["signature"], status);
      const witnessDetail = witness_detail || undefined;

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
        witnessDetail,
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
