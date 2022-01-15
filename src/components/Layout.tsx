import { ChakraProvider } from "@chakra-ui/react";
import { ReactNode } from "react";
import NavBar from "./NavBar";
import theme from "./styles/theme";
import Fonts from "./styles/theme/Fonts";

interface LayoutProps {
  children: ReactNode;
  toolbar?: ReactNode;
  pageSubtitle?: string;
}

const Layout = ({ children, toolbar, pageSubtitle }: LayoutProps) => {
  return (
    <ChakraProvider theme={theme}>
      <Fonts />
      <NavBar toolbar={toolbar} pageSubtitle={pageSubtitle} />
      {children}
    </ChakraProvider>
  );
};

export default Layout;
