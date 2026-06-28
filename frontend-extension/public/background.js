// Background service worker for CORVUS
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));

chrome.runtime.onInstalled.addListener(() => {
  console.log("CORVUS Extension Installed");
  
  // Create context menu for text selection
  chrome.contextMenus.create({
    id: "corvus_analyze_selection",
    title: "Analyze with CORVUS",
    contexts: ["selection"]
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "corvus_analyze_selection" && tab && tab.id) {
    const selectedText = info.selectionText;
    
    // Open the side panel if it's not open
    chrome.sidePanel.open({ tabId: tab.id }).then(() => {
      // Send the selected text to the side panel
      // Add a slight delay to ensure the side panel has time to open and register the listener
      setTimeout(() => {
        chrome.runtime.sendMessage({
          action: "analyze_selection",
          text: selectedText
        });
      }, 500);
    });
  }
});
