import { Heading, Box } from "@chakra-ui/react";
import VerificationStatus from "../VerificationStatus";
interface VerificationSummaryProps {
  pageTitle: string;
  verificationStatus: any;
}

const VerificationSummary = ({
  pageTitle,
  verificationStatus,
}: VerificationSummaryProps) => {
  return (
    <Box mb={4}>
      <Heading as="h2" mb={2}>
        {pageTitle}
      </Heading>
      <Box border="dashed 1px #c9c9c9" rounded={2} p={3}>
        <VerificationStatus verificationStatus={verificationStatus} />
      </Box>
    </Box>
  );
};

export default VerificationSummary;
