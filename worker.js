importScripts(
  "//unpkg.com/csv-parse/lib/browser/index.js",
  "//unpkg.com/csv-stringify/lib/browser/sync.js",
  "dist.js"
)

const {jsdom} = lib;

const transformText = text => {
  const dom = new jsdom.JSDOM(`<body>${text}</body>`);
  const body = dom.window.document.body;

  const blockElements = body.querySelectorAll('p,div')
  blockElements.forEach(elem => {
    if (elem.textContent) {
      elem.textContent = elem.textContent + '\n'
    }
  })
  return body.textContent
}

function utf8ArrayToString(aBytes) {
  var sView = "";

  for (var nPart, nLen = aBytes.length, nIdx = 0; nIdx < nLen; nIdx++) {
    nPart = aBytes[nIdx];

    sView += String.fromCharCode(
      nPart > 251 && nPart < 254 && nIdx + 5 < nLen ? /* six bytes */
        /* (nPart - 252 << 30) may be not so safe in ECMAScript! So...: */
        (nPart - 252) * 1073741824 + (aBytes[++nIdx] - 128 << 24) + (aBytes[++nIdx] - 128 << 18) + (aBytes[++nIdx] - 128 << 12) + (aBytes[++nIdx] - 128 << 6) + aBytes[++nIdx] - 128
        : nPart > 247 && nPart < 252 && nIdx + 4 < nLen ? /* five bytes */
        (nPart - 248 << 24) + (aBytes[++nIdx] - 128 << 18) + (aBytes[++nIdx] - 128 << 12) + (aBytes[++nIdx] - 128 << 6) + aBytes[++nIdx] - 128
        : nPart > 239 && nPart < 248 && nIdx + 3 < nLen ? /* four bytes */
          (nPart - 240 << 18) + (aBytes[++nIdx] - 128 << 12) + (aBytes[++nIdx] - 128 << 6) + aBytes[++nIdx] - 128
          : nPart > 223 && nPart < 240 && nIdx + 2 < nLen ? /* three bytes */
            (nPart - 224 << 12) + (aBytes[++nIdx] - 128 << 6) + aBytes[++nIdx] - 128
            : nPart > 191 && nPart < 224 && nIdx + 1 < nLen ? /* two bytes */
              (nPart - 192 << 6) + aBytes[++nIdx] - 128
              : /* nPart < 127 ? */ /* one byte */
              nPart
    );
  }

  return sView;
}


const handleCsvFile = file => {
  const rs = new ReadableStream({
    start(controller) {
      const parser = parse({
        skip_lines_with_error: true
      });
      parser.on('readable', function(){
        let row
        while (row = parser.read()) {
          row.forEach((text, i) => {
            row[i] = transformText(text)
          })
          controller.enqueue(stringify([row]) + '\n');
        }
      })

      parser.on('end', (x) => {
        controller.close();
      })

      const reader = file.stream().getReader();
      reader.read().then(function processText({done, value}) {
        if (done) {
          parser.end()
          return
        }

        console.log('chunk', utf8ArrayToString(value))
        parser.write(utf8ArrayToString(value))
        return reader.read().then(processText);
      })
    }
  });

  return rs
}

self.addEventListener('message', async evt => {
  self.postMessage(handleCsvFile(evt.data))
})
