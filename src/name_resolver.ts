// https://stackoverflow.com/a/50537862
function replaceInText(
  element: HTMLElement,
  pattern: RegExp,
  replacement: string
) {
  for (let node of element.childNodes) {
    switch (node.nodeType) {
      case Node.ELEMENT_NODE:
        if ((node as HTMLElement).tagName === "TEXTAREA") {
          // We do not replace inside the edit field of MediaWiki as this would
          // break pages and make it impossible to add account addresses.
          break;
        }
        replaceInText(node as HTMLElement, pattern, replacement);
        break;
      case Node.TEXT_NODE:
        if (node && node.textContent) {
          node.textContent = node.textContent.replace(pattern, replacement);
        }
        break;
      case Node.DOCUMENT_NODE:
        replaceInText(node as HTMLElement, pattern, replacement);
    }
  }
}

export function replaceAllAddresses(html: HTMLElement, addressesHashMap: any) {
  for (const [walletAddress, e] of Object.entries(addressesHashMap)) {
    // `e` is untyped.
    // @ts-ignore
    if (!("nickName" in e)) {
      continue;
    }
    // @ts-ignore
    replaceInText(html, new RegExp(walletAddress, "g"), e.nickName);
  }
}

function replaceAllAddressesRawText(text: string, addressesHashMap: any) {
  // The difference with replaceAllAddresses is that the input is a raw text
  // instead of HTMLElement.
  let out = text;
  for (const [walletAddress, e] of Object.entries(addressesHashMap)) {
    // `e` is untyped.
    // @ts-ignore
    if (!("nickName" in e)) {
      continue;
    }
    // @ts-ignore
    const nickName = e.nickName as string;

    out = text.replace(new RegExp(walletAddress, "g"), nickName);
  }
  return out;
}

const nameResolutionEnabledKey =
  "data_accounting_name_resolution_enabled_state";

export async function getEnabledState() {
  const dEnabled = await chrome.storage.sync.get(nameResolutionEnabledKey);
  let enabled = false;
  if (dEnabled[nameResolutionEnabledKey]) {
    enabled = JSON.parse(dEnabled[nameResolutionEnabledKey]);
  }
  return enabled;
}

const storageKey = "data_accounting_name_resolution";

export async function getNameResolutionTable() {
  const d = await chrome.storage.sync.get(storageKey);
  if (!d[storageKey]) {
    return null;
  }
  return JSON.parse(d[storageKey]);
}

export async function resolveNameByAddress(address: string) {
  let out = address;

  const parsedTable = await getNameResolutionTable();

  if (parsedTable) {
    const keyExists = parsedTable[address];
    if (keyExists) {
      out = keyExists.nickName;
    }
  }

  return out;
}

export async function resolveNamesRawText(text: string) {
  const parsedTable = await getNameResolutionTable();
  if (parsedTable) {
    return replaceAllAddressesRawText(text, parsedTable);
  }

  return text;
}
