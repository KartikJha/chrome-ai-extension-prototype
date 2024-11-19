let messageHandlerTriggered = false
let timerId = null
let currentTabId = null

document
  .getElementById('actionButton')
  .addEventListener('click', handleActionButtonClick)

// Event Listener for runtime messages
chrome.runtime.onMessage.addListener(handleRuntimeMessage)

async function handleActionButtonClick(e) {
  messageHandlerTriggered = false
  e.target.textContent = 'Summarizing'
  e.target.disabled = true
  const currTabId = await getCurrentTabId()
  let data = null
  const changedTab = await isTabChanged(currTabId)
  if (!changedTab) {
    data = await getDataFromChromeStorage(`webPageContent:${currTabId}`)
  }
  if (data) {
    handleRuntimeMessage(
      { type: 'siteTextContent', content: data },
      'cache-flow'
    )
  } else {
    chrome.tabs.query({}, (tabs) => {
      timerId = setTimeout(checkIfMessageHandlerHasTriggered, 5000)
      injectContentScriptIntoActiveTabs(tabs)
    })
  }
}

async function handleRuntimeMessage(message, sender) {
  const textarea = document.getElementById('output')
  textarea.disabled = true
  const currTabId = await getCurrentTabId(); 
  await saveDataToChromeStorage(`webPageContent:${currTabId}`, message.content)
  if (message.type === 'metaTagContent') {
    await handleMetaTagContent(message, sender, textarea)
  } else if (message.type === 'siteTextContent') {
    await handleSiteTextContent(message, textarea)
  } else if (['PAGE_RELOADED', 'PAGE_NAVIGATED'].includes(message.type)) {
    const currTabId = await getCurrentTabId()
    await deleteKeyFromChromeStorageAsync(`webPageContent:${currTabId}`)
    // await deleteKeyFromChromeStorageAsync('previousTabId')
  }
}

async function handleMetaTagContent(message, sender, textarea) {
  const { available } = await ai.languageModel.capabilities()
  if (available !== 'no') {
    const session = await ai.languageModel.create()
    const result = await session.prompt(generateMetaTagPrompt(message.content))
    textarea.value += `Tab: ${sender.tab.title}\n\nTags: ${result}\n\n---\n\n`
  }
}

async function handleSiteTextContent(message, textarea) {
  messageHandlerTriggered = true
  clearTimeout(timerId)

  const canSummarize = await ai.summarizer.capabilities()
  if (canSummarize && canSummarize.available !== 'no') {
    const summarizer = await createSummarizer(canSummarize)
    const filteredContent = message.content.filter(Boolean)
    const currTabId = await getCurrentTabId(); 
    await saveDataToChromeStorage(`webPageContent:${currTabId}`, filteredContent)
    if (filteredContent.length) {
      try {
        textarea.value = await summarizeContent(summarizer, filteredContent)
      } catch (error) {
        textarea.disabled = false
        textarea.value =
          'Failed to summarize the content. Please try again later :('
        document.getElementById('actionButton').textContent = 'Summarize'
        document.getElementById('actionButton').disabled = false
        console.error('Failed to summarize', error)
      }
    } else {
      textarea.value = 'No article, para or text to summarize :)'
      document.getElementById('actionButton').textContent = 'Summarize'
      document.getElementById('actionButton').disabled = false
    }
  } else {
    console.log('Unable to summarize text')
  }
}

async function createSummarizer(canSummarize) {
  let summarizer
  if (canSummarize.available === 'readily') {
    summarizer = await ai.summarizer.create()
  } else {
    summarizer = await ai.summarizer.create()
    summarizer.addEventListener('downloadprogress', (e) =>
      console.log(e.loaded, e.total)
    )
    await summarizer.ready
  }
  return summarizer
}

async function summarizeContent(summarizer, content) {
  const result = await summarizer.summarize(content.join('\n'))
  document.getElementById('output').disabled = false
  document.getElementById('actionButton').textContent = 'Summarize'
  document.getElementById('actionButton').disabled = false
  return `Summary of webpage:\n\n${result}`
}

async function saveDataToChromeStorage(key, value) {
  try {
    await setToChromeStorageAsync(key, value)
    console.log('Data successfully saved!')
  } catch (error) {
    console.error('Failed to save data:', error)
  }
}

async function setToChromeStorageAsync(key, value) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve()
      }
    })
  })
}

async function getDataFromChromeStorage(key) {
  try {
    const data = await getFromChromeStorageAsync(key)
    return data || null
  } catch (error) {
    console.error('Failed to retrieve data:', error)
    return null
  }
}

async function getFromChromeStorageAsync(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve(result[key])
      }
    })
  })
}

function sendMessageToRuntime(type, content) {
  chrome.runtime.sendMessage({ type, content })
}

function injectContentScriptIntoActiveTabs(tabs) {
  tabs.forEach(async (tab) => {
    if (tab.active) {
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          files: ['content.js'],
        },
        () => console.log(`Content script injected into tab: ${tab.id}`)
      )
    }
  })
}

