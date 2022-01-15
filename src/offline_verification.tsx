import * as http from "http";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import Clipboard from "clipboard";
import wtf from "wtf_wikipedia";
import "./assets/scss/styles.scss";

import Uppy from "@uppy/core";
import Tus from "@uppy/tus";
import { Dashboard } from "@uppy/react";
import "@uppy/core/dist/style.css";
import "@uppy/dashboard/dist/style.css";

import wtfPluginHtml from "wtf-plugin-html";
// This is taking 154 KiB space of the vendor.js bundle.
// This is because, the database of mime types (mime-db) is big.
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
import {
  verifyPage as externalVerifierVerifyPage,
  formatPageInfo2HTML,
} from "data-accounting-external-verifier";
import { Center } from "@chakra-ui/react";
import Layout from "./components/Layout";

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
const b64toBlob = (b64Data: string, contentType = "", sliceSize = 512) => {
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

  const blob = new Blob(byteArrays, { type: contentType });
  return blob;
};

type pageResultT = {
  genesis_hash: string;
  domain_id: string;
  latest_verification_hash: string;
  title: string;
  namespace: number;
  chain_height: number;
  revisions: object;
};

const PageVerificationInfo = ({ pageResult }: { pageResult: pageResultT }) => {
  const [pageTitle, setPageTitle] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("");
  const [verificationLog, setVerificationLog] = useState("");
  const [wikiPage, setWikiPage] = useState("");

  function prepareAndSetVerificationStatus(status: string) {
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

  function setResultInfo(status: string, data: { [key: string]: any }) {
    setPageTitle(data.title);
    prepareAndSetVerificationStatus(status);
    formatDetailsAndSetVerificationLog(data);
  }

  function getLastRevisionHtml(revisions: { [key: string]: any }) {
    const vhs = Object.keys(revisions);
    const lastVH = vhs[vhs.length - 1];
    const lastRevision = revisions[lastVH];
    const wikitext = lastRevision.content.content.main;
    // @ts-ignore
    const wikiHtml = wtf(wikitext).html();
    let fileContent = "";
    if ("file" in lastRevision.content) {
      // If there is a file, create a download link.
      const mimeType =
        Mime.lookup(lastRevision.content.file.filename) ||
        "application/octet-stream";
      const fileExtension = Mime.extension(mimeType) || "unknown";
      let blob;
      try {
        blob = b64toBlob(lastRevision.content.file.data, mimeType);
        // The in-RAM file will be garbage-collected once the tab is closed.
        const blobUrl = URL.createObjectURL(blob);
        fileContent = `<a href='${blobUrl}' target='_blank' download='${lastRevision.content.file.filename}'>Access file</a>`;
      } catch (e) {
        alert("The base64-encoded file content is corrupted.");
      }

      if (supportedImageExtensions.includes(fileExtension)) {
        // If the file is an image supported in HTML, display it.
        fileContent +=
          `<div><img src='data:${mimeType};base64,` +
          lastRevision.content.file.data +
          "'></div>";
      }
    }
    return wikiHtml + fileContent;
  }

  React.useEffect(() => {
    const fn = async () => {
      if (!(pageResult && pageResult.revisions)) {
        return;
      }
      // This is for displaying the content.
      // TODO move this to be later once the deletion of revision content from
      // details has been removed.
      const lastRevisionHtml = getLastRevisionHtml(pageResult.revisions);

      const verbose = false;
      const doVerifyMerkleProof = true;

      const [verificationStatus, details] = await externalVerifierVerifyPage(
        { offline_data: pageResult },
        verbose,
        doVerifyMerkleProof,
        null
      );
      const title = pageResult.title;
      const serverUrl = "http://offline_verify_page";
      const verificationData = {
        serverUrl,
        title,
        status: verificationStatus,
        details,
      };
      setResultInfo(verificationStatus, verificationData);
      setWikiPage(lastRevisionHtml);
    };
    fn();
  }, [pageResult]);

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: verificationStatus }}></div>
      <ul style={{ minWidth: "700px" }}>
        <li>
          {pageTitle
            ? "Current Page Title: " + pageTitle
            : "Verification in Progress"}
        </li>
      </ul>
      <div dangerouslySetInnerHTML={{ __html: verificationLog }}></div>
      <hr />
      <div dangerouslySetInnerHTML={{ __html: wikiPage }}></div>
      <hr />
    </>
  );
};

const OfflineVerification = () => {
  const [pages, setPages] = useState<pageResultT[]>([]);
  function offlineVerifyJSONFile(file: File | Blob) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (!(e && e.target && e.target.result)) {
        return;
      }
      const parsedExport = JSON.parse(e.target.result as string);
      if (!("pages" in parsedExport)) {
        return;
      }
      setPages(parsedExport.pages);
    };
    reader.readAsText(file);
  }

  // Uppy
  const uppy = React.useMemo(() => {
    const u = new Uppy({
      autoProceed: true,
      restrictions: {
        maxNumberOfFiles: 1,
      },
    });
    u.on("complete", (result) => {
      if (!(result.successful && result.successful[0])) {
        return;
      }
      const uppyFile = result.successful[0];
      if (!uppyFile.name.endsWith(".json")) {
        alert("The file must be in JSON format and extension.");
        return;
      }
      offlineVerifyJSONFile(uppyFile.data);
    });
    return u;
  }, []);
  React.useEffect(() => {
    return () => uppy.close();
  }, []);
  const propsDashBoard = {
    width: 550,
    height: 150,
    proudlyDisplayPoweredByUppy: false,
    hideUploadButton: true,
  };

  return (
    <Layout pageSubtitle="OFFLINE">
      <Center marginTop={4}>
        <Dashboard uppy={uppy} {...propsDashBoard} />
      </Center>
      {pages.map((page, index) => (
        <PageVerificationInfo key={index} pageResult={page} />
      ))}
    </Layout>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <OfflineVerification />
  </React.StrictMode>,
  document.getElementById("root")
);
