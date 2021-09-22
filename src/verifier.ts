import * as http from "http";
import * as https from "https";
// Not yet typed
// @ts-ignore
import { verifyPage as externalVerifierVerifyPage, formatRevisionInfo2HTML } from "data-accounting-external-verifier";

export const BadgeTextNA = 'N/A';
// Dark gray custom picked
export const BadgeColorNA = '#ABABAD';
export const BadgeTextNORECORD = 'NR';
// Color taken from https://www.schemecolor.com/easy-to-use-colors.php
// Blueberry
export const BadgeColorBlue = '#427FED';

function isEmpty(obj: any) {
  return Object.keys(obj).length === 0;
}

function adaptiveGet(url: string) {
  return url.startsWith('https://') ? https.get : http.get
}

export function getUrlObj(tab: any) {
  return tab.url ? new URL(tab.url): null;
}

export function extractPageTitle(urlObj: URL | null) {
  // If you update this function, make sure to sync with the same function in
  // the DataAccounting repo, in
  // modules/ext.DataAccounting.signMessage/index.js.
  if (!urlObj) {
    return '';
  }
  const title = urlObj.pathname.split('/').pop();
  // Convert from Mediawiki url title to page title.
  // See https://www.mediawiki.org/wiki/Manual:PAGENAMEE_encoding
  // TODO completely implement this. There are other characters that are
  // converted, not just undescore.
  return title ? title.replace(/_/g, ' ') : '';
}

export function setBadgeStatus(status: string) {
  let badgeColor, badgeText;
  if (status === 'VERIFIED') {
    // From https://www.schemecolor.com/easy-to-use-colors.php
    // Apple
    // (actually it is greenish in color, not red)
    badgeColor = '#65B045';
    badgeText = 'DA';
  } else if (status === 'INVALID') {
    // From https://www.schemecolor.com/no-news-is-good.php
    // Fire Engine Red
    badgeColor = '#FF0018';
    badgeText = 'DA';
  } else if (status === 'NORECORD') {
    badgeColor = BadgeColorBlue;
    badgeText = 'NR';
  } else {
    console.log(`UGH!!! ${status}`)
    // Something wrong is happening
    badgeColor = 'black';
    badgeText = '??';
  }
  chrome.action.setBadgeBackgroundColor({color: badgeColor});
  chrome.action.setBadgeText({ text: badgeText });
}

export function setBadgeNA() {
  chrome.action.setBadgeBackgroundColor({color: BadgeColorNA});
  chrome.action.setBadgeText({ text: BadgeTextNA });
}

/**
 * Promise wrapper for chrome.tabs.sendMessage
 * @param tabId
 * @param item
 * @returns {Promise<any>}
 */
function sendMessagePromise(tabId: number, item: any): Promise<string | null> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, item, (msg: string | null) => {
      resolve(msg);
    });
  });
}

function getDAMeta(tabId: number) {
  return sendMessagePromise(tabId, {check_da: true});
}

export async function setInitialBadge(tabId: number, urlObj: URL | null) {
  if (!urlObj) {
    setBadgeNA();
    return Promise.resolve(BadgeTextNA);
  }
  const extractedPageTitle = extractPageTitle(urlObj);
  const serverUrl = await getDAMeta(tabId);
  if (!serverUrl) {
    setBadgeNA();
    return Promise.resolve(BadgeTextNA);
  }
  const urlForChecking = `${serverUrl}/rest.php/data_accounting/v1/standard/get_page_last_rev?var1=${extractedPageTitle}`;
  const promise = new Promise((resolve, reject) => {
    adaptiveGet(urlForChecking)(urlForChecking, (response) => {
      response.on('data', (data) => {
        const respText = data.toString();
        let badgeText, badgeColor;
        if (respText != "{}") {
          badgeText = "DA";
        } else {
          badgeText = BadgeTextNORECORD;
        }
        badgeColor = BadgeColorBlue;
        chrome.action.setBadgeBackgroundColor({color: badgeColor});
        chrome.action.setBadgeText({ text: badgeText });
        console.log("setInitialBadge", badgeText);
        resolve(badgeText);
      });
      response.on('error', (e) => reject('ERROR'));
    });
  });
  return promise;
}

