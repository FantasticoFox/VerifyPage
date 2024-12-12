import React, { useState } from "react";
import {
  Center,
  VStack,
  Box,
  CircularProgress,
  Heading,
  Text,
} from "@chakra-ui/react";
import Clipboard from "clipboard";
import wtf from "wtf_wikipedia";
import VerificationLog from "../../VerificationLog";
import VerificationSummary from "../../VerificationSummary";
import b64toBlob from "./utils/b64toBlob";
import { isEmpty } from "ramda";
import "@uppy/core/dist/style.css";
import "@uppy/dashboard/dist/style.css";

import wtfPluginHtml from "wtf-plugin-html";
// This is taking 154 KiB space of the vendor.js bundle.
// This is because, the database of mime types (mime-db) is big.
import Mime from "mime-types";

import { verificationStatusMap } from "../../../verifier";

import { verifyPage as externalVerifierVerifyPage } from "aqua-verifier-js";
import formatPageInfo from "../../../utils/formatPageInfo";

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

const supportedVideoExtensions = [
  "mp4",
  "webm",
  "ogg",
  "mov",
  "avi",
  "mkv"
];

const supportedAudioExtensions = [
  "mp3",
  "wav",
  "ogg",
  "aac",
  "flac",
  "m4a"
];

const supportedDocumentExtensions = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "json",
  "txt",
  "html",
  "css",
  "csv",
  "html",
  "hocon",
  "cpp",
  "c",
  "py",
  "kt",
  "java",
  "php",
  "sass",
  "ts",
  "tsx",
  "md"
];

export type PageResult = {
  genesis_hash: string;
  domain_id: string;
  latest_verification_hash: string;
  title: string;
  namespace: number;
  chain_height: number;
  revisions: object;
};

