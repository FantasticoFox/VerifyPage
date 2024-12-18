import * as nameResolver from "./name_resolver";

declare global {
  interface WindowEventMap {
    REPLACE_ADDRESSES: CustomEvent<{ element?: HTMLElement }>;
  }
}

const html = document.querySelector("html");

const aquaDomReplacer = async (htmlEl: any) => {
  const daMeta = document.querySelector(
    `meta[name="data-accounting-mediawiki"]`
  );
  if (!daMeta) {
    // Do nothing if the page is not a data accounting page!
    return;
  }
  const nameResolverEnabled = await nameResolver.getEnabledState();

  if (nameResolverEnabled) {
    const parsedTable = await nameResolver.getNameResolutionTable();
    if (!parsedTable) {
      return;
    }
    nameResolver.replaceAllAddresses(htmlEl, parsedTable);
  }
}

if (html) {
  (async () => {
    aquaDomReplacer(html);
  })();
}

window.addEventListener('REPLACE_ADDRESSES', async (event: CustomEvent<{ element?: HTMLElement }>) => {
  const targetElement = event.detail?.element || document.documentElement;

  try {
    console.log("Reached: ", targetElement)
    await aquaDomReplacer(targetElement);
    console.log("Triggered")
  } catch (error) {
    console.error('Address replacement failed:', error);
  }
});