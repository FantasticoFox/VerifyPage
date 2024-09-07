import { Text, List, ListItem, ListIcon, Link } from "@chakra-ui/react";
import { CheckCircleIcon, CloseIcon } from "@chakra-ui/icons";
import type { WitnessResultProps } from "../../utils/formatPageInfo";
import {
  Radar as RadarIcon,
  CompareArrows as CompareArrowsIcon,
} from "@mui/icons-material";
import React from "react";

const WitnessResult = ({
  witnessResult,
}: {
  witnessResult: WitnessResultProps;
}) => {
  if (!witnessResult) return <Text>No Witness event detected</Text>;

  const {
    tx_hash,
    witness_network,
    witness_event_vh_matches,
    merkle_proof_status,
    actual_witness_event_verification_hash,
    extra,
    etherscan_error_message,
  } = witnessResult;

  const etherscanNetworkURL = `https://${witness_network}.etherscan.io/tx/${tx_hash}`;

  const ConditionalIconListItem = ({
    condition,
    title,
    content,
    truncateContent,
  }: {
    condition: boolean;
    title: string;
    content: string;
    truncateContent?: boolean;
  }) => {
    return (
      <ListItem display="flex" alignItems="center" maxWidth="sm">
        <ListIcon
          as={condition ? CheckCircleIcon : CloseIcon}
          color={condition ? "success" : "error"}
          width="20px"
        />
        <Text color="grey">{title}</Text>
        <Text isTruncated={truncateContent} marginLeft={1}>
          {content}
        </Text>
      </ListItem>
    );
  };

  const IconListItem = ({
    icon,
    title,
    content,
    truncateContent,
  }: {
    icon: any;
    title: string;
    content: string | React.ReactNode;
    truncateContent?: boolean;
  }) => {
    return (
      <ListItem display="flex" alignItems="center" maxWidth="sm">
        <ListIcon as={icon} width="20px" />
        <Text color="grey">{title}</Text>
        <Text isTruncated={truncateContent} marginLeft={1}>
          {content}
        </Text>
      </ListItem>
    );
  };

  const Extra = () =>
    // Must return null to render nothing if extra is falsy.
    extra ? (
      <>
        <ListItem>{extra.domain_snapshot_genesis_hash}</ListItem>
        <ListItem>{extra.merkle_root}</ListItem>
        <ListItem>{extra.witness_event_verification_hash}</ListItem>
      </>
    ) : null;

  const ScanNetwork = () => (
    <Link href={etherscanNetworkURL} isExternal textDecoration="underline">
      {witness_network}
    </Link>
  );

  // ⛓ Witness transaction hash 0x17cb36....db79d7
  // ✅ ⌚ Witness event hash has been verified on Goerli
  // ✅ 🌿 Witness Merkle Proof is OK
  // ❌ ⌚ Witness event can not be verified on Goerli
  // ❌ Witness event verification hash doesn't match
  // ❌ 🌿 Witness Merkle Proof is corrupted
  return (
    <List fontSize="sm" maxW="sm" spacing={3}>
      {tx_hash && (
        <IconListItem
          icon={CompareArrowsIcon}
          title="Transaction Hash"
          content={tx_hash}
          truncateContent
        />
      )}
      <ConditionalIconListItem
        condition={witness_event_vh_matches}
        title="Verification Hash"
        content={actual_witness_event_verification_hash}
        truncateContent
      />
      <Extra />
      {etherscan_error_message && (
        <ListItem>{etherscan_error_message}</ListItem>
      )}
      <ConditionalIconListItem
        condition={
          merkle_proof_status === "VALID" ||
          merkle_proof_status === "DOMAIN_SNAPSHOT"
        }
        title="Merkle Proof"
        content={merkle_proof_status}
      />
      <IconListItem
        icon={RadarIcon}
        title="Scanner"
        content={<ScanNetwork />}
      />
    </List>
  );
};

export default WitnessResult;
