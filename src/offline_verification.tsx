import * as http from "http";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import Clipboard from "clipboard";
import wtf from "wtf_wikipedia";
import "./assets/scss/styles.scss";

// Not yet typed
// @ts-ignore
import wtfPluginHtml from "wtf-plugin-html";
// This is taking 154 KiB space of the vendor.js bundle strangely.
// TODO investigate.
import Mime from "mime-types";

import {
  verifyPage,
  extractPageTitle,
  BadgeColorNA,
  BadgeColorBlue,
  getUrlObj,
  sanitizeWikiUrl,
  verificationStatusMap,
} from "./verifier";
// Not yet typed
// @ts-ignore
import { verifyPage as externalVerifierVerifyPage, formatPageInfo2HTML } from "data-accounting-external-verifier";

const clipboard = new Clipboard(".clipboard-button");
wtf.extend(wtfPluginHtml);

// We list the image extensions supported in
// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#supported_image_formats
// The file extensions are extracted from
// https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types
const supportedImageExtensions = [
  "apng",
  "avif",
  "gif",
  "jpg",
  "jpeg",
  "jfif",
  "pjpeg",
  "pjp",
  "png",
  "svg",
  "webp",
];
// See https://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript.
// TODO Maybe it'd be much simpler using fetch(); see the other answers in the URL above.
const b64toBlob = (b64Data: string, contentType = '', sliceSize = 512) => {
  const byteCharacters = atob(b64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays, {type: contentType});
  return blob;
}

const OfflineVerification = () => {
  const [pageTitle, setPageTitle] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("");
  const [currentURL, setCurrentURL] = useState<string>();
  const [verificationLog, setVerificationLog] = useState("");
  const [wikiPage, setWikiPage] = useState("");

  function prepareAndSetVerificationStatus(
    status: string
  ) {
    const somethingBadHappened =
      '<div style="color: Black; font-size: larger;">Unknown error</div> Unexpected badge status: ' +
      status;
    const verificationStatusMessage =
      verificationStatusMap[status] || somethingBadHappened;
    setVerificationStatus(verificationStatusMessage);
  }

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

  function setPopupInfo(status: string, data: { [key: string]: any }) {
    setPageTitle(data.title);
    prepareAndSetVerificationStatus(status);
    formatDetailsAndSetVerificationLog(data);
  }

  function getLastRevisionHtml(revisions: { [key: string]: any }) {
    const vhs = Object.keys(revisions);
    const lastVH = vhs[vhs.length - 1];
    const lastRevision = revisions[lastVH];
    const wikitext = lastRevision.content.content["main"];
    // @ts-ignore
    const wikiHtml = wtf(wikitext).html();
    let fileContent = "";
    if ("file" in lastRevision.content) {
      // If there is a file, create a download link.
      const mimeType = Mime.lookup(lastRevision.content.file.filename) || "application/octet-stream";
      const fileExtension = Mime.extension(mimeType) || "unknown";
      const blob = b64toBlob(lastRevision.content.file.data, mimeType);
      // The in-RAM file will be garbage-collected once the tab is closed.
      const blobUrl = URL.createObjectURL(blob);
      fileContent = `<a href='${blobUrl}' target='_blank' download='${lastRevision.content.file.filename}'>Access file</a>`;
      if (supportedImageExtensions.includes(fileExtension)) {
        // If the file is an image supported in HTML, display it.
        fileContent += `<div><img src='data:${mimeType};base64,` + lastRevision.content.file.data + "'></div>";
      }
    }
    return wikiHtml + fileContent;
  }

  function offlineVerifyPage() {
    const filesElements = document.getElementById("file") as HTMLInputElement;
    if (!(filesElements && filesElements.files && filesElements.files[0])) {
    }
    const file = filesElements.files![0];
    const reader = new FileReader();
    reader.onload = async function(e) {
      if (!(e && e.target && e.target.result)) {
        return;
      }
      const verbose = false;
      const doVerifyMerkleProof = true;
      const offline_data = JSON.parse(e.target.result as string);
      // This is for displaying the content.
      // TODO move this to be later once the deletion of revision content from
      // details has been removed.
      const lastRevisionHtml = getLastRevisionHtml(offline_data.revisions);

      const [verificationStatus, details] = await externalVerifierVerifyPage(
        {offline_data},
        verbose,
        doVerifyMerkleProof,
        null
      );
      const title = offline_data.title;
      const serverUrl = "http://offline_verify_page"
      const verificationData = {
        serverUrl,
        title,
        status: verificationStatus,
        details: details,
      };
      setPopupInfo(verificationStatus, verificationData);
      setWikiPage(lastRevisionHtml);
    }
    reader.readAsText(file);
  }

  return (
    <>
      <div style={{ fontSize: "larger" }}>
        <button
          onClick={offlineVerifyPage}
          style={{ float: "right" }}
        >
          Verify File
        </button>
        <input
          type="file"
          id="file"
          style={{ float: "right" }}
        />
        <div dangerouslySetInnerHTML={{ __html: verificationStatus }}></div>
        <ul style={{ minWidth: "700px" }}>
          <li>
            {pageTitle ? "Current Page Title: " + pageTitle : "Select a PKC export JSON file"}
          </li>
        </ul>
        <div dangerouslySetInnerHTML={{ __html: verificationLog }}></div>
        <hr/>
        <div dangerouslySetInnerHTML={{ __html: wikiPage }}></div>
      </div>
    </>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <OfflineVerification />
  </React.StrictMode>,
  document.getElementById("root")
);
