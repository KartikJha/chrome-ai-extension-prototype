// content.js

// Read the full HTML of the page
const pageHTML = document.documentElement.outerHTML;

// Log the HTML to the console (or send it to the background script if needed)
console.log("Page HTML:", pageHTML);

// Optionally, send the HTML to the background script
chrome.runtime.sendMessage({
  type: "htmlContent",
  html: pageHTML,
});
