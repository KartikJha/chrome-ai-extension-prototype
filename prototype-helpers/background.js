// background.js

// chrome.action.onClicked.addListener(() => {
//   chrome.tabs.query({}, (tabs) => {
//     tabs.forEach((tab) => {
//       // Inject the content script into each active tab
//       chrome.scripting.executeScript(
//         {
//           target: { tabId: tab.id },
//           files: ["content.js"]
//         },
//         () => {
//           console.log(`Injected script into tab: ${tab.id}`);
//         }
//       );
//     });
//   });
// });


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