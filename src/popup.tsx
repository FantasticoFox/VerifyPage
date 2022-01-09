import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import {
  Box,
  ChakraProvider,
  Heading,
  Button,
  Flex,
  Stack,
  Spacer,
  Text,
} from "@chakra-ui/react";
import NavBar from "./components/NavBar";
import Clipboard from "clipboard";
import "./assets/scss/styles.scss";

import {
  verifyPage,
  extractPageTitle,
  BadgeColorNA,
  BadgeColorBlue,
  getUrlObj,
  sanitizeWikiUrl,
  verificationStatusMap,
} from "./verifier";
import { formatPageInfo2HTML } from "data-accounting-external-verifier";

const clipboard = new Clipboard(".clipboard-button");

const Popup = () => {
  const [pageTitle, setPageTitle] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("");
  const [currentURL, setCurrentURL] = useState<string>();
  const [verificationLog, setVerificationLog] = useState("");

  function prepareAndSetVerificationStatus(
    sanitizedUrl: string,
    extractedPageTitle: string
  ) {
    chrome.cookies
      .get({ url: sanitizedUrl, name: extractedPageTitle })
      .then((cookie: any) => {
        const badgeStatus = (!!cookie && cookie.value.toString()) || "N/A";
        const somethingBadHappened =
          '<div style="color: Black; font-size: larger;">Unknown error</div> Unexpected badge status: ' +
          badgeStatus;
        const verificationStatusMessage =
          verificationStatusMap[badgeStatus] || somethingBadHappened;
        setVerificationStatus(verificationStatusMessage);
      });
  }

  useEffect(() => {
    chrome.tabs.query(
      { active: true, currentWindow: true },
      async function (tabs) {
        const tab = tabs[0];
        setCurrentURL(tab.url);
        if (!tab.url) {
          return;
        }

        const urlObj = getUrlObj(tab);
        const extractedPageTitle = extractPageTitle(urlObj);
        if (!extractedPageTitle) {
          return;
        }
        const sanitizedUrl = sanitizeWikiUrl(tab.url);

        // TODO The following steps are almost identical to setPopupInfo.
        // Refactor.
        setPageTitle(extractedPageTitle);
        prepareAndSetVerificationStatus(sanitizedUrl, extractedPageTitle);
        const jsonData = await chrome.storage.local.get(sanitizedUrl);
        if (!jsonData[sanitizedUrl]) {
          return;
        }
        formatDetailsAndSetVerificationLog(JSON.parse(jsonData[sanitizedUrl]));
      }
    );
  }, []);

  function formatDetailsAndSetVerificationLog(data: { [key: string]: any }) {
    const verbose = false;
    const out = formatPageInfo2HTML(
      data.serverUrl,
      data.title,
      data.status,
      data.details,
      verbose
    );
    setVerificationLog(out);
  }

  function setPopupInfo(data: { [key: string]: any }) {
    setPageTitle(data.title);
    prepareAndSetVerificationStatus(data.sanitizedUrl, data.title);
    formatDetailsAndSetVerificationLog(data);
  }

  const handleVerifyPageClick = () => {
    verifyPage(pageTitle, setPopupInfo);
  };

  return (
    <ChakraProvider>
      <Stack direction="column" minW="700px">
        <NavBar onVerifyClick={handleVerifyPageClick} />
        <Flex direction="row" paddingTop={2} paddingRight={4}>
          <Stack direction="column" w="80px" paddingX={4}>
            <Button>A</Button>
            <Button>B</Button>
          </Stack>
          <Box width="100%">
            <Flex direction="row">
              <Heading fontSize="2xl">
                {pageTitle ? pageTitle : "[Unsupported]"}
              </Heading>
              <Spacer />
              <Text>CURRENT PAGE</Text>
            </Flex>
            <Box
              border="dashed 4px #65B045"
              rounded={10}
              paddingX={10}
              paddingY={4}
              marginY={2}
            >
              <Text color="blackAlpha.600">PAGE INTEGRETY</Text>
              <Box
                fontSize="xl"
                dangerouslySetInnerHTML={{ __html: verificationStatus }}
              />
            </Box>
            <div dangerouslySetInnerHTML={{ __html: verificationLog }}></div>
          </Box>
        </Flex>
      </Stack>
    </ChakraProvider>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
  document.getElementById("root")
);
