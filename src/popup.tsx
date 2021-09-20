import * as http from "http";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

import { verifyPage, extractPageTitle, BadgeColorNA, BadgeColorBlue, getUrlObj } from "./verifier";

// TODO this is totally not idiomatic.
const verificationStatusMap: { [key: string]: string } = {
  // See the color in verifier.ts
  // Apple
  'VERIFIED': '<div style="color: #65B045; font-size: larger;">Page integrity validated</div> Information on this page has not been tampered with.',
  // Fire Engine Red
  'INVALID': '<div style="color: #FF0018; font-size: larger;">Page integrity verification failed</div> Information on this page can\'t be trusted.',
  'NORECORD': '<div style="color: ' + BadgeColorBlue + '; font-size: larger;">Data accounting supported but no record available</div> Information on this page might have been tampered.',
  'N/A': '<div style="color: ' + BadgeColorNA + '; font-size: larger;">No record available</div> Information on this page might have been tampered.',
}

const Popup = () => {
  const [pageTitle, setPageTitle] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [currentURL, setCurrentURL] = useState<string>();
  const [verificationLog, setVerificationLog] = useState('');

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
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
      setPageTitle(extractedPageTitle);
      const sanitizedUrl = tab.url.split('?')[0];
      chrome.cookies.get({url: sanitizedUrl, name: extractedPageTitle}, (cookie: any) => {
        const badgeStatus = (!!cookie && cookie.value.toString()) || 'N/A';
        const somethingBadHappened = '<div style="color: Black; font-size: larger;">Unknown error</div> Unexpected badge status: ' + badgeStatus;
        const verificationStatusMessage = verificationStatusMap[badgeStatus] || somethingBadHappened;
        setVerificationStatus(verificationStatusMessage);
      });
      chrome.storage.sync.get(sanitizedUrl, (data) => {
        if (!data[sanitizedUrl]) {
          return;
        }
        setVerificationLog(data[sanitizedUrl]);
      });
    });
  }, []);

  return (
    <>
      <div style={{ fontSize: "larger" }}>
        <button
          onClick={() => verifyPage(pageTitle, setVerificationLog)}
          style={{ float: "right" }}
        >
          Verify Page
        </button>
        <div dangerouslySetInnerHTML={{ __html: verificationStatus}}>
        </div>
        <ul style={{ minWidth: "700px" }}>
          <li>Current Page Title: {pageTitle}</li>
        </ul>
        <div dangerouslySetInnerHTML={{ __html: verificationLog}}>
        </div>
      </div>
    </>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
  document.getElementById("root")
);
