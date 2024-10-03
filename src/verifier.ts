import {
  verifyPageFromMwAPI,
  apiVersion as externalVerifierApiVersion,
} from "aqua-verifier-js";
const apiVersion = "0.3.0";
import { VerificationStatusProps } from "./components/VerificationStatus";
export const BadgeTextNA = "N/A";
// Dark gray custom picked
export const BadgeColorNA = "#ABABAD";
export const BadgeTextNORECORD = "NR";
// Color taken from https://www.schemecolor.com/easy-to-use-colors.php
// Blueberry
export const BadgeColorBlue = "#427FED";
// From https://www.schemecolor.com/advent-of-the-season.php
// Naples Yellow
export const BadgeColorYellow = "#F9D460";
export const BadgeColorError = "#FF0018";
export const BadgeColorSuccess = "#65B045";

// TODO import from external verifier.
const ERROR_VERIFICATION_STATUS = "ERROR";

type verificationDetailsOKT = {
  verification_hashes: string[];
  revision_details: any[];
};

type verificationDetailsErrorT = {
  error: string;
};

type verificationDetailsT =
  | verificationDetailsOKT
  | verificationDetailsErrorT
  | null;

// TODO this is totally not idiomatic.
// This is used in the popup.html and offline_verification.html, for a more
// informative description of each verification status.
export const verificationStatusMap: { [key: string]: VerificationStatusProps } =
  {
    // See the color in verifier.ts
    // Apple
    VERIFIED: {
      title: "Page integrity verified",
      subtitle: "Information on this page has not been tampered with.",
      keyColor: BadgeColorSuccess,
    },
    // Fire Engine Red
    INVALID: {
      title: "Page integrity verification failed",
      subtitle: "Information on this page can't be trusted.",
      keyColor: BadgeColorError,
    },
    NORECORD: {
      title: "Data accounting supported but no record available",
      subtitle: "Information on this page might have been tampered.",
      keyColor: BadgeColorBlue,
    },
    API_MISMATCH: {
      title: "Mismatch",
      subtitle: "Incompatible version.",
      keyColor: BadgeColorYellow,
    },
    "N/A": {
      title: "No record available",
      subtitle: "Information on this page might have been tampered.",
      keyColor: BadgeColorNA,
    },
    // Fire Engine Red
    ERROR: {
      title: "Error",
      subtitle: "An error has occured.",
      keyColor: BadgeColorError,
    },
  };

function isEmpty(obj: any) {
  return Object.keys(obj).length === 0;
}

export function getUrlObj(tab: any) {
  return tab.url ? new URL(tab.url) : null;
}

export function sanitizeWikiUrl(url: string) {
  // E.g. original: http://localhost:9352/index.php?title=Main_Page&action=history.
  // Sanitized: http://localhost:9352/.
  return url.split("index.php")[0];
}

export function extractPageTitle(urlObj: URL | null) {
  // If you update this function, make sure to sync with the same function in
  // the DataAccounting repo, in
  // modules/ext.DataAccounting.signMessage/index.js.
  if (!urlObj) {
    return "";
  }
  if (!urlObj.pathname.startsWith("/index.php")) {
    return "";
  }
  let titleUrlForm;
  if (urlObj.searchParams.has("title")) {
    // If there is title param, return it instead.
    titleUrlForm = urlObj.searchParams.get("title");
  } else {
    if (!urlObj.pathname.startsWith("/index.php/")) {
      return "";
    }
    // The first 11 chars are '/index.php/', which we skip.
    titleUrlForm = urlObj.pathname.slice(11);
  }
  if (!titleUrlForm) {
    return "";
  }

  // Convert from Mediawiki url title to page title.
  // See https://www.mediawiki.org/wiki/Manual:PAGENAMEE_encoding
  // If you look at the source code of MediaWiki, in the file Title.php, in the method `makeTitle`, you will notice that there are multiple representations of a page title:
  // - mTextform: text form with spaces
  // - mDbkeyform: text form with underscores
  // - mUrlform: url encoded text form with underscores
  // We weant to return the mTextform.
  const titleDbkeyform = decodeURIComponent(titleUrlForm);
  return titleDbkeyform.replace(/_/g, " ");
}

