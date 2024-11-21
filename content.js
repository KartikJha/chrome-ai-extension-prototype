// content.js

// Read the full HTML of the page
const pageHTML = document.documentElement.outerHTML

// Log the HTML to the console (or send it to the background script if needed)
console.log('Page HTML:', pageHTML)

// Optionally, send the HTML to the background script
chrome.runtime.sendMessage({
  type: 'siteTextContent',
  content: extractTextFromBody(pageHTML),
  html: pageHTML,
})

// chrome.runtime.sendMessage({
//   type: 'metaTagContent',
//   content: generateKeywordsFromMetadata(extractMetaData(pageHTML)),
//   html: pageHTML,
// })

function parseHtmlContentEnhanced(htmlString) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlString, 'text/html')
  const body = doc.body
  const contentArray = []

  // Configuration for text extraction
  const skipTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'META'])
  const inlineElements = new Set(['SPAN', 'STRONG', 'EM', 'B', 'I', 'A'])

  function shouldAddSpacing(element) {
    return !inlineElements.has(element.tagName)
  }

  function processText(text) {
    return text
      .replace(/[\n\r\t]+/g, ' ') // Replace newlines and tabs with spaces
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
  }

  function extractTextContent(element, isNested = false) {
    if (skipTags.has(element.tagName)) {
      return
    }

    // Handle images
    if (element.tagName === 'IMG') {
      const altText = element.getAttribute('alt')
      const title = element.getAttribute('title')

      if (altText?.trim()) {
        contentArray.push(processText(altText))
      }
      if (title?.trim()) {
        contentArray.push(processText(title))
      }
      return
    }

    // Handle links
    if (element.tagName === 'A') {
      const texts = [
        element.textContent,
        element.getAttribute('title'),
        element.getAttribute('aria-label'),
        element.getAttribute('data-description'),
      ].filter(Boolean)

      texts.forEach((text) => {
        const processed = processText(text)
        if (processed) {
          contentArray.push(processed)
        }
      })
      return
    }

    // Get direct text content
    let textContent = ''
    element.childNodes.forEach((node) => {
      if (node.nodeType === 3) {
        // Text node
        const text = processText(node.textContent)
        if (text) {
          textContent += text + ' '
        }
      }
    })

    if (textContent.trim()) {
      contentArray.push(textContent.trim())
    }

    // Process children
    Array.from(element.children).forEach((child) => {
      extractTextContent(child, true)
    })
  }

  extractTextContent(body)

  // Final cleanup and deduplication
  return Array.from(
    new Set(
      contentArray
        .filter(Boolean)
        .map(processText)
        .filter((text) => text.length > 1) // Remove single-character entries
    )
  )
}

// Example usage with metadata:
function getContentWithMetadata(htmlString) {
  const content = parseHtmlContentEnhanced(htmlString)
  return {
    content: content,
    statistics: {
      totalItems: content.length,
      averageLength: Math.round(
        content.reduce((acc, item) => acc + item.length, 0) / content.length
      ),
      shortestItem: content.reduce((a, b) => (a.length <= b.length ? a : b)),
      longestItem: content.reduce((a, b) => (a.length >= b.length ? a : b)),
    },
  }
}

function generateKeywordsFromMetadata(metadata) {
  // Initialize array to store all keywords
  let allKeywords = []

  // Add keywords from meta keywords
  if (metadata.keywords && metadata.keywords.length) {
    allKeywords.push(...metadata.keywords)
  }

  // Add words from title
  if (metadata.title) {
    allKeywords.push(...metadata.title.split(' '))
  }

  // Add words from description
  if (metadata.description) {
    allKeywords.push(...metadata.description.split(' '))
  }

  // Add words from og tags
  if (metadata.ogTags) {
    Object.values(metadata.ogTags).forEach((value) => {
      allKeywords.push(...value.split(' '))
    })
  }

  // Clean up keywords - lowercase, remove duplicates and empty strings
  return [
    ...new Set(
      allKeywords
        .map((keyword) => keyword.toLowerCase())
        .map((keyword) => keyword.trim())
        .filter((keyword) => keyword.length > 0)
    ),
  ]
}

function extractMetaData(htmlString) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlString, 'text/html')

  // Initialize result object
  const metaData = {
    keywords: new Set(),
    description: '',
    title: '',
    ogTags: {},
  }

  // Get all meta tags
  const metaTags = doc.getElementsByTagName('meta')

  for (const meta of metaTags) {
    const name = meta.getAttribute('name')?.toLowerCase()
    const property = meta.getAttribute('property')?.toLowerCase()
    const content = meta.getAttribute('content')

    if (!content) continue

    // Extract keywords
    if (name === 'keywords') {
      content
        .split(',')
        .map((keyword) => keyword.trim())
        .filter((keyword) => keyword.length > 0)
        .forEach((keyword) => metaData.keywords.add(keyword))
    }

    // Extract description
    if (name === 'description') {
      metaData.description = content
    }

    // Extract Open Graph tags
    if (property?.startsWith('og:')) {
      const ogProperty = property.substring(3)
      metaData.ogTags[ogProperty] = content
    }
  }

  // Extract title
  metaData.title = doc.title || ''

  // Convert keywords from Set to Array and remove duplicates
  metaData.keywords = Array.from(metaData.keywords)

  return metaData
}

function extractTextFromBody(htmlContent) {
  // Parse the HTML content into a DOM structure
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlContent, 'text/html')

  // Get all <p> and <article> elements inside the <body>
  const elements = doc.body.querySelectorAll('p, article')

  // Extract text content from each element
  const extractedText = Array.from(elements).map((el) => el.textContent.trim())

  return extractedText
}

// content-script.js

;(function () {
  // Listen for the `beforeunload` event to detect a page reload
  window.addEventListener('beforeunload', () => {
    // Send a message to the background script
    const pageHTML = document.documentElement.outerHTML
    const message = {
      type: 'PAGE_RELOADED',
      content: extractTextFromBody(pageHTML),
      html: pageHTML,
    }
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.error(
          'Error sending message:',
          chrome.runtime.lastError.message
        )
        return
      }
      console.log('Message sent. Response:', response)
    })
  })
})()
