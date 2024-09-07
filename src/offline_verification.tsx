import React, { useState } from "react";
import { createRoot } from 'react-dom/client';
import Clipboard from "clipboard";
import wtf from "wtf_wikipedia";
import wtfPluginHtml from "wtf-plugin-html";
import { Center, VStack } from "@chakra-ui/react";

import Uppy from "@uppy/core";
import { Dashboard } from "@uppy/react";
import "@uppy/core/dist/style.css";
import "@uppy/dashboard/dist/style.css";

import Layout from "./components/Layout";
import PageVerificationInfo from "./components/pages/OfflineVerification/PageVerificationInfo";
import type { PageResult } from "./components/pages/OfflineVerification/PageVerificationInfo";

import * as nameResolver from "./name_resolver";

const clipboard = new Clipboard(".clipboard-button");
wtf.extend(wtfPluginHtml);

const OfflineVerification = () => {
  const [pages, setPages] = useState<PageResult[]>([]);
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
        allowedFileTypes: [".json"],
      },
    });
    u.on("complete", (result) => {
      if (!(result.successful && result.successful[0])) {
        console.error("unsuccessful");
        return;
      }
      const uppyFile = result.successful[0];

      offlineVerifyJSONFile(uppyFile.data);
    });
    return u;
  }, []);

  React.useEffect(() => {
    return () => uppy.destroy();
  }, []);

  const propsDashBoard = {
    width: 550,
    height: 150,
    proudlyDisplayPoweredByUppy: false,
    hideUploadButton: true,
  };

  return (
    <Layout>
      <Center marginY={4}>
        <Dashboard
          uppy={uppy}
          {...propsDashBoard}
          // TODO: why is the note hidden by default css?
          note="Drag a single JSON file only"
        />
      </Center>
      <VStack spacing={8}>
        {pages.map((page, index) => (
          <PageVerificationInfo key={index} pageResult={page} index={index} />
        ))}
      </VStack>
    </Layout>
  );
};

const root = createRoot(document.getElementById("root")!)
root.render(
  <React.StrictMode>
    <OfflineVerification />
  </React.StrictMode>
);