function checkIfMessageHandlerHasTriggered() {
  if (messageHandlerTriggered) {
    console.log('Message handler has already been triggered.')
    document.getElementById('actionButton').textContent = 'Summarize'
  } else {
    checkWebPageContent()
  }
}

async function checkWebPageContent() {
  const currTabId = await getCurrentTabId();
  const data = await getDataFromChromeStorage(`webPageContent${currTabId}`)
  if (data) {
    await handleRuntimeMessage(
      { content: data, type: 'siteTextContent' },
      'timer callback'
    )
    console.log('Retrieved webPageContent:', data)
  } else {
    console.log('No data found for content.')
  }
}

function generateMetaTagPrompt(content) {
  return `Based on the meta tags values provided, {tag_values: ${cleanStringArrayEnhanced(
    content
  )}}, generate a one word category for website these tags are attached to`
}

// Refactor utility functions like cleanStringArrayEnhanced (unchanged)
function cleanStringArrayEnhanced(arrayOfStrings, options = {}) {
  const {
    minLength = 3,
    caseSensitive = false,
    allowSpaces = false,
    removeDuplicates = true,
  } = options
  if (!Array.isArray(arrayOfStrings)) throw new Error('Input must be an array')

  const regexPattern = allowSpaces ? /^[a-zA-Z\s]+$/ : /^[a-zA-Z]+$/
  let cleaned = arrayOfStrings
    .map((item) => String(item).trim())
    .filter((str) => str.length > minLength && regexPattern.test(str))

  return removeDuplicates ? [...new Set(cleaned)] : cleaned
}

async function deleteKeyFromChromeStorageAsync(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(key, () => {
      if (chrome.runtime.lastError) {
        reject(
          `Error deleting key "${key}": ${chrome.runtime.lastError.message}`
        )
      } else {
        console.log(`Key "${key}" successfully deleted from Chrome storage.`)
        resolve()
      }
    })
  })
}

async function getCurrentTabId() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(
          `Error fetching current tab: ${chrome.runtime.lastError.message}`
        )
        return
      }

      if (tabs && tabs.length > 0) {
        resolve(tabs[0].id) // Return the ID of the active tab in the current window.
      } else {
        reject('No active tab found.')
      }
    })
  })
}

// async function isTabChanged(currentTabId) {
//   return new Promise((resolve, reject) => {
//     chrome.storage.local.get('previousTabId', (result) => {
//       if (chrome.runtime.lastError) {
//         reject(
//           `Error reading from storage: ${chrome.runtime.lastError.message}`
//         )
//         return
//       }

//       const previousTabId = result.previousTabId
//       if (previousTabId === undefined) {
//         // If no previous tab ID is stored, consider it as changed and store the new ID.
//         chrome.storage.local.set({ previousTabId: currentTabId }, () => {
//           if (chrome.runtime.lastError) {
//             reject(`Error saving tab ID: ${chrome.runtime.lastError.message}`)
//             return
//           }
//           resolve(true) // No previous tab ID; assume changed.
//         })
//       } else {
//         // Compare current tab ID with the stored one.
//         if (previousTabId === currentTabId) {
//           resolve(false) // Tab is unchanged.
//         } else {
//           // Update the stored tab ID to the current one.
//           chrome.storage.local.set({ previousTabId: currentTabId }, () => {
//             if (chrome.runtime.lastError) {
//               reject(
//                 `Error updating tab ID: ${chrome.runtime.lastError.message}`
//               )
//               return
//             }
//             resolve(true) // Tab ID changed.
//           })
//         }
//       }
//     })
//   })
// }

async function isTabChanged(currentTabId) {
  return new Promise((resolve, reject) => {
    // Retrieve the previous tab ID from Chrome storage
    chrome.storage.local.get('previousTabId', (result) => {
      if (chrome.runtime.lastError) {
        reject(
          `Error reading from storage: ${chrome.runtime.lastError.message}`
        )
        return
      }

      const previousTabId = result.previousTabId

      if (previousTabId === undefined) {
        // If no previous tab ID is stored, treat it as changed and save the current tab ID
        chrome.storage.local.set({ previousTabId: currentTabId }, () => {
          if (chrome.runtime.lastError) {
            reject(`Error saving tab ID: ${chrome.runtime.lastError.message}`)
            return
          }
          resolve(true) // Tab is considered changed since there's no previous ID
        })
      } else {
        // Compare the current tab ID with the stored previous tab ID
        if (previousTabId === currentTabId) {
          resolve(false) // Tab is unchanged
        } else {
          // If the tab has changed, update the storage with the new tab ID
          chrome.storage.local.set({ previousTabId: currentTabId }, () => {
            if (chrome.runtime.lastError) {
              reject(
                `Error updating tab ID: ${chrome.runtime.lastError.message}`
              )
              return
            }
            resolve(true) // Tab ID has changed
          })
        }
      }
    })
  })
}