export function setBadgeStatus(tabId: number, status: string) {
  let badgeColor, badgeText;
  if (status === "VERIFIED") {
    // From https://www.schemecolor.com/easy-to-use-colors.php
    // Apple
    // (actually it is greenish in color, not red)
    badgeColor = BadgeColorSuccess;
    badgeText = "DA";
  } else if (status === "INVALID") {
    // From https://www.schemecolor.com/no-news-is-good.php
    // Fire Engine Red
    badgeColor = BadgeColorError;
    badgeText = "DA";
  } else if (status === "NORECORD") {
    badgeColor = BadgeColorBlue;
    badgeText = "NR";
  } else if (status === "API_MISMATCH") {
    badgeColor = BadgeColorYellow;
    badgeText = "OUT";
  } else {
    console.log(`Unexpected status: ${status}`);
    // Something wrong is happening
    badgeColor = "black";
    badgeText = "??";
  }
  chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: badgeColor });
  chrome.action.setBadgeText({ tabId: tabId, text: badgeText });
}

export function setBadgeNA(tabId: number) {
  chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: BadgeColorNA });
  chrome.action.setBadgeText({ tabId: tabId, text: BadgeTextNA });
}

export function setBadgeNORECORD(tabId: number) {
  chrome.action.setBadgeBackgroundColor({
    tabId: tabId,
    color: BadgeColorBlue,
  });
  chrome.action.setBadgeText({ tabId: tabId, text: BadgeTextNORECORD });
}

export function getServerInfo(
  tabId: number
): Promise<(string | null)[]> {
  return new Promise((resolve, _) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        func: () => {
          function getMeta(name: string) {
            const meta = document.querySelector(`meta[name="${name}"]`);
            if (meta && meta instanceof HTMLMetaElement) {
              return meta.content;
            } else {
              return null;
            }
          }
          const serverUrl = getMeta("data-accounting-mediawiki");
          const serverApiVersion = getMeta("data-accounting-api-version");
          return [serverUrl, serverApiVersion];
        },
      },
      (injectionResults) => {
        const result = injectionResults[0].result;
        resolve(result ?? [null, null]);
      }
    );
  });
}

export async function setInitialBadge(
  tabId: number,
  serverUrl: string,
  pageTitle: string
) {
  const urlForChecking = `${serverUrl}/rest.php/data_accounting/get_page_last_rev?page_title=${pageTitle}`;
  let respText;
  try {
    const response = await fetch(urlForChecking);
    respText = await response.text();
  } catch (e) {
    return "ERROR";
  }

  let badgeText, badgeColor;
  if (respText != "{}") {
    badgeText = "DA";
  } else {
    badgeText = BadgeTextNORECORD;
  }
  badgeColor = BadgeColorBlue;
  chrome.action.setBadgeBackgroundColor({
    tabId: tabId,
    color: badgeColor,
  });
  chrome.action.setBadgeText({ tabId: tabId, text: badgeText });
  console.log("setInitialBadge", badgeText);
  return badgeText;
}