function logPageInfo(status: string, details: {verified_ids: string[], revision_details: object[]} | null, callback: Function) {
  if (status === 'NORECORD') {
    callback('No revision record');
    return;
  }
  if (status === 'N/A' || !details) {
    callback('');
    return;
  }
  const verbose = false;
  const _space2 = '&nbsp&nbsp';
  let out = "";
  out += 'Verified Page Revisions: ' + details.verified_ids.toString() + '<br>';
  for (let i = 0; i < details.revision_details.length; i++) {
    if (i % 2 == 0) {
      out += '<div style="background: LightCyan;">'
    } else {
      out += '<div>'
    }
    out += `${i + 1}. Verification of Revision ${details.verified_ids[i]}.<br>`;
    out += formatRevisionInfo2HTML(details.revision_details[i], verbose);
    const count = i + 1;
    out += `${_space2}Progress: ${count} / ${details.verified_ids.length} (${(100 * count / details.verified_ids.length).toFixed(1)}%)<br>`;
    out += '</div>'
  };
  callback(out);
}

export function verifyPage(title: string, callback: Function | null = null) {
  chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
    const tab = tabs[0];
    let verificationStatus = "N/A";
    let details: { verified_ids: string[]; revision_details: any[]; } | null = null;
    if (tab.id) {
      chrome.action.setBadgeText({ text: '⏳' });
      const verbose = false;
      const serverUrl = await getDAMeta(tab.id);
      if (!serverUrl) {
        chrome.action.setBadgeText({ text: 'NR' });
        return;
      }
      [verificationStatus, details] = await externalVerifierVerifyPage(title, serverUrl, verbose, false);
      setBadgeStatus(verificationStatus)
      if (tab.url) {
        const sanitizedUrl = tab.url.split('?')[0];
        // Update cookie
        chrome.cookies.set({url: sanitizedUrl, name: title, value: verificationStatus});
        // Cache verification detail in local storage
        logPageInfo(verificationStatus, details, (info: string) => {
          chrome.storage.sync.set(
            {[sanitizedUrl]: info}
          );
          // Also store the last verification hash and rev id
          // We use this info to check if the page has been updated since we
          // last verify it. If so, we rerun the verification process
          // automatically.
          if (!details || !details.revision_details || details.revision_details.length === 0) {
            return;
          }
          const lastDetail = details.revision_details[details.revision_details.length - 1];
          const HashId = {
            rev_id: lastDetail.rev_id,
            verification_hash: lastDetail.verification_hash,
          };
          chrome.storage.sync.set(
            {["verification_hash_id_" + sanitizedUrl]: JSON.stringify(HashId)}
          );
        })
      }
    }
    if (callback) {
      logPageInfo(verificationStatus, details, callback);
    }
    return;
  });
}

export async function checkIfCacheIsUpToDate(tabId: number, pageTitle: string, sanitizedUrl: string, callback: Function) {
  // Check if our stored verification info is outdated
  const serverUrl = await getDAMeta(tabId);
  if (!serverUrl) {
    // This execution branch shouldn't happen. If it happens, then don't update
    // cache since the page is not a data accounting page anyway.
    callback(true);
  }
  const urlForChecking = `${serverUrl}/rest.php/data_accounting/v1/standard/get_page_last_rev?var1=${pageTitle}`;
  adaptiveGet(urlForChecking)(urlForChecking, (response) => {
      response.on('data', (data) => {
        const actual = JSON.parse(data);
        const key = "verification_hash_id_" + sanitizedUrl
        chrome.storage.sync.get(key, (d) => {
          let isUpToDate = false;
          if (d[key]) {
            const expected = JSON.parse(d[key]);
            isUpToDate = (expected.rev_id === actual.rev_id) && (expected.verification_hash === actual.verification_hash);
            if (isEmpty(actual)) {
              // This is a corner case.
              // If the actual page has the verification info removed, but the
              // local storage has the old version with non empty verification
              // remove, we then remove it from local storage.
              chrome.storage.sync.remove(sanitizedUrl, () => {
                chrome.storage.sync.remove(key, () => {
                  callback(isUpToDate)
                })
              })
            } else {
              callback(isUpToDate)
            }
          } else {
            callback(isUpToDate)
          }
        });
      });
      response.on('error', (e) => {throw e});
  });
}