const PageVerificationInfo = ({
  pageResult,
  index,
}: {
  pageResult: PageResult;
  index: number;
}) => {
  const [pageTitle, setPageTitle] = useState("");
  const [verificationStatus, setVerificationStatus] = useState({
    title: "",
    subtitle: "",
    keyColor: "",
  });
  const [verificationLog, setVerificationLog] = useState({});
  const [wikiPage, setWikiPage] = useState("");

  function prepareAndSetVerificationStatus(status: string) {
    const somethingBadHappened = {
      title: "Unknown error",
      subtitle: `Unexpected badge status: ${status}`,
      keyColor: "black",
    };
    const verificationStatusMessage =
      verificationStatusMap[status] || somethingBadHappened;
    setVerificationStatus(verificationStatusMessage);
  }

  async function formatDetailsAndSetVerificationLog(data: {
    [key: string]: any;
  }) {
    console.log("Offline Data: ", data)
    let out = await formatPageInfo(
      data.serverUrl,
      data.title,
      data.status,
      data.details
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
        // fileContent = `<a href='${blobUrl}' target='_blank' download='${lastRevision.content.file.filename}'>Access file</a>`;
        fileContent += `
          <a href='${blobUrl}' target='_blank' download='${lastRevision.content.file.filename}' 
            style="
              display: inline-block;
              padding: 10px 20px;
              margin-top: 10px;
              background-color: #007BFF;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              font-size: 14px;
              font-weight: bold;
              text-align: center;
              transition: background-color 0.3s ease;
              margin-bottom: 30px;
            "
            onmouseover="this.style.backgroundColor='#0056b3'"
            onmouseout="this.style.backgroundColor='#007BFF'"
          >
            Download File
          </a>`;

      } catch (e) {
        alert("The base64-encoded file content is corrupted.");
      }

      // if (supportedImageExtensions.includes(fileExtension)) {
      //   // If the file is an image supported in HTML, display it.
      //   fileContent +=
      //     `<div><img src='data:${mimeType};base64,` +
      //     lastRevision.content.file.data +
      //     "'></div>";
      // }

      if (supportedImageExtensions.includes(fileExtension)) {
        // Render image
        fileContent +=
          `<div><img src='data:${mimeType};base64,` +
          lastRevision.content.file.data +
          "'></div>";
      } else if (supportedVideoExtensions.includes(fileExtension)) {
        // Render video
        fileContent +=
          `<div><video controls>
            <source src="data:${mimeType};base64,${lastRevision.content.file.data}" type="${mimeType}">
            Your browser does not support the video tag.
          </video></div>`;
      } else if (supportedAudioExtensions.includes(fileExtension)) {
        // Render audio
        fileContent +=
          `<div><audio controls>
            <source src="data:${mimeType};base64,${lastRevision.content.file.data}" type="${mimeType}">
            Your browser does not support the audio tag.
          </audio></div>`;
      } else if (supportedDocumentExtensions.includes(fileExtension)) {
        // Render documents like PDF
        // if (fileExtension === "pdf") {
         


        // return `extension ${fileExtension}`
        if (fileExtension.replace(/\s+/g, '') == "pdf") {


          const base64toBlob = (base64: string) => {
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            return new Blob([byteArray], {type: 'application/pdf'});
          };
          
          const blob = base64toBlob(lastRevision.content.file.data);
          const blobUrl = URL.createObjectURL(blob);
          
          fileContent += `
            <object 
              data="${blobUrl}" 
              type="application/pdf" 
              width="100%" 
              height="500px"
            >
              <p>Your browser doesn't support PDF viewing. 
                <a href="${blobUrl}" download="document.pdf">Download PDF</a>
              </p>
            </object>
          `;

        } else if (["json",
          "txt",
          "html",
          "css",
          "csv",
          "html",
          "hocon",
          "cpp",
          "c",
          "py",
          "kt",
          "java",
          "php",
          "sass",
          "ts",
          "tsx",
          "md"].includes(fileExtension.replace(/\s+/g, ''))) {
          // Decode base64 to string
          const decodedContent = atob(lastRevision.content.file.data);

          console.log("decodedContent ==>", decodedContent)

          // Determine syntax highlighting and formatting based on file type
          let formattedContent = decodedContent;
          if (fileExtension.replace(/\s+/g, '') === "json") {
            try {
              // Pretty print JSON with indentation
              formattedContent = JSON.stringify(JSON.parse(decodedContent), null, 2);
            } catch (error) {
              console.error("Error parsing json for preview ", error)
              // If JSON parsing fails, show original content
              formattedContent = decodedContent;
            }
          }

          console.log("formattedContent ==> ", formattedContent)

          fileContent += `
              <div 
                  style={{
                      backgroundColor: '#f4f4f4',
                      color:"black",
                      borderRadius: '12px',
                      padding: '15px',
                      maxHeight: '600px',
                      overflowY: 'auto',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                  }}
              >
                  ${formattedContent}
              </div>
          `
        } else {
          fileContent += `<div>Document type "${fileExtension}" not supported for inline preview.</div>`;
        }
      } else {
        fileContent += `<div>Unsupported file type: ${fileExtension}</div>`;
      }


    }
    return wikiHtml + fileContent;
  }

  React.useEffect(() => {
    let ignore = false;
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
      );
      const title = pageResult.title;
      const serverUrl = "http://offline_verify_page";
      const verificationData = {
        serverUrl,
        title,
        status: verificationStatus,
        details,
      };

      if (!ignore) {
        setResultInfo(verificationStatus, verificationData);
        setWikiPage(lastRevisionHtml);
      }
    };
    fn();

    // cleanup @link https://reactjs.org/docs/hooks-faq.html#is-it-safe-to-omit-functions-from-the-list-of-dependencies
    return () => {
      ignore = true;
    };
  }, [pageResult]);

  return (
    <Box p={10} width="90%" minWidth="600px" shadow="lg" borderWidth="2px">
      {!pageTitle ? (
        <Center h="100%">
          <CircularProgress
            isIndeterminate
            color="green.300"
            thickness="12px"
          />
        </Center>
      ) : (
        <VStack spacing={4} align="stretch">
          <VerificationSummary
            pageTitle={pageTitle}
            verificationStatus={verificationStatus}
          />
          {!isEmpty(verificationLog) && (
            <VerificationLog verificationLog={verificationLog} />
          )}
          <Box>
            <Heading as="h3">Page Content</Heading>
            <div dangerouslySetInnerHTML={{ __html: wikiPage }}></div>
          </Box>
          <Box style={{ textAlign: "right" }}>
            <Text>Page {index + 1}</Text>
          </Box>
        </VStack>
      )}
    </Box>
  );
};

export default PageVerificationInfo;