export function verifyPage(title: string, callback: Function | null = null) {
  chrome.tabs.query( 
    { active: true, currentWindow: true },
    async function (tabs) {
      const tab = tabs[0];
      let serverUrl: string | null = "N/A";
      let serverApiVersion: string | null = "N/AA;";
      let verificationStatus = "N/A";
      let details: verificationDetailsT = null;
      if (!tab.id) {
        return;
      }
      if (!tab.url) {
        return;
      }
      chrome.action.setBadgeText({ tabId: tab.id, text: "⏳" });
      const verbose = false;
      [serverUrl, serverApiVersion] = await getServerInfo(tab.id);
      if (!serverUrl) {
        chrome.action.setBadgeText({ tabId: tab.id, text: "N/A" });
        return;
      }
      if (title === "") {
        // If we get to this point, we know that DA is supported in the domain,
        // but the page title is empty.
        setBadgeStatus(tab.id, "NORECORD");
        return;
      }

      const sanitizedUrl = sanitizeWikiUrl(tab.url);

      // Now we check the API versions.
      if (
        !(
          apiVersion === externalVerifierApiVersion &&
          apiVersion === serverApiVersion
        )
      ) {
        setBadgeStatus(tab.id, "API_MISMATCH");
        verificationStatus = "API_MISMATCH";
        // Update cookie
        chrome.cookies.set({
          url: sanitizedUrl,
          name: title,
          value: verificationStatus,
        });
        const vd = {
          sanitizedUrl,
          serverUrl: serverUrl,
          title: title,
          status: verificationStatus,
          details: {
            error: `API version mismatch. Supported version: ${apiVersion}. Library version: ${externalVerifierApiVersion}. Server version: ${serverApiVersion}<br>Please update VerifyPage.`,
          },
        };
        // Cache verification data in local storage
        chrome.storage.local.set({ [sanitizedUrl]: JSON.stringify(vd) });
        if (callback) {
          callback(vd);
        }
        return;
      }

      const doVerifyMerkleProof = true;
      [verificationStatus, details] = await verifyPageFromMwAPI(
        serverUrl,
        title,
        verbose,
        !doVerifyMerkleProof,
      );
      setBadgeStatus(tab.id, verificationStatus);
      // Runtime check that the type is verificationDetailsOKT.
      if (!!details && "revision_details" in details) {
        // PERF We delete the Merkle proof here to save storage space.
        details.revision_details.forEach((d) => {
          if (!d.data.witness) {
            return;
          }
          delete d.data.witness.structured_merkle_proof;
        });
      }
      
      const verificationData = {
        sanitizedUrl,
        serverUrl: serverUrl,
        title: title,
        status: verificationStatus,
        details: details,
      };
      // Update cookie
      chrome.cookies.set({
        url: sanitizedUrl,
        name: title,
        value: verificationStatus,
      });
      // Cache verification data in local storage
      chrome.storage.local.set({
        [sanitizedUrl]: JSON.stringify(verificationData),
      });
      if (details && "error" in details) {
        console.log("Verification error:", details.error);
        if (callback) {
          callback(verificationData);
        }
        return;
      }
      // Also store the last verification hash.
      // We use this info to check if the page has been updated since we
      // last verify it. If so, we rerun the verification process
      // automatically.
      if (
        !details ||
        !details.revision_details ||
        details.revision_details.length === 0
      ) {
        if (callback) {
          callback(verificationData);
        }
        return;
      }
      const lastDetail =
        details.revision_details[details.revision_details.length - 1];
      chrome.storage.local.set({
        ["verification_hash_" + sanitizedUrl]: lastDetail.verification_hash,
      });
      if (callback) {
        callback(verificationData);
      }
    }
  );
}

export async function checkIfCacheIsUpToDate(
  tabId: number,
  pageTitle: string,
  sanitizedUrl: string,
  callback: Function
) {
  // Check if our stored verification info is outdated
  const [serverUrl, _] = await getServerInfo(tabId);
  if (!serverUrl) {
    // This execution branch shouldn't happen. If it happens, then don't update
    // cache since the page is not a data accounting page anyway.
    callback(true);
  }
  const urlForChecking = `${serverUrl}/rest.php/data_accounting/get_page_last_rev?page_title=${pageTitle}`;
  let actual: {
    page_title: string;
    page_id: number;
    rev_id: number;
    verification_hash: string;
  };
  try {
    const response = await fetch(urlForChecking);
    actual = await response.json();
  } catch (e) {
    throw e;
    return;
  }
  const key = "verification_hash_" + sanitizedUrl;
  chrome.storage.local.get(key, (d) => {
    let isUpToDate = false;
    if (d[key]) {
      const expectedVH = d[key];
      isUpToDate = expectedVH === actual.verification_hash;
      if (isEmpty(actual)) {
        // This is a corner case.
        // If the actual page has the verification info removed, but the
        // local storage has the old version with non empty verification
        // remove, we then remove it from local storage.
        chrome.storage.local.remove(sanitizedUrl, () => {
          chrome.storage.local.remove(key, () => {
            callback(isUpToDate);
          });
        });
      } else {
        callback(isUpToDate);
      }
    } else {
      callback(isUpToDate);
    }
  });
}
