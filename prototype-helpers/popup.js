// popup.js

document.getElementById("fetchHTML").addEventListener("click", () => {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      // Inject content.js into each active tab
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          files: ["content.js"]
        },
        () => {
          console.log(`Content script injected into tab: ${tab.id}`);
        }
      );
    });
  });
});



// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "htmlContent") {
    const textarea = document.getElementById("htmlOutput");    
    textarea.value += `Tab: ${sender.tab.title}\n${generateKeywordsFromMetadata(extractMetaData(message.html))}\n\n---\n\n`;
  }
});

function generateKeywordsFromMetadata(metadata) {
  // Initialize array to store all keywords
  let allKeywords = [];
  
  // Add keywords from meta keywords
  if (metadata.keywords && metadata.keywords.length) {
    allKeywords.push(...metadata.keywords);
  }

  // Add words from title
  if (metadata.title) {
    allKeywords.push(...metadata.title.split(' '));
  }

  // Add words from description
  if (metadata.description) {
    allKeywords.push(...metadata.description.split(' '));
  }

  // Add words from og tags
  if (metadata.ogTags) {
    Object.values(metadata.ogTags).forEach(value => {
      allKeywords.push(...value.split(' '));
    });
  }

  // Clean up keywords - lowercase, remove duplicates and empty strings
  return [...new Set(
    allKeywords
      .map(keyword => keyword.toLowerCase())
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length > 0)
  )];
}

function extractMetaData(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  
  // Initialize result object
  const metaData = {
      keywords: new Set(),
      description: '',
      title: '',
      ogTags: {}
  };
  
  // Get all meta tags
  const metaTags = doc.getElementsByTagName('meta');
  
  for (const meta of metaTags) {
      const name = meta.getAttribute('name')?.toLowerCase();
      const property = meta.getAttribute('property')?.toLowerCase();
      const content = meta.getAttribute('content');
      
      if (!content) continue;
      
      // Extract keywords
      if (name === 'keywords') {
          content
              .split(',')
              .map(keyword => keyword.trim())
              .filter(keyword => keyword.length > 0)
              .forEach(keyword => metaData.keywords.add(keyword));
      }
      
      // Extract description
      if (name === 'description') {
          metaData.description = content;
      }
      
      // Extract Open Graph tags
      if (property?.startsWith('og:')) {
          const ogProperty = property.substring(3);
          metaData.ogTags[ogProperty] = content;
      }
  }
  
  // Extract title
  metaData.title = doc.title || '';
  
  // Convert keywords from Set to Array and remove duplicates
  metaData.keywords = Array.from(metaData.keywords);
  
  return metaData;
}

// Example usage:
// const htmlExample = `
// <!DOCTYPE html>
// <html>
// <head>
//   <title>Sample Page</title>
//   <meta name="keywords" content="javascript, programming, web development">
//   <meta name="description" content="This is a sample page">
//   <meta property="og:title" content="Sample Page">
//   <meta property="og:description" content="Social media description">
// </head>
// <body>
//   <h1>Test Page</h1>
// </body>
// </html>
// `;

// const metadata = extractMetaData(htmlExample);
// console.log(metadata);

/*
Tab: Internet Speed Test | Fast.com
internet,speed,test,|,fast.com,how,fast,is,your,download,speed?,in,seconds,,fast.com's,simple,will,estimate,isp,speed.,https://fast.com/share/____share_shot___.html,website,https://fast.com/assets/share/fb_en_____share_shot___.png

---

Tab: car - Google Search
car,-,google,search

---

Tab: New Cars in India 2024 | New Car Information | Best New Cars - CarWale
new,cars,in,india,2024,|,car,information,best,-,carwale,all,about,under,one,roof.,is,your,one-stop,destination,to,find,information,,including,specs,,features,,prices,and,images.,website,https://www.carwale.com/new-cars/

---


*/