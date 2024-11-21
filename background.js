// background.js

chrome.action.onClicked.addListener(() => {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      // Inject the content script into each active tab
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          files: ["content.js"]
        },
        () => {
          console.log(`Injected script into tab: ${tab.id}`);
        }
      );
    });
  });
});



// chrome.webNavigation.onCommitted.addListener((details) => {
//     // Filter only for main frame navigations
//     if (details.frameId === 0) {
//       const { tabId, url, transitionType } = details;
  
//       // Check if it's a reload or other navigation
//       const isReload = transitionType === 'reload';
  
//       // Send a message about the event
//       chrome.tabs.sendMessage(tabId, {
//         type: 'PAGE_NAVIGATED',
//         url,
//         isReload,
//       });
  
//       // Log the event
//       console.log(
//         `Navigation detected in tab ${tabId}:`,
//         isReload ? 'Page reloaded' : 'Page changed',
//         url
//       );
//     }
//   });


// Open side panel when extension icon is clicked
// chrome.sidePanel
//   .setPanelBehavior({ openPanelOnActionClick: true })
//   .catch((error) => console.error(error));

// // Listen for messages from the side panel
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.type === "performAction") {
//     // Handle any actions needed
//     sendResponse({ success: true });
//   }
// });
