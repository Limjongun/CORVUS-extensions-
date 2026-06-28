console.log("CORVUS Content Script Loaded");

// -----------------------------------------------------
// 1. HIGHLIGHTER FEATURE
// -----------------------------------------------------

let tooltip = null;
let currentSelectionRange = null;
let currentSelectionText = "";

function createTooltip() {
  if (tooltip) return;
  tooltip = document.createElement('div');
  tooltip.id = 'corvus-highlight-tooltip';
  tooltip.style.position = 'absolute';
  tooltip.style.zIndex = '999999';
  tooltip.style.background = '#1a1a1a';
  tooltip.style.border = '1px solid #333';
  tooltip.style.borderRadius = '8px';
  tooltip.style.padding = '6px';
  tooltip.style.display = 'none';
  tooltip.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
  tooltip.style.flexDirection = 'row';
  tooltip.style.gap = '6px';
  
  const colors = [
    { name: 'Yellow', code: '#fef08a' }, // yellow-300
    { name: 'Green', code: '#86efac' },  // green-300
    { name: 'Pink', code: '#f9a8d4' }    // pink-300
  ];
  
  colors.forEach(c => {
    const btn = document.createElement('button');
    btn.style.width = '24px';
    btn.style.height = '24px';
    btn.style.borderRadius = '50%';
    btn.style.border = 'none';
    btn.style.background = c.code;
    btn.style.cursor = 'pointer';
    btn.title = `Highlight ${c.name}`;
    btn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      applyHighlight(c.code);
    };
    tooltip.appendChild(btn);
  });
  
  document.body.appendChild(tooltip);
}

document.addEventListener('mouseup', (e) => {
  const selection = window.getSelection();
  const text = selection.toString().trim();
  
  // If no text or clicked on tooltip
  if (!text || (e.target.closest('#corvus-highlight-tooltip'))) {
    if (tooltip) tooltip.style.display = 'none';
    return;
  }
  
  // Save selection info
  currentSelectionRange = selection.getRangeAt(0).cloneRange();
  currentSelectionText = text;
  
  // Position tooltip
  createTooltip();
  const rect = currentSelectionRange.getBoundingClientRect();
  tooltip.style.top = `${window.scrollY + rect.top - 45}px`;
  tooltip.style.left = `${window.scrollX + rect.left + (rect.width / 2) - 45}px`;
  tooltip.style.display = 'flex';
});

document.addEventListener('mousedown', (e) => {
  if (tooltip && !e.target.closest('#corvus-highlight-tooltip')) {
    tooltip.style.display = 'none';
  }
});

function applyHighlight(color) {
  if (!currentSelectionText) return;
  
  const text = currentSelectionText;
  
  // Apply visual highlight via execCommand
  document.designMode = "on";
  document.execCommand("BackColor", false, color);
  document.designMode = "off";
  
  window.getSelection().removeAllRanges();
  tooltip.style.display = 'none';
  
  // Save to chrome storage
  saveHighlight(text, color);
}

function saveHighlight(text, color) {
  const url = window.location.href.split('?')[0]; // Ignore query params
  chrome.storage.local.get(['corvus_highlights'], (result) => {
    let allData = result.corvus_highlights || {};
    let pageHighlights = allData[url] || [];
    
    pageHighlights.push({
      text: text,
      color: color,
      timestamp: Date.now()
    });
    
    allData[url] = pageHighlights;
    chrome.storage.local.set({ corvus_highlights: allData }, () => {
      console.log("Highlight saved for", url);
    });
  });
}

function restoreHighlights() {
  const url = window.location.href.split('?')[0];
  chrome.storage.local.get(['corvus_highlights'], (result) => {
    let allData = result.corvus_highlights || {};
    let pageHighlights = allData[url] || [];
    
    // Store current scroll position to avoid jumping
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    
    pageHighlights.forEach(h => {
      // Move cursor to start of document
      window.getSelection().removeAllRanges();
      // Find text forwards
      if (window.find(h.text, false, false, false, false, false, false)) {
        document.designMode = "on";
        document.execCommand("BackColor", false, h.color);
        document.designMode = "off";
      }
    });
    
    window.getSelection().removeAllRanges();
    window.scrollTo(scrollX, scrollY);
  });
}

// Restore immediately on load
window.addEventListener('load', () => {
  setTimeout(restoreHighlights, 500); // Small delay to let dynamic content load
});


// -----------------------------------------------------
// 2. MESSAGES FROM EXTENSION (Extractor, Reader Mode)
// -----------------------------------------------------

let originalBodyContent = null;
let isReaderMode = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  if (request.action === "extract_content") {
    // For AI Summary
    const title = document.title;
    const bodyText = document.body.innerText;
    sendResponse({
      title: title,
      content: bodyText.substring(0, 8000), 
      url: window.location.href
    });
  }
  
  else if (request.action === "toggle_reader_mode") {
    if (isReaderMode) {
      // Turn off reader mode
      document.body.innerHTML = originalBodyContent;
      document.body.style.backgroundColor = "";
      document.body.style.color = "";
      document.body.style.padding = "";
      isReaderMode = false;
      setTimeout(restoreHighlights, 500);
      sendResponse({ status: "disabled" });
    } else {
      // Turn on reader mode
      originalBodyContent = document.body.innerHTML;
      
      // Simple DOM Extractor (fallback if Readability is not used)
      let paragraphs = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');
      let cleanHtml = `<div style="max-width: 800px; margin: 0 auto; font-family: 'Georgia', serif; font-size: 18px; line-height: 1.6;">`;
      cleanHtml += `<h1>${document.title}</h1><hr style="border-color: #333; margin-bottom: 24px;"/>`;
      
      let lastText = "";
      paragraphs.forEach(p => {
        // filter out small navigation texts or duplicates
        if (p.innerText.length > 40 && p.innerText !== lastText) {
          cleanHtml += `<${p.tagName.toLowerCase()} style="margin-bottom: 16px;">${p.innerHTML}</${p.tagName.toLowerCase()}>`;
          lastText = p.innerText;
        }
      });
      cleanHtml += `</div>`;
      
      document.body.innerHTML = cleanHtml;
      document.body.style.backgroundColor = "#121212";
      document.body.style.color = "#e5e7eb";
      document.body.style.padding = "40px 20px";
      
      isReaderMode = true;
      sendResponse({ status: "enabled" });
    }
  }

  return true;
});
