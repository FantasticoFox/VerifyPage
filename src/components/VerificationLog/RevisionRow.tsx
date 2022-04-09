import { Link, Text, Flex, Box, Tr, Td } from "@chakra-ui/react";
import {
  CheckCircleIcon,
  WarningTwoIcon,
  LockIcon,
  CloseIcon,
} from "@chakra-ui/icons";
import WitnessResult from "./WitnessResult";
import type {
  RevisionProps,
  SignatureDetails,
} from "../../utils/formatPageInfo";

const VerificationHash = ({ isVerified }: { isVerified: boolean }) => {
  return (
    <Flex justifyContent="center">
      {isVerified ? (
        <CheckCircleIcon color="success" boxSize={6} />
      ) : (
        <WarningTwoIcon color="error" boxSize={6} />
      )}
    </Flex>
  );
};

const Signature = ({
  signatureDetails,
}: {
  signatureDetails: SignatureDetails;
}) => {
  const { signatureStatus, walletUrl, walletAddress } = signatureDetails;
  switch (signatureStatus) {
    case "VALID":
      return (
        <Flex direction="column" alignItems="center">
          <Box>
            <CheckCircleIcon color="success" boxSize={6} mr={1} />
            <LockIcon color="success" boxSize={6} />
          </Box>
          <Text textAlign="center" isTruncated>
            <Link href={walletUrl} isExternal textDecoration="underline">
              {walletAddress}
            </Link>
          </Text>
        </Flex>
      );
    case "MISSING":
      return (
        <Flex direction="column" alignItems="center">
          <WarningTwoIcon color="warning" boxSize={6} />
          <Text>Unsigned</Text>
        </Flex>
      );
    default:
      return (
        <Flex direction="column" alignItems="center">
          <Box>
            <CloseIcon color="error" boxSize={6} mr={1} />
            <LockIcon color="error" boxSize={6} />
          </Box>
          <Text>Invalid</Text>
        </Flex>
      );
  }
};

const RevisionRow = ({
  revision,
}: {
  revision: RevisionProps;
  index: number;
}) => {
  const {
    id,
    url,
    time,
    domainId,
    isVerified,
    witnessResult,
    signatureDetails,
    errorMessage,
  } = revision;

  return (
    <Tr>
      <Td>{id}</Td>
      <Td>
        <Text>{time.date}</Text>
        <Text>{time.time}</Text>
      </Td>
      <Td>{domainId}</Td>
      <Td>
        <VerificationHash isVerified={isVerified} />
      </Td>
      <Td style={{ wordWrap: "break-word" }}>
        {errorMessage ? (
          errorMessage
        ) : (
          <WitnessResult witnessResult={witnessResult} />
        )}
      </Td>
      <Td>
        <Signature signatureDetails={signatureDetails} />
      </Td>
    </Tr>
  );
};

export default RevisionRow;
