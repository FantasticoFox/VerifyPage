import { Center, Flex, Heading, Spacer } from "@chakra-ui/react";
import { ReactNode } from "react";

interface NavBarProps {
  toolbar?: ReactNode;
  pageSubtitle?: string;
}

const NavBar = ({ toolbar, pageSubtitle }: NavBarProps) => {
  return (
    <Flex bg="#343a40" width="100%" padding={4}>
      <Center>
        <Heading as="h1" color="white">
          Offline Verifier
        </Heading>
      </Center>
      <Spacer />
      {toolbar ? toolbar : null}
    </Flex>
  );
};

export default NavBar;
