import {
  Heading,
  Box,
  Badge,
  Progress,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Text,
} from "@chakra-ui/react";
import RevisionRow from "./RevisionRow";

interface VerificationLogProps {
  verificationLog: any;
}
import type { RevisionProps } from "../../utils/formatPageInfo";
// TODO: use better Revision typing
const VerificationLog = ({ verificationLog }: VerificationLogProps) => {
  const { count, revisions } = verificationLog;
  const revisionCount = revisions.length;
  return (
    <Box p={4} mb={4}>
      {!count ? (
        <Progress size="xs" isIndeterminate />
      ) : (
        <>
          <Box display="flex" mb={2}>
            <Heading as="h3">
              <Badge fontSize="inherit" variant="solid" mr={2}>
                {count}
              </Badge>
              Page Revisions
            </Heading>
            <Text ml={2}>Successfully parsed revisions: {revisionCount}</Text>
          </Box>
          <Table variant="striped" size="md">
            <Thead>
              <Tr>
                <Th>ID</Th>
                <Th>Time (UTC)</Th>
                <Th>Domain ID</Th>
                <Th>Verification Hash Matches</Th>
                <Th>Information</Th>
                <Th>Signature</Th>
              </Tr>
            </Thead>
            <Tbody>
              {revisions.map((revision: RevisionProps, index: number) => (
                <RevisionRow
                  key={`${index}-${revision.id}`}
                  index={index}
                  revision={revision}
                />
              ))}
            </Tbody>
          </Table>
        </>
      )}
    </Box>
  );
};

export default VerificationLog;
